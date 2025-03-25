// utils/file-utils.js - File handling utilities
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { ApiError } = require('./error-types');
const logger = require('./logger');

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat);

/**
 * Detect MIME type from file path
 * @param {string} filePath Path to file
 * @returns {string} MIME type
 */
function detectFileMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  const mimeTypeMap = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip'
  };
  
  return mimeTypeMap[extension] || 'application/octet-stream';
}

/**
 * Extract text from file
 * @param {string} filePath Path to file
 * @param {string} mimeType MIME type of file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromFile(filePath, mimeType) {
  try {
    // For text formats, just read the file
    const textFormats = [
      'text/plain', 'text/markdown', 'text/html', 'text/css',
      'text/javascript', 'application/json', 'application/xml',
      'text/csv'
    ];
    
    if (textFormats.includes(mimeType)) {
      return await readFileAsync(filePath, 'utf8');
    }
    
    // For PDF files, use PDF parser
    if (mimeType === 'application/pdf') {
      return await extractTextFromPdf(filePath);
    }
    
    // For Office documents, we would need additional libraries
    const officeFormats = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (officeFormats.includes(mimeType)) {
      // Placeholder for Office document extraction
      // You would need to implement this with e.g. mammoth.js for DOCX
      return `[This file is a ${mimeType} document. Text extraction not implemented.]`;
    }
    
    // For unsupported formats, return placeholder
    return `[This file type (${mimeType}) is not supported for text extraction.]`;
  } catch (error) {
    logger.error(`Error extracting text from ${filePath}:`, error);
    throw new ApiError(`Failed to extract text from file: ${error.message}`, 500);
  }
}

/**
 * Extract text from PDF file
 * @param {string} filePath Path to PDF file
 * @param {Object} options Extraction options
 * @returns {Promise<Array<string>>} Array of page texts
 */
async function extractTextFromPdf(filePath, options = {}) {
  try {
    // This is a placeholder - in a real implementation you would use
    // a library like pdf-parse, pdf2json or pdf.js
    
    // For now, return a placeholder message
    return [`[This is PDF content from ${path.basename(filePath)}. Actual PDF extraction not implemented.]`];
    
    // In a real implementation, it would look something like this:
    /*
    const pdfParse = require('pdf-parse');
    const dataBuffer = await readFileAsync(filePath);
    const data = await pdfParse(dataBuffer, {
      pagerender: render_page
    });
    
    // Split by pages
    const pageTexts = data.text.split(/Page \d+/);
    return pageTexts.filter(text => text.trim());
    */
  } catch (error) {
    logger.error(`Error extracting text from PDF ${filePath}:`, error);
    throw new ApiError(`Failed to extract text from PDF: ${error.message}`, 500);
  }
}

/**
 * Save uploaded file
 * @param {Object} file File object from multer
 * @param {string} targetDir Target directory
 * @returns {Promise<string>} Path to saved file
 */
async function saveUploadedFile(file, targetDir) {
  try {
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Generate safe filename
    const fileExt = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExt)
      .replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const fileName = `${baseName}_${timestamp}${fileExt}`;
    
    // Target path
    const targetPath = path.join(targetDir, fileName);
    
    // Save file
    if (file.buffer) {
      // If file is in memory (multer memory storage)
      await writeFileAsync(targetPath, file.buffer);
    } else if (file.path) {
      // If file is on disk (multer disk storage)
      const sourceData = await readFileAsync(file.path);
      await writeFileAsync(targetPath, sourceData);
    } else {
      throw new ApiError('Invalid file object', 400);
    }
    
    return targetPath;
  } catch (error) {
    logger.error(`Error saving uploaded file ${file.originalname}:`, error);
    throw new ApiError(`Failed to save uploaded file: ${error.message}`, 500);
  }
}

module.exports = {
  detectFileMimeType,
  extractTextFromFile,
  extractTextFromPdf,
  saveUploadedFile
};