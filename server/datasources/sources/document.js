// datasources/sources/documents.js - Document folder data source
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const DataSourceInterface = require('../source-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');
const { detectFileMimeType, extractTextFromFile } = require('../../utils/file-utils');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Document folder data source adapter
 */
class DocumentsDataSource extends DataSourceInterface {
  /**
   * Initialize the document folder data source
   * @param {Object} config Configuration for the document folder
   */
  async initialize(config) {
    this.folderPath = config.folderPath;
    this.includeSubfolders = config.includeSubfolders || false;
    this.fileExtensions = config.fileExtensions || [
      '.txt', '.md', '.pdf', '.doc', '.docx', 
      '.rtf', '.csv', '.json', '.xml', '.html'
    ];
    this.excludePatterns = config.excludePatterns || [
      /^\./, // Hidden files
      /^~/, // Temp files
      /^node_modules/, // Node modules
    ];
    
    // Validate folder path
    if (!this.folderPath) {
      throw new ApiError('Folder path is required', 400);
    }
    
    if (this.folderPath.startsWith('http')) {
      throw new ApiError('Folder path must be a local path, not a URL', 400);
    }
    
    // For security, don't allow accessing arbitrary paths
    if (process.env.NODE_ENV === 'production') {
      const allowedBasePaths = [
        path.join(__dirname, '../../uploads'),
        path.join(__dirname, '../../data')
      ];
      
      // Add custom allowed paths from env
      if (process.env.ALLOWED_DOCUMENT_PATHS) {
        process.env.ALLOWED_DOCUMENT_PATHS.split(',').forEach(customPath => {
          // Validate path format
          if (path.isAbsolute(customPath) && customPath.trim() !== '') {
            allowedBasePaths.push(path.normalize(customPath));
          } else {
            logger.warn(`Invalid path in ALLOWED_DOCUMENT_PATHS: ${customPath}`);
          }
        });
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
   * Fetch documents from the folder
   * @param {Object} query Query parameters
   * @returns {Promise<Array>} Array of documents
   */
  async fetchDocuments(query = {}) {
    logger.debug(`Fetching documents from folder: ${this.folderPath}`);
    
    try {
      // Ensure the folder exists
      await stat(this.folderPath);
      
      // Get all files recursively
      const files = await this.getFiles(this.folderPath);
      logger.debug(`Found ${files.length} files in folder`);
      
      // Filter files by extension
      const filteredFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.fileExtensions.includes(ext);
      });
      logger.debug(`Filtered to ${filteredFiles.length} supported files`);
      
      // Process files into documents
      const documents = [];
      
      for (const filePath of filteredFiles) {
        try {
          const fileContent = await this.processFile(filePath);
          
          if (fileContent) {
            documents.push({
              id: Buffer.from(filePath).toString('base64'),
              title: path.basename(filePath),
              content: fileContent,
              metadata: {
                source: 'documents',
                path: filePath,
                extension: path.extname(filePath).toLowerCase(),
                lastModified: fs.statSync(filePath).mtime.toISOString()
              }
            });
          }
        } catch (error) {
          logger.error(`Error processing file ${filePath}:`, error);
        }
      }
      
      logger.debug(`Successfully processed ${documents.length} documents`);
      return documents;
    } catch (error) {
      logger.error('Error fetching documents from folder:', error);
      throw new ApiError(`Failed to access folder: ${error.message}`, 500);
    }
  }

  /**
   * Get all files in folder recursively
   * @param {string} dir Directory to search
   * @param {Array} fileList Accumulated file list
   * @returns {Promise<Array>} Array of file paths
   * @private
   */
  async getFiles(dir, fileList = []) {
    try {
      const files = await readdir(dir);
      
      for (const file of files) {
        // Skip excluded files
        if (this.excludePatterns.some(pattern => pattern.test(file))) {
          continue;
        }
        
        const filePath = path.join(dir, file);
        const fileStat = await stat(filePath);
        
        if (fileStat.isDirectory()) {
          if (this.includeSubfolders) {
            // Recursively get files from subdirectory
            await this.getFiles(filePath, fileList);
          }
        } else {
          fileList.push(filePath);
        }
      }
      
      return fileList;
    } catch (error) {
      logger.error(`Error reading directory ${dir}:`, error);
      return fileList;
    }
  }

  /**
   * Process a file to extract its content
   * @param {string} filePath Path to file
   * @returns {Promise<string>} Extracted text content
   * @private
   */
  async processFile(filePath) {
    const mimeType = detectFileMimeType(filePath);
    return extractTextFromFile(filePath, mimeType);
  }

  /**
   * Get information about the document folder data source
   * @returns {Object} Data source information
   */
  getSourceInfo() {
    return {
      type: 'documents',
      folderPath: this.folderPath,
      includeSubfolders: this.includeSubfolders,
      fileExtensions: this.fileExtensions
    };
  }
  
  /**
   * Test connection to the document folder
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      await stat(this.folderPath);
      return true;
    } catch (error) {
      logger.error(`Failed to access folder ${this.folderPath}:`, error);
      return false;
    }
  }
  
  /**
   * Get capabilities of document folder data source
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      searchable: false,
      filterable: true,
      pageable: false,
      supportsRealTimeUpdates: false
    };
  }
}

module.exports = DocumentsDataSource;