// models/model-factory.js - Factory for creating model adapters
const OpenAIAdapter = require('./providers/openai');
const AnthropicAdapter = require('./providers/anthropic');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/error-types');

/**
 * Factory for creating model adapters
 */
class ModelFactory {
  /**
   * Create a model adapter instance
   * @param {string} type The type of model to create
   * @param {Object} config Configuration for the model
   * @returns {Promise<ModelInterface>} The created model adapter
   */
  static async createModel(type, config) {
    logger.debug(`Creating model of type: ${type}`);
    
    let model;

    switch (type.toLowerCase()) {
      case 'openai':
        model = new OpenAIAdapter();
        break;
      case 'anthropic':
        model = new AnthropicAdapter();
        break;
      default:
        throw new NotFoundError(`Unsupported model type: ${type}`);
    }

    await model.initialize(config);
    return model;
  }
  
  /**
   * Get available model types
   * @returns {Array<Object>} Array of available model types
   */
  static getAvailableModelTypes() {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI GPT models including GPT-3.5 and GPT-4',
        defaultModel: 'gpt-3.5-turbo',
        availableModels: [
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
        ],
        icon: 'openai'
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Anthropic Claude models including Claude 2 and Claude Instant',
        defaultModel: 'claude-2',
        availableModels: [
          { id: 'claude-2', name: 'Claude 2' },
          { id: 'claude-instant-1', name: 'Claude Instant' },
          { id: 'claude-3-opus', name: 'Claude 3 Opus' },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
        ],
        icon: 'anthropic'
      }
    ];
  }
}

module.exports = ModelFactory;