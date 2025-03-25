// knowledge/langchain/local-vector-store.js - Custom vector store with local storage
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * Custom vector store implementation that persists to local storage
 */
class LocalVectorStore extends MemoryVectorStore {
  /**
   * Create a local vector store
   * @param {Embeddings} embeddings Embeddings provider
   * @param {Object} options Store options
   * @param {string} options.dataDir Directory to store data
   * @param {string} options.namespace Namespace for this store
   */
  constructor(embeddings, options = {}) {
    super(embeddings);
    this.dataDir = options.dataDir || path.join(__dirname, '../../data');
    this.namespace = options.namespace || 'default';
    this.filePath = path.join(this.dataDir, `${this.namespace}_vector_store.json`);
    
    // Create memoryVectors array and documentMap
    this.memoryVectors = [];
    this.documentMap = new Map();
  }
  
  /**
   * Initialize the vector store by loading from disk
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Load existing vector data if available
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        
        // Rebuild the vectors
        this.memoryVectors = data.vectors || [];
        
        // Rebuild the document map
        this.documentMap = new Map();
        if (data.documentMap) {
          Object.entries(data.documentMap).forEach(([key, value]) => {
            this.documentMap.set(key, value);
          });
        }
        
        logger.debug(`Loaded vector store from ${this.filePath} with ${this.memoryVectors.length} vectors`);
      } else {
        logger.debug(`No existing vector store found at ${this.filePath}, creating new store`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error initializing LocalVectorStore: ${error.message}`);
      
      // Initialize with empty data
      this.memoryVectors = [];
      this.documentMap = new Map();
      
      return false;
    }
  }
  
  /**
   * Save the vector store to disk
   * @returns {Promise<boolean>} Success status
   */
  async save() {
    try {
      // Convert Map to object for serialization
      const documentMapObj = {};
      this.documentMap.forEach((value, key) => {
        documentMapObj[key] = value;
      });
      
      // Save to file
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({
          vectors: this.memoryVectors,
          documentMap: documentMapObj
        }, null, 2)
      );
      
      logger.debug(`Saved vector store to ${this.filePath} with ${this.memoryVectors.length} vectors`);
      return true;
    } catch (error) {
      logger.error(`Error saving LocalVectorStore: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Add documents to the vector store
   * @param {Array} documents Documents to add
   * @returns {Promise<Array>} The added documents
   */
  async addDocuments(documents) {
    await super.addDocuments(documents);
    await this.save();
    return documents;
  }
  
  /**
   * Delete documents by source
   * @param {string} source Source identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteDocumentsBySource(source) {
    // Filter out documents from the specified source
    const filteredVectors = this.memoryVectors.filter(vector => {
      return vector.metadata?.source !== source;
    });
    
    // Update vectors
    this.memoryVectors = filteredVectors;
    
    // Update document map by removing documents from the source
    for (const [key, doc] of this.documentMap.entries()) {
      if (doc.metadata?.source === source) {
        this.documentMap.delete(key);
      }
    }
    
    // Save the updated store
    await this.save();
    return true;
  }
  
  /**
   * Delete all documents
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    this.memoryVectors = [];
    this.documentMap = new Map();
    await this.save();
    return true;
  }
}

module.exports = {
  LocalVectorStore
};