// datasources/sources/halo-istm.js - Halo ISTM data source
const axios = require('axios');
const DataSourceInterface = require('../source-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');
const apiKeyManager = require('../../config/api-key-manager');

/**
 * Halo ISTM data source adapter
 */
class HaloISTMDataSource extends DataSourceInterface {
  /**
   * Initialize the Halo ISTM data source
   * @param {Object} config Configuration for Halo ISTM
   */
  async initialize(config) {
    this.baseUrl = config.baseUrl || 'https://api.halo-istm.example.com';
    this.endpoints = config.endpoints || ['/documents'];
    this.filters = config.filters || {};
    
    // Set up authentication
    this.apiKey = config.apiKey || process.env.HALO_ISTM_API_KEY;
    
    // If not provided in config, try to get from API key manager
    if (!this.apiKey) {
      this.apiKey = await apiKeyManager.getApiKey('halo-istm');
    }
    
    // Check required auth
    if (!this.apiKey) {
      throw new ApiError('Halo ISTM API key is required', 400);
    }
    
    // Create axios client
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  /**
   * Fetch documents from Halo ISTM API
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    const documents = [];

    for (const endpoint of this.endpoints) {
      try {
        logger.debug(`Fetching documents from Halo ISTM endpoint: ${endpoint}`);
        
        // Build query parameters
        const params = { ...this.filters, ...query };
        
        // Make API request
        const response = await this.client.get(endpoint, { params });
        
        // Process response data
        const processedDocs = this.processApiResponse(response.data);
        documents.push(...processedDocs);
        
        logger.debug(`Processed ${processedDocs.length} documents from endpoint ${endpoint}`);
      } catch (error) {
        logger.error(`Error fetching from Halo ISTM endpoint ${endpoint}:`, error.message);
        
        // If error has response data, log it
        if (error.response && error.response.data) {
          logger.error('API error response:', error.response.data);
        }
      }
    }

    return documents;
  }

  /**
   * Process API response into standardized document format
   * @param {Object} response API response data
   * @returns {Array} Processed documents
   * @private
   */
  processApiResponse(response) {
    // Check if response is array of documents directly
    if (Array.isArray(response)) {
      return response.map(this.formatDocument);
    }
    
    // Check if response has documents array
    if (response.documents && Array.isArray(response.documents)) {
      return response.documents.map(this.formatDocument);
    }
    
    // Check if response has items array
    if (response.items && Array.isArray(response.items)) {
      return response.items.map(this.formatDocument);
    }
    
    // Check if response has results array
    if (response.results && Array.isArray(response.results)) {
      return response.results.map(this.formatDocument);
    }
    
    // If response is a single document
    if (response.id && (response.content || response.body || response.text)) {
      return [this.formatDocument(response)];
    }
    
    logger.error('Unknown Halo ISTM API response format:', response);
    return [];
  }
  
  /**
   * Format a document from API response
   * @param {Object} doc Document from API
   * @returns {Object} Formatted document
   * @private
   */
  formatDocument(doc) {
    return {
      id: doc.id || doc._id,
      title: doc.title || doc.name || 'Untitled Document',
      content: doc.content || doc.body || doc.text || '',
      metadata: {
        source: 'halo-istm',
        id: doc.id || doc._id,
        created: doc.createdAt || doc.created || doc.dateCreated,
        updated: doc.updatedAt || doc.updated || doc.lastModified,
        author: doc.author || doc.createdBy,
        tags: doc.tags || doc.categories || [],
        url: doc.url || doc.link || null
      }
    };
  }

  /**
   * Get information about the Halo ISTM data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'halo-istm',
      baseUrl: this.baseUrl,
      endpoints: this.endpoints,
      filters: this.filters
    };
  }
  
  /**
   * Test connection to Halo ISTM
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      // Try to access an endpoint that requires minimal permissions
      await this.client.get('/health');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Halo ISTM:', error.message);
      return false;
    }
  }
  
  /**
   * Get capabilities of Halo ISTM data source
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      searchable: true,
      filterable: true,
      pageable: true,
      supportsRealTimeUpdates: false
    };
  }
}

module.exports = HaloISTMDataSource;