import { Document } from "langchain/document";

/**
 * Adapter to convert data source documents to LangChain documents
 */
export class DataSourceAdapter {
  /**
   * Convert data source documents to LangChain documents
   * @param {Array} documents Array of documents from data sources
   * @returns {Array<Document>} Array of LangChain documents
   */
  static convertToLangChainDocuments(documents) {
    return documents.map(doc => {
      // Create metadata object from document properties
      const metadata = {
        id: doc.id,
        title: doc.title || '',
        url: doc.url || '',
        source: doc.source || 'confluence', 
        timestamp: doc.timestamp || new Date().toISOString()
      };
      
      // Create LangChain document
      return new Document({
        pageContent: doc.content,
        metadata
      });
    });
  }
}