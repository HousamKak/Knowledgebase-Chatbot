// middleware/file-upload.js - File upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../utils/error-types');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific subdirectory if needed
    const userDir = path.join(uploadDir, req.body.userId || 'default');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniquePrefix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniquePrefix}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept common file types
  const allowedTypes = [
    // Documents
    '.txt', '.md', '.pdf', '.doc', '.docx', '.rtf',
    '.xls', '.xlsx', '.csv', '.tsv',
    '.ppt', '.pptx',
    // Code
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.cs',
    '.html', '.css', '.json', '.xml', '.yaml', '.yml',
    // Other
    '.log'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(`File type not allowed: ${ext}`, 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 50 * 1024 * 1024, // 50MB default
    files: 20 // Maximum 20 files per upload
  }
});

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError('File too large', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ApiError('Too many files', 400));
    }
    return next(new ApiError(`Upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = {
  array: (fieldName) => [
    upload.array(fieldName),
    handleMulterError
  ],
  single: (fieldName) => [
    upload.single(fieldName),
    handleMulterError
  ],
  fields: (fields) => [
    upload.fields(fields),
    handleMulterError
  ],
  // Utility to clean up files after processing
  cleanupFiles: (files) => {
    if (!files) return;
    
    const filesToDelete = Array.isArray(files) ? files : [files];
    
    for (const file of filesToDelete) {
      if (file && file.path) {
        try {
          fs.unlinkSync(file.path);
          logger.debug(`Deleted temporary file: ${file.path}`);
        } catch (error) {
          logger.error(`Error deleting file ${file.path}:`, error);
        }
      }
    }
  }
};