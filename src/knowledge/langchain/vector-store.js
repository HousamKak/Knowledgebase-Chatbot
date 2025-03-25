import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ForgeVectorStore } from "./forge-vector-store"; // Custom implementation for Forge

/**
 * Factory for creating vector stores
 */
export class VectorStoreFactory {
  /**
   * Create a vector store based on configuration
   * @param {Object} config Vector store configuration
   * @param {Embeddings} embeddings Embeddings provider
   * @param {Object} storage Forge storage API
   * @returns {VectorStore} LangChain vector store
   */
  static async createVectorStore(config, embeddings, storage) {
    const storeType = config.type || 'memory';
    
    switch (storeType) {
      case 'memory':
        return new MemoryVectorStore(embeddings);
      
      case 'forge':
        return new ForgeVectorStore(embeddings, storage);
      
      // You can add external vector stores like Pinecone, Weaviate, etc.
      
      default:
        throw new Error(`Unsupported vector store type: ${storeType}`);
    }
  }
}
