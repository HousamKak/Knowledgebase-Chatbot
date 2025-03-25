// utils/file-utils.js - File handling utilities
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { ApiError } = require('./error-types');
const logger = require('./logger');
const stream = require('stream');

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat);
const pipeline = promisify(stream.pipeline);

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
    // Check file size first
    const stats = await statAsync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    // For large files (> 10MB), use streaming instead of loading all at once
    if (fileSizeMB > 10) {
      return await extractTextFromLargeFile(filePath, mimeType);
    }
    
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
      // Try to use available libraries
      try {
        if (mimeType.includes('word')) {
          return await extractTextFromWord(filePath);
        } else if (mimeType.includes('excel')) {
          return await extractTextFromExcel(filePath);
        } else {
          return `[This file is a ${mimeType} document. Text extraction not fully implemented.]`;
        }
      } catch (error) {
        logger.error(`Error extracting text from Office document ${filePath}:`, error);
        return `[Error extracting text from ${mimeType} document: ${error.message}]`;
      }
    }
    
    // For unsupported formats, return placeholder
    return `[This file type (${mimeType}) is not supported for text extraction.]`;
  } catch (error) {
    logger.error(`Error extracting text from ${filePath}:`, error);
    throw new ApiError(`Failed to extract text from file: ${error.message}`, 500);
  }
}

/**
 * Extract text from large file using streaming
 * @param {string} filePath Path to file
 * @param {string} mimeType MIME type of file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromLargeFile(filePath, mimeType) {
  return new Promise((resolve, reject) => {
    const textChunks = [];
    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 64 * 1024 // 64KB chunks
    });
    
    readStream.on('data', (chunk) => {
      textChunks.push(chunk);
    });
    
    readStream.on('end', () => {
      resolve(textChunks.join(''));
    });
    
    readStream.on('error', (error) => {
      reject(new ApiError(`Error reading large file: ${error.message}`, 500));
    });
  });
}

/**
 * Process a large file using streaming to avoid memory issues
 * @param {string} filePath Path to file
 * @param {string} mimeType MIME type of file
 * @param {function} chunkProcessor Function to process each chunk
 * @returns {Promise<number>} Number of chunks processed
 */
async function processLargeFile(filePath, mimeType, chunkProcessor) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 64 * 1024 // 64KB chunks
    });
    
    let processedChunks = 0;
    
    fileStream.on('data', (chunk) => {
      try {
        chunkProcessor(chunk, processedChunks++);
      } catch (error) {
        reject(error);
      }
    });
    
    fileStream.on('end', () => {
      resolve(processedChunks);
    });
    
    fileStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Extract text from PDF file
 * @param {string} filePath Path to PDF file
 * @param {Object} options Extraction options
 * @returns {Promise<Array<string>>} Array of page texts
 */
async function extractTextFromPdf(filePath, options = {}) {
  try {
    // Dynamically import pdf-parse to reduce dependencies when not needed
    let pdfParse;
    try {
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default;
    } catch (importError) {
      logger.warn(`pdf-parse module not available: ${importError.message}`);
      return [`[PDF content from ${path.basename(filePath)}. PDF extraction not available. Install pdf-parse package.]`];
    }
    
    // Handle large PDFs with streaming if supported
    let dataBuffer;
    try {
      dataBuffer = await readFileAsync(filePath);
    } catch (error) {
      logger.error(`Error reading PDF file ${filePath}:`, error);
      return [`[Error reading PDF file: ${error.message}]`];
    }
    
    try {
      const data = await pdfParse(dataBuffer, {
        max: options.pageLimit || 0,
        pagerender: options.extractImages ? renderPageWithImages : undefined
      });
      
      // Split by pages
      const pageTexts = data.text.split(/Page \d+/)
        .filter(text => text.trim())
        .map(text => text.trim());
      
      return pageTexts.length > 0 ? pageTexts : [data.text];
    } catch (error) {
      logger.error(`Error parsing PDF ${filePath}:`, error);
      return [`[Error parsing PDF: ${error.message}]`];
    }
  } catch (error) {
    logger.error(`Error extracting text from PDF ${filePath}:`, error);
    throw new ApiError(`Failed to extract text from PDF: ${error.message}`, 500);
  }
}

/**
 * Extract text from Word document
 * @param {string} filePath Path to Word document
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromWord(filePath) {
  try {
    // Dynamically import mammoth to reduce dependencies when not needed
    let mammoth;
    try {
      mammoth = await import('mammoth');
    } catch (importError) {
      logger.warn(`mammoth module not available: ${importError.message}`);
      return `[Word document content from ${path.basename(filePath)}. Word extraction not available. Install mammoth package.]`;
    }
    
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    logger.error(`Error extracting text from Word document ${filePath}:`, error);
    return `[Error extracting text from Word document: ${error.message}]`;
  }
}

/**
 * Extract text from Excel document
 * @param {string} filePath Path to Excel document
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromExcel(filePath) {
  try {
    // Dynamically import xlsx to reduce dependencies when not needed
    let XLSX;
    try {
      const xlsxModule = await import('xlsx');
      XLSX = xlsxModule.default;
    } catch (importError) {
      logger.warn(`xlsx module not available: ${importError.message}`);
      return `[Excel content from ${path.basename(filePath)}. Excel extraction not available. Install xlsx package.]`;
    }
    
    const workbook = XLSX.readFile(filePath);
    
    let result = [];
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      result.push(`Sheet: ${sheetName}\n${csv}`);
    });
    
    return result.join('\n\n');
  } catch (error) {
    logger.error(`Error extracting text from Excel file ${filePath}:`, error);
    return `[Error extracting text from Excel file: ${error.message}]`;
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

/**
 * Helper function for PDF page rendering with images (if supported)
 * @private
 */
function renderPageWithImages(pageData) {
  let render_options = {
    normalizeWhitespace: false,
    disableCombineTextItems: false
  };
  
  let renderText = pageData.getTextContent(render_options)
    .then(textContent => {
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    });
  
  return renderText;
}

module.exports = {
  detectFileMimeType,
  extractTextFromFile,
  extractTextFromPdf,
  extractTextFromWord,
  extractTextFromExcel,
  saveUploadedFile,
  processLargeFile
};