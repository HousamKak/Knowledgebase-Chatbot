// source-interface.js placeholder
/**
 * Interface for data source adapters
 * All data source implementations should extend this class
 */
class DataSourceInterface {
    /**
     * Initialize the data source with configuration
     * @param {Object} config Configuration for the data source
     */
    async initialize(config) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Fetch documents from the data source
     * @param {Object} query Query parameters for fetching documents
     * @returns {Promise<Array>} Array of documents
     */
    async fetchDocuments(query) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Get information about the data source
     * @returns {Object} Data source information
     */
    getSourceInfo() {
      throw new Error('Method not implemented');
    }
  }
  
  export default DataSourceInterface;