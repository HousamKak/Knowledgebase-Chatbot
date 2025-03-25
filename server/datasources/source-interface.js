// datasources/source-interface.js - Data source interface
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
  
  /**
   * Test the connection to the data source
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get capabilities of the data source
   * @returns {Object} Capabilities of the data source
   */
  getCapabilities() {
    return {
      searchable: false,
      filterable: false,
      pageable: false,
      supportsRealTimeUpdates: false
    };
  }
}

module.exports = DataSourceInterface;