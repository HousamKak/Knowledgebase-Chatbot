// knowledge/langchain/vector-stores.js - Vector store factory
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { LocalVectorStore } = require('./local-vector-store');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');
const path = require('path');
const fs = require('fs');

/**
 * Factory for creating vector stores
 */
class VectorStoreFactory {
  /**
   * Create a vector store based on configuration
   * @param {Object} config Vector store configuration
   * @param {Embeddings} embeddings Embeddings provider
   * @returns {VectorStore} LangChain vector store
   */
  static async createVectorStore(config, embeddings) {
    const storeType = config.type || 'memory';
    
    logger.debug(`Creating vector store: ${storeType}`);
    
    switch (storeType) {
      case 'memory':
        return new MemoryVectorStore(embeddings);
      
      case 'local':
        const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
        
        // Ensure the data directory exists
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        return new LocalVectorStore(embeddings, {
          dataDir,
          namespace: config.namespace || 'default'
        });
      
      case 'pinecone':
        // Integration with Pinecone Vector DB
        if (!config.pineconeApiKey && !process.env.PINECONE_API_KEY) {
          throw new ApiError('Pinecone API key is required', 400);
        }
        if (!config.pineconeEnvironment && !process.env.PINECONE_ENVIRONMENT) {
          throw new ApiError('Pinecone environment is required', 400);
        }
        if (!config.pineconeIndex && !process.env.PINECONE_INDEX) {
          throw new ApiError('Pinecone index name is required', 400);
        }
        
        // Configure Pinecone
        const pineconeConfig = {
          pineconeApiKey: config.pineconeApiKey || process.env.PINECONE_API_KEY,
          pineconeEnvironment: config.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT,
          pineconeIndex: config.pineconeIndex || process.env.PINECONE_INDEX,
          namespace: config.namespace || 'default'
        };
        
        try {
          // Import Pinecone client dynamically
          const { PineconeClient } = await import('@pinecone-database/pinecone');
          const pinecone = new PineconeClient();
          
          // Initialize Pinecone
          await pinecone.init({
            apiKey: pineconeConfig.pineconeApiKey,
            environment: pineconeConfig.pineconeEnvironment,
          });
          
          // Get the Pinecone index
          const index = pinecone.Index(pineconeConfig.pineconeIndex);
          
          // Return Pinecone store
          return await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
            namespace: pineconeConfig.namespace,
            textKey: 'text',
          });
        } catch (error) {
          logger.error(`Error initializing Pinecone: ${error.message}`);
          throw new ApiError(`Failed to initialize Pinecone vector store: ${error.message}`, 500);
        }
      
      // You can add other vector stores here as needed
        
      default:
        throw new ApiError(`Unsupported vector store type: ${storeType}`, 400);
    }
  }
  
  /**
   * Get available vector store types
   * @returns {Array<Object>} Array of available vector store types
   */
  static getAvailableStoreTypes() {
    return [
      {
        id: 'memory',
        name: 'In-Memory',
        description: 'Fast in-memory vector store (not persistent)',
        persistent: false
      },
      {
        id: 'local',
        name: 'Local Storage',
        description: 'Persistent vector store saved to local file system',
        persistent: true
      },
      {
        id: 'pinecone',
        name: 'Pinecone',
        description: 'Cloud-based vector database with high scalability',
        persistent: true,
        requiresApiKey: true
      }
      // Add other vector stores as they become available
    ];
  }
  
  /**
   * Backup a vector store to a file
   * @param {VectorStore} vectorStore Vector store to backup
   * @param {string} filePath File path for backup
   * @returns {Promise<boolean>} Success status
   */
  static async backupVectorStore(vectorStore, filePath) {
    try {
      if (!vectorStore) {
        throw new Error('Vector store is not initialized');
      }
      
      // For local vector store, a backup is just copying the file
      if (vectorStore instanceof LocalVectorStore) {
        const sourceFile = vectorStore.filePath;
        fs.copyFileSync(sourceFile, filePath);
        return true;
      }
      
      // For in-memory vector store, we need to serialize it
      if (vectorStore instanceof MemoryVectorStore) {
        const data = {
          vectors: vectorStore.memoryVectors || [],
          documentMap: {}
        };
        
        // Convert document map to serializable object
        if (vectorStore.documentMap) {
          vectorStore.documentMap.forEach((value, key) => {
            data.documentMap[key] = value;
          });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
      }
      
      // For other stores, not supported yet
      throw new Error(`Backup not supported for vector store type: ${vectorStore.constructor.name}`);
    } catch (error) {
      logger.error(`Error backing up vector store: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Restore a vector store from a backup file
   * @param {string} filePath File path of backup
   * @param {Embeddings} embeddings Embeddings provider
   * @returns {Promise<VectorStore>} Restored vector store
   */
  static async restoreVectorStore(filePath, embeddings) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filePath}`);
      }
      
      // Create local vector store and replace its file
      const vectorStore = new LocalVectorStore(embeddings, {
        dataDir: path.dirname(filePath),
        namespace: path.basename(filePath, '.json')
      });
      
      // Load from file
      await vectorStore.initialize();
      
      return vectorStore;
    } catch (error) {
      logger.error(`Error restoring vector store: ${error.message}`);
      throw new ApiError(`Failed to restore vector store: ${error.message}`, 500);
    }
  }
}

module.exports = {
  VectorStoreFactory
};