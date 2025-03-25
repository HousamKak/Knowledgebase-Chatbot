// datasources/sources/confluence.js - Confluence data source
const axios = require('axios');
const DataSourceInterface = require('../source-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');
const apiKeyManager = require('../../config/api-key-manager');

/**
 * Function to extract text content from Atlas document format
 * @param {Object} node Atlas document node
 * @returns {string} Extracted text content
 */
const extractContentFromAtlasDoc = (node) => {
  if (!node) return '';
  
  if (node.type === 'text') {
    return node.text || '';
  }

  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractContentFromAtlasDoc).join('');
  }

  return '';
};

/**
 * Confluence data source adapter
 */
class ConfluenceDataSource extends DataSourceInterface {
  /**
   * Initialize the Confluence data source
   * @param {Object} config Configuration for Confluence
   */
  async initialize(config) {
    this.baseUrl = config.baseUrl || 'https://your-domain.atlassian.net';
    this.spaceKey = config.spaceKey;
    this.pageIds = config.pageIds || [];
    this.includeChildren = config.includeChildren || false;
    this.excludedPages = config.excludedPages || [];
    this.limit = config.limit || 25;
    
    // Check required configuration
    if (!this.spaceKey && (!this.pageIds || this.pageIds.length === 0)) {
      throw new ApiError('Either spaceKey or pageIds must be provided', 400);
    }
    
    // Set up authentication
    this.username = config.username || process.env.CONFLUENCE_USERNAME;
    this.apiToken = config.apiToken || process.env.CONFLUENCE_API_TOKEN;
    
    // If not provided in config, try to get from API key manager
    if (!this.username || !this.apiToken) {
      const confluenceAuth = await apiKeyManager.getApiKey('confluence');
      if (confluenceAuth) {
        try {
          const parsed = JSON.parse(confluenceAuth);
          this.username = parsed.username || this.username;
          this.apiToken = parsed.apiToken || this.apiToken;
        } catch (error) {
          logger.error('Error parsing Confluence auth from API key manager:', error);
        }
      }
    }
    
    // Check required auth
    if (!this.username || !this.apiToken) {
      throw new ApiError('Confluence username and API token are required', 400);
    }
    
    // Create axios client
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.apiToken
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch all pages from a Confluence space
   * @returns {Promise<Array>} Array of page objects
   */
  async fetchAllPages() {
    let allPages = [];
    let start = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        const response = await this.client.get(
          `/wiki/rest/api/content?spaceKey=${this.spaceKey}&start=${start}&limit=${this.limit}&expand=space`
        );
        
        const data = response.data;
        
        if (!data.results || data.results.length === 0) {
          hasMoreData = false;
        } else {
          allPages = allPages.concat(data.results);
          
          if (data.results.length < this.limit) {
            hasMoreData = false;
          } else {
            start += this.limit;
          }
        }
      } catch (error) {
        logger.error('Error fetching Confluence pages:', error.message);
        throw new ApiError(`Failed to fetch Confluence pages: ${error.message}`, 500);
      }
    }

    return allPages;
  }

  /**
   * Fetch specific pages by ID
   * @returns {Promise<Array>} Array of page objects
   */
  async fetchSpecificPages() {
    const pages = [];
    
    for (const pageId of this.pageIds) {
      try {
        const response = await this.client.get(
          `/wiki/rest/api/content/${pageId}?expand=space`
        );
        
        pages.push(response.data);
      } catch (error) {
        logger.error(`Error fetching Confluence page ${pageId}:`, error.message);
      }
    }

    return pages;
  }

  /**
   * Get page content in Atlas doc format
   * @param {string} pageId Page ID
   * @returns {Promise<Object>} Page content
   */
  async getPageContent(pageId) {
    try {
      const response = await this.client.get(
        `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`
      );
      
      const data = response.data;
      
      if (data && data.body && data.body.atlas_doc_format && data.body.atlas_doc_format.value) {
        let parsedAtlasDoc;
        try {
          parsedAtlasDoc = JSON.parse(data.body.atlas_doc_format.value);
        } catch (error) {
          logger.error(`Error parsing Atlas doc format for page ${pageId}:`, error);
          return null;
        }
        
        return {
          id: pageId,
          title: data.title,
          content: extractContentFromAtlasDoc(parsedAtlasDoc),
          url: data._links?.webui || `${this.baseUrl}/wiki/spaces/${data.spaceId}/pages/${pageId}`,
          spaceKey: data.spaceId
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting content for Confluence page ${pageId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch documents from Confluence
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    // Get pages based on configuration
    const pages = this.pageIds.length > 0 
      ? await this.fetchSpecificPages() 
      : await this.fetchAllPages();
    
    // Filter out excluded pages
    const filteredPages = pages.filter(page => 
      !this.excludedPages.includes(page.id)
    );
    
    logger.debug(`Found ${filteredPages.length} Confluence pages to process`);
    
    // Process each page to get content
    const documents = [];
    
    for (const page of filteredPages) {
      const document = await this.getPageContent(page.id);
      if (document) {
        // Add metadata
        document.metadata = {
          source: 'confluence',
          id: page.id,
          title: page.title,
          url: document.url,
          spaceKey: document.spaceKey || page.space?.key,
          lastUpdated: page.lastUpdated || page.history?.lastUpdated?.when,
          version: page.version?.number
        };
        
        documents.push(document);
      }
    }
    
    logger.debug(`Successfully processed ${documents.length} Confluence pages`);
    return documents;
  }

  /**
   * Get information about the Confluence data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'confluence',
      baseUrl: this.baseUrl,
      spaceKey: this.spaceKey,
      pageCount: this.pageIds.length || 'all',
      includeChildren: this.includeChildren
    };
  }
  
  /**
   * Test connection to Confluence
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      // Test API connection with a simple request
      await this.client.get('/wiki/rest/api/space');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Confluence:', error.message);
      return false;
    }
  }
  
  /**
   * Get capabilities of Confluence data source
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

module.exports = ConfluenceDataSource;