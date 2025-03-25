// datasources/sources/pdf.js - PDF document data source
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const DataSourceInterface = require('../source-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');
const { extractTextFromPdf } = require('../../utils/file-utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * PDF document data source adapter
 */
class PdfDataSource extends DataSourceInterface {
  /**
   * Initialize the PDF document data source
   * @param {Object} config Configuration for the PDF document source
   */
  async initialize(config) {
    this.folderPath = config.folderPath;
    this.pdfFiles = config.pdfFiles || [];
    this.extractImages = config.extractImages || false;
    this.extractForms = config.extractForms || false;
    this.pageLimit = config.pageLimit || 0; // 0 means no limit
    
    // Validate input
    if (!this.folderPath && (!this.pdfFiles || this.pdfFiles.length === 0)) {
      throw new ApiError('Either folderPath or pdfFiles must be provided', 400);
    }
    
    // For security, don't allow accessing arbitrary paths in production
    if (this.folderPath && process.env.NODE_ENV === 'production') {
      const allowedBasePaths = [
        path.join(__dirname, '../../uploads'),
        path.join(__dirname, '../../data')
      ];
      
      // Add custom allowed paths from env
      if (process.env.ALLOWED_DOCUMENT_PATHS) {
        allowedBasePaths.push(...process.env.ALLOWED_DOCUMENT_PATHS.split(','));
      }
      
      const resolvedPath = path.resolve(this.folderPath);
      const isAllowed = allowedBasePaths.some(allowedPath => 
        resolvedPath.startsWith(allowedPath)
      );
      
      if (!isAllowed) {
        throw new ApiError('Access to this folder path is not allowed', 403);
      }
    }
  }

  /**
   * Fetch documents from PDF files
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    logger.debug('Fetching documents from PDF files');
    
    try {
      // Get PDF file paths
      const pdfFilePaths = await this.getPdfFilePaths();
      logger.debug(`Found ${pdfFilePaths.length} PDF files`);
      
      // Process each PDF file
      const documents = [];
      
      for (const filePath of pdfFilePaths) {
        try {
          // Extract text from PDF
          const pages = await extractTextFromPdf(filePath, {
            extractImages: this.extractImages,
            extractForms: this.extractForms,
            pageLimit: this.pageLimit
          });
          
          // Create a document for each page or for the whole PDF
          if (query.splitByPage) {
            // Create a document for each page
            pages.forEach((pageText, pageNum) => {
              documents.push({
                id: `${Buffer.from(filePath).toString('base64')}_page${pageNum + 1}`,
                title: `${path.basename(filePath, '.pdf')} - Page ${pageNum + 1}`,
                content: pageText,
                metadata: {
                  source: 'pdf',
                  path: filePath,
                  page: pageNum + 1,
                  totalPages: pages.length,
                  filename: path.basename(filePath)
                }
              });
            });
          } else {
            // Create a single document for the entire PDF
            documents.push({
              id: Buffer.from(filePath).toString('base64'),
              title: path.basename(filePath, '.pdf'),
              content: pages.join('\n\nPage break\n\n'),
              metadata: {
                source: 'pdf',
                path: filePath,
                totalPages: pages.length,
                filename: path.basename(filePath)
              }
            });
          }
        } catch (error) {
          logger.error(`Error processing PDF file ${filePath}:`, error);
        }
      }
      
      logger.debug(`Successfully processed ${documents.length} documents from PDF files`);
      return documents;
    } catch (error) {
      logger.error('Error fetching documents from PDF files:', error);
      throw new ApiError(`Failed to process PDF files: ${error.message}`, 500);
    }
  }

  /**
   * Get all PDF file paths
   * @returns {Promise<Array<string>>} Array of PDF file paths
   * @private
   */
  async getPdfFilePaths() {
    // If specific PDF files are provided, use those
    if (this.pdfFiles && this.pdfFiles.length > 0) {
      return this.pdfFiles.filter(file => file.toLowerCase().endsWith('.pdf'));
    }
    
    // Otherwise, scan the folder
    if (!this.folderPath) {
      return [];
    }
    
    try {
      // Ensure the folder exists
      await stat(this.folderPath);
      
      // Get all files in the folder
      const files = await readdir(this.folderPath);
      
      // Filter for PDF files
      return files
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(this.folderPath, file));
    } catch (error) {
      logger.error(`Error reading directory ${this.folderPath}:`, error);
      return [];
    }
  }

  /**
   * Get information about the PDF document data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'pdf',
      folderPath: this.folderPath,
      pdfCount: this.pdfFiles.length || 'unknown',
      extractImages: this.extractImages,
      extractForms: this.extractForms
    };
  }
  
  /**
   * Test connection to the PDF document source
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      // If folder path is provided, check if it exists
      if (this.folderPath) {
        await stat(this.folderPath);
      }
      
      // If PDF files are provided, check if at least one exists
      if (this.pdfFiles && this.pdfFiles.length > 0) {
        await stat(this.pdfFiles[0]);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to access PDF source:', error);
      return false;
    }
  }
  
  /**
   * Get capabilities of PDF document data source
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      searchable: false,
      filterable: true,
      pageable: true,
      supportsRealTimeUpdates: false
    };
  }
}

module.exports = PdfDataSource;