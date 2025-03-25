// model-factory.js placeholder
import OpenAIAdapter from './providers/openai';
import AnthropicAdapter from './providers/anthropic';

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
    let model;

    switch (type.toLowerCase()) {
      case 'openai':
        model = new OpenAIAdapter();
        break;
      case 'anthropic':
        model = new AnthropicAdapter();
        break;
      default:
        throw new Error(`Unsupported model type: ${type}`);
    }

    await model.initialize(config);
    return model;
  }
}

export default ModelFactory;