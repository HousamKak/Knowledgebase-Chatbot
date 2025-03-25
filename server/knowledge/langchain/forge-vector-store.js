// server/knowledge/langchain/forge-vector-store.js
import { MemoryVectorStore } from "langchain/vectorstores/memory";

/**
 * Custom vector store implementation that uses Forge Storage
 */
export class ForgeVectorStore extends MemoryVectorStore {
  constructor(embeddings, storage) {
    super(embeddings);
    this.storage = storage;
    this.VECTOR_STORE_KEY = 'vector_store_data';
  }
  
  async initialize() {
    try {
      // Load existing vector data if available
      const vectorData = await this.storage.get(this.VECTOR_STORE_KEY);
      if (vectorData) {
        const data = JSON.parse(vectorData);
        // Rebuild the vectors
        this.memoryVectors = data.vectors || [];
        // Rebuild the document map
        this.documentMap = new Map();
        if (data.documentMap) {
          Object.entries(data.documentMap).forEach(([key, value]) => {
            this.documentMap.set(key, value);
          });
        }
      }
    } catch (error) {
      console.error("Error initializing ForgeVectorStore:", error);
      // Initialize with empty data
      this.memoryVectors = [];
      this.documentMap = new Map();
    }
  }
  
  async save() {
    try {
      // Convert Map to object for serialization
      const documentMapObj = {};
      this.documentMap.forEach((value, key) => {
        documentMapObj[key] = value;
      });
      
      // Save to Forge storage
      await this.storage.set(
        this.VECTOR_STORE_KEY,
        JSON.stringify({
          vectors: this.memoryVectors,
          documentMap: documentMapObj
        })
      );
    } catch (error) {
      console.error("Error saving ForgeVectorStore:", error);
      throw error;
    }
  }
  
  async addDocuments(documents) {
    await super.addDocuments(documents);
    await this.save();
    return documents;
  }
  
  // Implement document deletion by source
  async deleteDocumentsBySource(source) {
    // Filter out documents from the specified source
    const filteredVectors = this.memoryVectors.filter(vector => {
      const docId = vector.metadata?.id;
      const doc = docId ? this.documentMap.get(docId) : null;
      return doc?.metadata?.source !== source;
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
}