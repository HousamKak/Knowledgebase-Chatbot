// config/config-manager.js - Application configuration manager
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Configuration manager to handle app-wide settings
 */
class ConfigManager {
  constructor() {
    this.configDir = process.env.CONFIG_DIR || path.join(__dirname, '../data');
    this.configFile = path.join(this.configDir, 'app_config.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Get the current configuration
   * @returns {Promise<Object>} The current configuration
   */
  async getConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(configData);
      }
      
      // If no config exists, create default and save it
      const defaultConfig = this.getDefaultConfig();
      await this.updateConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      logger.error('Error getting config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Update the configuration
   * @param {Object} newConfig The new configuration to save
   * @returns {Promise<boolean>} Success status
   */
  async updateConfig(newConfig) {
    try {
      const currentConfig = await this.getConfig();
      const mergedConfig = { ...currentConfig, ...newConfig };
      
      // Save to file
      fs.writeFileSync(
        this.configFile,
        JSON.stringify(mergedConfig, null, 2),
        'utf8'
      );
      
      return true;
    } catch (error) {
      logger.error('Error updating config:', error);
      return false;
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      activeModel: 'openai',
      modelSettings: {
        openai: {
          name: 'OpenAI GPT',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1024
        },
        anthropic: {
          name: 'Anthropic Claude',
          model: 'claude-2',
          temperature: 0.7,
          maxTokens: 1024
        }
      },
      dataSources: [],
      embeddings: {
        provider: 'openai',
        modelName: 'text-embedding-ada-002'
      },
      vectorStore: {
        type: 'memory'
      },
      textSplitter: {
        chunkSize: 1000,
        chunkOverlap: 200
      },
      retrieval: {
        k: 5,
        scoreThreshold: 0.5
      },
      ui: {
        theme: 'light',
        chatHistoryLimit: 50
      }
    };
  }

  /**
   * Export configuration to a portable format
   * @returns {Promise<Object>} Exportable configuration
   */
  async exportConfig() {
    const config = await this.getConfig();
    
    // Create a safe export by removing sensitive information
    const exportConfig = { ...config };
    
    // Remove any API keys or sensitive data
    if (exportConfig.apiKeys) {
      delete exportConfig.apiKeys;
    }
    
    return exportConfig;
  }

  /**
   * Import configuration from a file
   * @param {Object} importData Imported configuration data
   * @returns {Promise<boolean>} Success status
   */
  async importConfig(importData) {
    try {
      // Validate import data
      if (!importData || typeof importData !== 'object') {
        throw new Error('Invalid import data');
      }
      
      // Merge with existing config
      const currentConfig = await this.getConfig();
      
      // Don't import sensitive data
      if (importData.apiKeys) {
        delete importData.apiKeys;
      }
      
      // Update config
      await this.updateConfig({
        ...currentConfig,
        ...importData
      });
      
      return true;
    } catch (error) {
      logger.error('Error importing config:', error);
      return false;
    }
  }
}

// Singleton instance
const configManager = new ConfigManager();

module.exports = configManager;