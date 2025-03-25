// services/model-service.js - Model-related services
const ModelFactory = require('../models/model-factory');
const configManager = require('../config/config-manager');
const apiKeyManager = require('../config/api-key-manager');
const logger = require('../utils/logger');
const { ApiError, NotFoundError } = require('../utils/error-types');

/**
 * Service for model-related operations
 */
class ModelService {
  /**
   * List available models
   * @returns {Promise<Array>} List of models
   */
  async listModels() {
    try {
      const config = await configManager.getConfig();
      const activeModel = config.activeModel || 'openai';
      
      // Get available model types
      const modelTypes = ModelFactory.getAvailableModelTypes();
      
      // Check which ones have API keys
      const models = [];
      
      for (const modelType of modelTypes) {
        const hasApiKey = await apiKeyManager.hasApiKey(modelType.id);
        
        // Add to models list
        models.push({
          id: modelType.id,
          name: modelType.name,
          description: modelType.description,
          active: modelType.id === activeModel,
          hasApiKey,
          defaultModel: modelType.defaultModel,
          availableModels: modelType.availableModels || [],
          ...config.modelSettings[modelType.id]
        });
      }
      
      return models;
    } catch (error) {
      logger.error('Error listing models:', error);
      throw new ApiError(`Failed to list models: ${error.message}`, 500);
    }
  }
  
  /**
   * Get model by ID
   * @param {string} id Model ID
   * @returns {Promise<Object>} Model details
   */
  async getModelById(id) {
    try {
      const models = await this.listModels();
      const model = models.find(m => m.id === id);
      
      if (!model) {
        throw new NotFoundError(`Model not found: ${id}`);
      }
      
      return model;
    } catch (error) {
      logger.error(`Error getting model ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Set active model
   * @param {string} modelType Model type
   * @returns {Promise<boolean>} Success status
   */
  async setActiveModel(modelType) {
    try {
      // Check if model exists
      const models = await this.listModels();
      const model = models.find(m => m.id === modelType);
      
      if (!model) {
        throw new NotFoundError(`Model not found: ${modelType}`);
      }
      
      // Check if model has API key
      if (!model.hasApiKey) {
        throw new ApiError(`Model ${modelType} requires an API key`, 400);
      }
      
      // Update config
      await configManager.updateConfig({ activeModel: modelType });
      return true;
    } catch (error) {
      logger.error(`Error setting active model ${modelType}:`, error);
      throw error;
    }
  }
  
  /**
   * Update model settings
   * @param {string} modelType Model type
   * @param {Object} settings Settings to update
   * @returns {Promise<boolean>} Success status
   */
  async updateModelSettings(modelType, settings) {
    try {
      // Check if model exists
      const models = await this.listModels();
      const model = models.find(m => m.id === modelType);
      
      if (!model) {
        throw new NotFoundError(`Model not found: ${modelType}`);
      }
      
      // Get current config
      const config = await configManager.getConfig();
      
      // Update model settings
      config.modelSettings[modelType] = {
        ...config.modelSettings[modelType],
        ...settings
      };
      
      // Update config
      await configManager.updateConfig({ modelSettings: config.modelSettings });
      return true;
    } catch (error) {
      logger.error(`Error updating model settings for ${modelType}:`, error);
      throw error;
    }
  }
  
  /**
   * Store model API key
   * @param {string} modelType Model type
   * @param {string} apiKey API key
   * @returns {Promise<boolean>} Success status
   */
  async storeModelApiKey(modelType, apiKey) {
    try {
      // Check if model exists
      const modelTypes = ModelFactory.getAvailableModelTypes();
      const model = modelTypes.find(m => m.id === modelType);
      
      if (!model) {
        throw new NotFoundError(`Model not found: ${modelType}`);
      }
      
      // Store API key
      await apiKeyManager.storeApiKey(modelType, apiKey);
      return true;
    } catch (error) {
      logger.error(`Error storing API key for ${modelType}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete model API key
   * @param {string} modelType Model type
   * @returns {Promise<boolean>} Success status
   */
  async deleteModelApiKey(modelType) {
    try {
      // Check if model is active
      const config = await configManager.getConfig();
      if (config.activeModel === modelType) {
        throw new ApiError(`Cannot delete API key for active model: ${modelType}`, 400);
      }
      
      // Delete API key
      await apiKeyManager.deleteApiKey(modelType);
      return true;
    } catch (error) {
      logger.error(`Error deleting API key for ${modelType}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if model has API key
   * @param {string} modelType Model type
   * @returns {Promise<boolean>} Whether model has API key
   */
  async hasModelApiKey(modelType) {
    try {
      return await apiKeyManager.hasApiKey(modelType);
    } catch (error) {
      logger.error(`Error checking API key for ${modelType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get model instance
   * @param {string} modelType Model type
   * @param {Object} options Model options
   * @returns {Promise<ModelInterface>} Model instance
   */
  async getModelInstance(modelType, options = {}) {
    try {
      // Get model type (or use active model)
      const config = await configManager.getConfig();
      const type = modelType || config.activeModel;
      
      if (!type) {
        throw new ApiError('No model type specified and no active model set', 400);
      }
      
      // Get API key
      const apiKey = await apiKeyManager.getApiKey(type);
      
      if (!apiKey) {
        throw new ApiError(`No API key found for model: ${type}`, 400);
      }
      
      // Get model settings from config
      const modelSettings = config.modelSettings[type] || {};
      
      // Create model instance
      const model = await ModelFactory.createModel(type, {
        apiKey,
        ...modelSettings,
        ...options
      });
      
      return model;
    } catch (error) {
      logger.error(`Error getting model instance for ${modelType}:`, error);
      throw error;
    }
  }
}

module.exports = new ModelService();