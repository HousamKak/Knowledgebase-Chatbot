// services/config-service.js - Configuration-related services
const configManager = require('../config/config-manager');
const apiKeyManager = require('../config/api-key-manager');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/error-types');

/**
 * Service for configuration-related operations
 */
class ConfigService {
  /**
   * Get current configuration
   * @returns {Promise<Object>} Current configuration
   */
  async getConfig() {
    try {
      return await configManager.getConfig();
    } catch (error) {
      logger.error('Error getting config:', error);
      throw new ApiError(`Failed to get configuration: ${error.message}`, 500);
    }
  }
  
  /**
   * Update UI configuration
   * @param {Object} uiConfig UI configuration updates
   * @returns {Promise<boolean>} Success status
   */
  async updateUiConfig(uiConfig) {
    try {
      if (!uiConfig) {
        throw new ApiError('UI config is required', 400);
      }
      
      await configManager.updateConfig({ ui: uiConfig });
      return true;
    } catch (error) {
      logger.error('Error updating UI config:', error);
      throw error;
    }
  }
  
  /**
   * Reset configuration to defaults
   * @returns {Promise<boolean>} Success status
   */
  async resetConfig() {
    try {
      const defaultConfig = configManager.getDefaultConfig();
      await configManager.updateConfig(defaultConfig);
      return true;
    } catch (error) {
      logger.error('Error resetting config:', error);
      throw new ApiError(`Failed to reset configuration: ${error.message}`, 500);
    }
  }
  
  /**
   * Check if initial setup is complete
   * @returns {Promise<Object>} Setup status
   */
  async checkSetupComplete() {
    try {
      const config = await configManager.getConfig();
      
      // Check if active model has API key
      const activeModel = config.activeModel || 'openai';
      const apiKeyExists = await apiKeyManager.hasApiKey(activeModel);
      
      // Check if at least one data source is configured
      const hasDataSource = Array.isArray(config.dataSources) && 
        config.dataSources.some(source => source.enabled);
      
      return {
        setupComplete: apiKeyExists && hasDataSource,
        missingApiKey: !apiKeyExists,
        missingDataSource: !hasDataSource
      };
    } catch (error) {
      logger.error('Error checking setup status:', error);
      throw new ApiError(`Failed to check setup status: ${error.message}`, 500);
    }
  }
  
  /**
   * Export configuration
   * @returns {Promise<Object>} Exportable configuration
   */
  async exportConfig() {
    try {
      return await configManager.exportConfig();
    } catch (error) {
      logger.error('Error exporting config:', error);
      throw new ApiError(`Failed to export configuration: ${error.message}`, 500);
    }
  }
  
  /**
   * Import configuration
   * @param {Object} configData Configuration data to import
   * @returns {Promise<boolean>} Success status
   */
  async importConfig(configData) {
    try {
      if (!configData) {
        throw new ApiError('Configuration data is required', 400);
      }
      
      await configManager.importConfig(configData);
      return true;
    } catch (error) {
      logger.error('Error importing config:', error);
      throw error;
    }
  }
}

module.exports = new ConfigService();