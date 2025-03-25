// services/datasource-service.js - Data source-related services
const DataSourceFactory = require('../datasources/source-factory');
const configManager = require('../config/config-manager');
const apiKeyManager = require('../config/api-key-manager');
const knowledgeManager = require('../knowledge/knowledge-manager');
const logger = require('../utils/logger');
const { ApiError, NotFoundError } = require('../utils/error-types');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const unlinkAsync = promisify(fs.unlink);

/**
 * Service for data source-related operations
 */
class DatasourceService {
  /**
   * List data sources
   * @returns {Promise<Array>} List of data sources
   */
  async listDataSources() {
    try {
      const config = await configManager.getConfig();
      return config.dataSources || [];
    } catch (error) {
      logger.error('Error listing data sources:', error);
      throw new ApiError(`Failed to list data sources: ${error.message}`, 500);
    }
  }
  
  /**
   * Get data source by ID
   * @param {string} id Data source ID
   * @returns {Promise<Object>} Data source details
   */
  async getDataSourceById(id) {
    try {
      const dataSources = await this.listDataSources();
      const dataSource = dataSources.find(ds => ds.id === id);
      
      if (!dataSource) {
        throw new NotFoundError(`Data source not found: ${id}`);
      }
      
      return dataSource;
    } catch (error) {
      logger.error(`Error getting data source ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Add data source
   * @param {string} type Data source type
   * @param {string} name Data source name
   * @param {Object} config Data source configuration
   * @returns {Promise<Object>} Created data source
   */
  async addDataSource(type, name, config) {
    try {
      // Validate type
      const availableTypes = DataSourceFactory.getAvailableSourceTypes();
      const sourceType = availableTypes.find(t => t.id === type);
      
      if (!sourceType) {
        throw new ApiError(`Unsupported data source type: ${type}`, 400);
      }
      
      // Create data source ID
      const id = `${type}_${Date.now()}`;
      
      // Create data source object
      const dataSource = {
        id,
        type,
        name,
        enabled: true,
        config: config || {}
      };
      
      // Add to config
      const appConfig = await configManager.getConfig();
      appConfig.dataSources = appConfig.dataSources || [];
      appConfig.dataSources.push(dataSource);
      
      // Update config
      await configManager.updateConfig({ dataSources: appConfig.dataSources });
      
      return dataSource;
    } catch (error) {
      logger.error(`Error adding data source of type ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Update data source
   * @param {string} id Data source ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<Object>} Updated data source
   */
  async updateDataSource(id, updates) {
    try {
      // Get existing data source
      const dataSource = await this.getDataSourceById(id);
      
      // Update data source
      const updatedSource = {
        ...dataSource,
        ...updates,
        config: {
          ...dataSource.config,
          ...(updates.config || {})
        }
      };
      
      // Update in config
      const appConfig = await configManager.getConfig();
      const sourceIndex = appConfig.dataSources.findIndex(ds => ds.id === id);
      appConfig.dataSources[sourceIndex] = updatedSource;
      
      // Update config
      await configManager.updateConfig({ dataSources: appConfig.dataSources });
      
      return updatedSource;
    } catch (error) {
      logger.error(`Error updating data source ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete data source
   * @param {string} id Data source ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteDataSource(id) {
    try {
      // Get app config
      const appConfig = await configManager.getConfig();
      
      // Filter out data source
      appConfig.dataSources = appConfig.dataSources.filter(ds => ds.id !== id);
      
      // Update config
      await configManager.updateConfig({ dataSources: appConfig.dataSources });
      
      // Clear source documents from knowledge base
      await knowledgeManager.clearSourceDocuments(id);
      
      return true;
    } catch (error) {
      logger.error(`Error deleting data source ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch and index data from a data source
   * @param {string} sourceId Data source ID
   * @returns {Promise<Object>} Result with document count
   */
  async fetchAndIndexData(sourceId) {
    try {
      // Get data source
      const dataSource = await this.getDataSourceById(sourceId);
      
      // Get necessary API keys
      let sourceCreds = {};
      if (dataSource.type === 'confluence') {
        sourceCreds = await this.getConfluenceCredentials();
      } else if (dataSource.type === 'halo-istm') {
        sourceCreds.apiKey = await apiKeyManager.getApiKey('halo-istm');
      }
      
      // Initialize data source
      const sourceInstance = await DataSourceFactory.createDataSource(dataSource.type, {
        ...dataSource.config,
        ...sourceCreds
      });
      
      // Fetch documents
      const documents = await sourceInstance.fetchDocuments();
      
      if (!documents || documents.length === 0) {
        return { documentCount: 0, message: 'No documents fetched' };
      }
      
      // Initialize knowledge manager if not already
      if (!knowledgeManager.initialized) {
        await knowledgeManager.initialize();
      }
      
      // Clear existing documents from this source
      await knowledgeManager.clearSourceDocuments(sourceId);
      
      // Add documents to knowledge base
      await knowledgeManager.addDocuments(documents, sourceId);
      
      return {
        documentCount: documents.length,
        message: `Successfully indexed ${documents.length} documents from ${dataSource.name}`
      };
    } catch (error) {
      logger.error(`Error fetching and indexing data from source ${sourceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Process uploaded files
   * @param {Array} files Uploaded files
   * @param {Object} options Processing options
   * @returns {Promise<Object>} Result with document count
   */
  async processUploadedFiles(files, options = {}) {
    try {
      if (!files || files.length === 0) {
        throw new ApiError('No files provided', 400);
      }
      
      // Create a data source for the files
      const sourceName = options.name || 'Uploaded Files';
      const sourceType = options.type || 'documents';
      
      // Create data source
      const dataSource = await this.addDataSource(sourceType, sourceName, {
        folderPath: path.join(__dirname, '../../uploads'),
        includeSubfolders: true
      });
      
      // Store file paths in data source config
      const filePaths = files.map(file => file.path);
      await this.updateDataSource(dataSource.id, {
        config: {
          filePaths
        }
      });
      
      // Initialize knowledge manager if not already
      if (!knowledgeManager.initialized) {
        await knowledgeManager.initialize();
      }
      
      // Process each file
      const documents = [];
      
      for (const file of files) {
        try {
          // Extract file information
          const filename = file.originalname || path.basename(file.path);
          const fileId = uuidv4();
          
          // Create document
          documents.push({
            id: fileId,
            title: filename,
            content: file.buffer?.toString() || fs.readFileSync(file.path, 'utf8'),
            metadata: {
              source: dataSource.id,
              filename,
              path: file.path,
              mimetype: file.mimetype,
              size: file.size,
              uploadDate: new Date().toISOString()
            }
          });
        } catch (error) {
          logger.error(`Error processing file ${file.originalname}:`, error);
        }
      }
      
      // Add documents to knowledge base
      if (documents.length > 0) {
        await knowledgeManager.addDocuments(documents, dataSource.id);
      }
      
      // Clean up temporary files
      for (const file of files) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            await unlinkAsync(file.path);
          }
        } catch (error) {
          logger.error(`Error cleaning up file ${file.path}:`, error);
        }
      }
      
      return {
        dataSource,
        documentCount: documents.length,
        message: `Successfully processed ${documents.length} files`
      };
    } catch (error) {
      logger.error('Error processing uploaded files:', error);
      throw error;
    }
  }
  
  /**
   * Store Confluence credentials
   * @param {string} username Confluence username
   * @param {string} apiToken Confluence API token
   * @param {string} baseUrl Confluence base URL
   * @returns {Promise<boolean>} Success status
   */
  async storeConfluenceCredentials(username, apiToken, baseUrl) {
    try {
      if (!username || !apiToken) {
        throw new ApiError('Username and API token are required', 400);
      }
      
      // Store credentials
      const credentials = {
        username,
        apiToken,
        baseUrl: baseUrl || 'https://your-domain.atlassian.net'
      };
      
      await apiKeyManager.storeApiKey('confluence', JSON.stringify(credentials));
      return true;
    } catch (error) {
      logger.error('Error storing Confluence credentials:', error);
      throw error;
    }
  }
  
  /**
   * Get Confluence credentials
   * @returns {Promise<Object>} Confluence credentials
   * @private
   */
  async getConfluenceCredentials() {
    try {
      const credentialsStr = await apiKeyManager.getApiKey('confluence');
      
      if (!credentialsStr) {
        throw new ApiError('Confluence credentials not found', 400);
      }
      
      try {
        return JSON.parse(credentialsStr);
      } catch (e) {
        throw new ApiError('Invalid Confluence credentials format', 500);
      }
    } catch (error) {
      logger.error('Error getting Confluence credentials:', error);
      throw error;
    }
  }
}

module.exports = new DatasourceService();