// middleware/error-handler.js - Error handling middleware
const logger = require('../utils/logger');
const { ApiError, NotFoundError, ValidationError } = require('../utils/error-types');

// Async error handler for routes
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      details: err.details
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      details: err.details
    });
  }

  // Default error response
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = {
  catchAsync,
  errorHandler
};