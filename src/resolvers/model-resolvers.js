// model-resolvers.js placeholder
import ModelFactory from '../models/model-factory';
import ApiKeyManager from '../config/api-key-manager';
import ConfigManager from '../config/config-manager';

/**
 * Resolvers for model-related operations
 */
export const modelResolvers = {
  /**
   * List available models
   */
  list_models: async (req, context) => {
    try {
      const configManager = new ConfigManager(context.storage);
      const config = await configManager.getConfig();
      
      return {
        success: true,
        models: Object.keys(config.modelSettings).map(modelType => ({
          id: modelType,
          name: modelType.charAt(0).toUpperCase() + modelType.slice(1),
          active: modelType === config.activeModel,
          ...config.modelSettings[modelType]
        }))
      };
    } catch (error) {
      context.logger.error(`Error listing models: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set active model
   */
  set_active_model: async (req, context) => {
    try {
      const { modelType } = req.payload;
      
      if (!modelType) {
        return { success: false, error: 'Model type is required' };
      }
      
      const configManager = new ConfigManager(context.storage);
      const success = await configManager.updateConfig({ activeModel: modelType });
      
      return { success };
    } catch (error) {
      context.logger.error(`Error setting active model: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update model settings
   */
  update_model_settings: async (req, context) => {
    try {
      const { modelType, settings } = req.payload;
      
      if (!modelType || !settings) {
        return { success: false, error: 'Model type and settings are required' };
      }
      
      const configManager = new ConfigManager(context.storage);
      const config = await configManager.getConfig();
      
      // Update model settings
      config.modelSettings[modelType] = {
        ...config.modelSettings[modelType],
        ...settings
      };
      
      const success = await configManager.updateConfig({ modelSettings: config.modelSettings });
      
      return { success };
    } catch (error) {
      context.logger.error(`Error updating model settings: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Store model API key
   */
  store_model_api_key: async (req, context) => {
    try {
      const { modelType, apiKey } = req.payload;
      
      if (!modelType || !apiKey) {
        return { success: false, error: 'Model type and API key are required' };
      }
      
      const keyManager = new ApiKeyManager(context.storage);
      const success = await keyManager.storeApiKey(modelType, apiKey);
      
      return { success };
    } catch (error) {
      context.logger.error(`Error storing model API key: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete model API key
   */
  delete_model_api_key: async (req, context) => {
    try {
      const { modelType } = req.payload;
      
      if (!modelType) {
        return { success: false, error: 'Model type is required' };
      }
      
      const keyManager = new ApiKeyManager(context.storage);
      const success = await keyManager.deleteApiKey(modelType);
      
      return { success };
    } catch (error) {
      context.logger.error(`Error deleting model API key: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if model API key exists
   */
  check_model_api_key: async (req, context) => {
    try {
      const { modelType } = req.payload;
      
      if (!modelType) {
        return { success: false, error: 'Model type is required' };
      }
      
      const keyManager = new ApiKeyManager(context.storage);
      const hasKey = await keyManager.hasApiKey(modelType);
      
      return { success: true, hasKey };
    } catch (error) {
      context.logger.error(`Error checking model API key: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
};