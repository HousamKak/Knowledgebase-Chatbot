// config-resolvers.js placeholder
import ConfigManager from '../config/config-manager';

/**
 * Resolvers for configuration operations
 */
export const configResolvers = {
  /**
   * Get current configuration
   */
  get_config: async (req, context) => {
    try {
      const configManager = new ConfigManager(context.storage);
      const config = await configManager.getConfig();
      
      // Don't expose sensitive information
      return {
        success: true,
        config: {
          activeModel: config.activeModel,
          modelSettings: config.modelSettings,
          dataSources: config.dataSources,
          ui: config.ui
        }
      };
    } catch (error) {
      context.logger.error(`Error getting config: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update UI configuration
   */
  update_ui_config: async (req, context) => {
    try {
      const { uiConfig } = req.payload;
      
      if (!uiConfig) {
        return { success: false, error: 'UI config is required' };
      }
      
      const configManager = new ConfigManager(context.storage);
      const success = await configManager.updateConfig({ ui: uiConfig });
      
      return { success };
    } catch (error) {
      context.logger.error(`Error updating UI config: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Reset configuration to defaults
   */
  reset_config: async (req, context) => {
    try {
      const configManager = new ConfigManager(context.storage);
      const defaultConfig = configManager.getDefaultConfig();
      
      // Preserve API keys
      await context.storage.set('app_config', JSON.stringify(defaultConfig));
      
      return { success: true };
    } catch (error) {
      context.logger.error(`Error resetting config: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if initial setup is complete
   */
  check_setup_complete: async (req, context) => {
    try {
      const configManager = new ConfigManager(context.storage);
      const config = await configManager.getConfig();
      
      // Check if active model has API key
      const { activeModel } = config;
      const apiKeyExists = await context.storage.getSecret(`api_key_${activeModel}`);
      
      // Check if at least one data source is configured
      const hasDataSource = config.dataSources.some(source => 
        source.enabled && (source.config.spaceKey || source.config.pageIds?.length > 0)
      );
      
      return { 
        success: true, 
        setupComplete: !!apiKeyExists && hasDataSource,
        missingApiKey: !apiKeyExists,
        missingDataSource: !hasDataSource
      };
    } catch (error) {
      context.logger.error(`Error checking setup: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
};