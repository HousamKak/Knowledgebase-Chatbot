// datasources/source-factory.js - Factory for creating data source adapters
const DocumentsDataSource = require('./sources/documents');
const WebsiteDataSource = require('./sources/website');
const PdfDataSource = require('./sources/pdf');
const ConfluenceDataSource = require('./sources/confluence');
const HaloIstmDataSource = require('./sources/halo-istm');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/error-types');

/**
 * Factory for creating data source adapters
 */
class DataSourceFactory {
  /**
   * Create a data source adapter instance
   * @param {string} type The type of data source to create
   * @param {Object} config Configuration for the data source
   * @returns {Promise<DataSourceInterface>} The created data source adapter
   */
  static async createDataSource(type, config) {
    logger.debug(`Creating data source of type: ${type}`);
    
    let dataSource;

    switch (type.toLowerCase()) {
      case 'documents':
        dataSource = new DocumentsDataSource();
        break;
      case 'website':
        dataSource = new WebsiteDataSource();
        break;
      case 'pdf':
        dataSource = new PdfDataSource();
        break;
      case 'confluence':
        dataSource = new ConfluenceDataSource();
        break;
      case 'halo-istm':
        dataSource = new HaloIstmDataSource();
        break;
      default:
        throw new NotFoundError(`Unsupported data source type: ${type}`);
    }

    await dataSource.initialize(config);
    return dataSource;
  }
  
  /**
   * Get available data source types
   * @returns {Array<Object>} Array of available data source types
   */
  static getAvailableSourceTypes() {
    return [
      {
        id: 'documents',
        name: 'Document Folder',
        description: 'Index documents from a local folder',
        icon: 'folder'
      },
      {
        id: 'website',
        name: 'Website',
        description: 'Crawl and index content from a website',
        icon: 'globe'
      },
      {
        id: 'pdf',
        name: 'PDF Documents',
        description: 'Index content from PDF files',
        icon: 'file-pdf'
      },
      {
        id: 'confluence',
        name: 'Confluence',
        description: 'Connect to Atlassian Confluence to index space content',
        icon: 'confluence'
      },
      {
        id: 'halo-istm',
        name: 'Halo ISTM',
        description: 'Connect to Halo ISTM knowledge base',
        icon: 'database'
      }
    ];
  }
}

module.exports = DataSourceFactory;