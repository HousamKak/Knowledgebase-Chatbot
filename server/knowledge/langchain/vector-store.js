// knowledge/langchain/vector-stores.js - Vector store factory
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
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
      
      // You can add external vector stores like Pinecone, Weaviate, etc.
      
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
      }
      // Add external options as they become available
    ];
  }
}

module.exports = {
  VectorStoreFactory
};