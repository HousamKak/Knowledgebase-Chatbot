// config/api-key-manager.js - API key management
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * API Key manager to handle secure storage of API keys
 */
class ApiKeyManager {
  constructor() {
    this.configDir = process.env.CONFIG_DIR || path.join(__dirname, '../data');
    this.keysFile = path.join(this.configDir, 'api_keys.json');
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Store an API key for a specific service
   * @param {string} service Service identifier (e.g., 'openai', 'anthropic')
   * @param {string} apiKey The API key to store
   * @returns {Promise<boolean>} Success status
   */
  async storeApiKey(service, apiKey) {
    try {
      const keys = await this.getAllApiKeys();
      
      // Encrypt the API key
      const encryptedKey = this.encrypt(apiKey);
      
      // Store in our keys object
      keys[service] = encryptedKey;
      
      // Write to file
      fs.writeFileSync(
        this.keysFile,
        JSON.stringify(keys, null, 2),
        'utf8'
      );
      
      return true;
    } catch (error) {
      logger.error(`Error storing API key for ${service}:`, error);
      return false;
    }
  }

  /**
   * Retrieve an API key for a specific service
   * @param {string} service Service identifier (e.g., 'openai', 'anthropic')
   * @returns {Promise<string|null>} The API key or null if not found
   */
  async getApiKey(service) {
    try {
      const keys = await this.getAllApiKeys();
      
      if (!keys[service]) {
        return null;
      }
      
      // Decrypt the API key
      return this.decrypt(keys[service]);
    } catch (error) {
      logger.error(`Error retrieving API key for ${service}:`, error);
      return null;
    }
  }

  /**
   * Delete an API key for a specific service
   * @param {string} service Service identifier (e.g., 'openai', 'anthropic')
   * @returns {Promise<boolean>} Success status
   */
  async deleteApiKey(service) {
    try {
      const keys = await this.getAllApiKeys();
      
      if (keys[service]) {
        delete keys[service];
        
        // Write to file
        fs.writeFileSync(
          this.keysFile,
          JSON.stringify(keys, null, 2),
          'utf8'
        );
      }
      
      return true;
    } catch (error) {
      logger.error(`Error deleting API key for ${service}:`, error);
      return false;
    }
  }

  /**
   * Check if an API key exists for a specific service
   * @param {string} service Service identifier (e.g., 'openai', 'anthropic')
   * @returns {Promise<boolean>} Whether the API key exists
   */
  async hasApiKey(service) {
    try {
      const keys = await this.getAllApiKeys();
      return !!keys[service];
    } catch (error) {
      logger.error(`Error checking API key for ${service}:`, error);
      return false;
    }
  }

  /**
   * Get all API keys (encrypted)
   * @returns {Promise<Object>} All encrypted API keys
   * @private
   */
  async getAllApiKeys() {
    try {
      if (fs.existsSync(this.keysFile)) {
        const data = fs.readFileSync(this.keysFile, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      logger.error('Error reading API keys file:', error);
      return {};
    }
  }

  /**
   * Encrypt a string
   * @param {string} text Text to encrypt
   * @returns {string} Encrypted text
   * @private
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)),
        iv
      );
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
      logger.error('Encryption error:', error);
      // Fall back to base64 encoding if encryption fails
      return Buffer.from(text).toString('base64');
    }
  }

  /**
   * Decrypt a string
   * @param {string} text Text to decrypt
   * @returns {string} Decrypted text
   * @private
   */
  decrypt(text) {
    try {
      const textParts = text.split(':');
      if (textParts.length !== 2) {
        // Handle old format or base64 encoded strings
        return Buffer.from(text, 'base64').toString('utf8');
      }
      
      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = Buffer.from(textParts[1], 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)),
        iv
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      logger.error('Decryption error:', error);
      // If decryption fails, try base64 decoding or return the original
      try {
        return Buffer.from(text, 'base64').toString('utf8');
      } catch (e) {
        return text;
      }
    }
  }
}

// Singleton instance
const apiKeyManager = new ApiKeyManager();

module.exports = apiKeyManager;