// utils/error-types.js - Custom error types
/**
 * Base API error class
 */
class ApiError extends Error {
    /**
     * Create a new API error
     * @param {string} message Error message
     * @param {number} statusCode HTTP status code
     * @param {Object} details Additional error details
     */
    constructor(message, statusCode = 500, details = null) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Not found error
   */
  class NotFoundError extends ApiError {
    /**
     * Create a not found error
     * @param {string} message Error message
     * @param {Object} details Additional details
     */
    constructor(message = 'Resource not found', details = null) {
      super(message, 404, details);
    }
  }
  
  /**
   * Validation error
   */
  class ValidationError extends ApiError {
    /**
     * Create a validation error
     * @param {string} message Error message
     * @param {Object} details Validation details
     */
    constructor(message = 'Validation failed', details = null) {
      super(message, 400, details);
    }
  }
  
  /**
   * Authentication error
   */
  class AuthenticationError extends ApiError {
    /**
     * Create an authentication error
     * @param {string} message Error message
     */
    constructor(message = 'Authentication failed') {
      super(message, 401);
    }
  }
  
  /**
   * Authorization error
   */
  class AuthorizationError extends ApiError {
    /**
     * Create an authorization error
     * @param {string} message Error message
     */
    constructor(message = 'Not authorized') {
      super(message, 403);
    }
  }
  
  /**
   * Rate limit error
   */
  class RateLimitError extends ApiError {
    /**
     * Create a rate limit error
     * @param {string} message Error message
     * @param {number} retryAfter Seconds until retry is allowed
     */
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
      super(message, 429);
      this.retryAfter = retryAfter;
    }
  }
  
  module.exports = {
    ApiError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError
  };