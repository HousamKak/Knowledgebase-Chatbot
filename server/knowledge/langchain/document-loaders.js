// knowledge/langchain/document-loaders.js - Document loader adapters
const { Document } = require("langchain/document");

/**
 * Adapter to convert data source documents to LangChain documents
 */
class DataSourceAdapter {
  /**
   * Convert data source documents to LangChain documents
   * @param {Array} documents Array of documents from data sources
   * @returns {Array<Document>} Array of LangChain documents
   */
  static convertToLangChainDocuments(documents) {
    return documents.map(doc => {
      // Get content from document
      const content = doc.content || doc.text || '';
      
      // Handle empty content
      if (!content.trim()) {
        return null;
      }
      
      // Create metadata object from document properties
      const metadata = {
        id: doc.id || '',
        title: doc.title || '',
        source: doc.source || doc.metadata?.source || 'unknown',
        url: doc.url || doc.metadata?.url || '',
        timestamp: doc.timestamp || doc.metadata?.timestamp || new Date().toISOString(),
        ...doc.metadata
      };
      
      // Create LangChain document
      return new Document({
        pageContent: content,
        metadata
      });
    }).filter(Boolean); // Filter out null documents
  }
  
  /**
   * Create a document from text
   * @param {string} text Document text
   * @param {Object} metadata Document metadata
   * @returns {Document} LangChain document
   */
  static createDocument(text, metadata = {}) {
    return new Document({
      pageContent: text,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }
}

module.exports = {
  DataSourceAdapter
};