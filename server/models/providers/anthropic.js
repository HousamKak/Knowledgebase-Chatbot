// models/providers/anthropic.js - Anthropic Claude model adapter
const { Anthropic } = require('@anthropic-ai/sdk');
const ModelInterface = require('../model-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * Anthropic Claude model adapter
 */
class AnthropicAdapter extends ModelInterface {
  /**
   * Initialize the Anthropic model
   * @param {Object} config Configuration for Anthropic
   */
  async initialize(config) {
    this.apiKey = config.apiKey;
    
    if (!this.apiKey) {
      throw new ApiError('Anthropic API key is required', 400);
    }
    
    this.model = config.model || 'claude-2';
    this.temperature = config.temperature !== undefined ? config.temperature : 0.7;
    this.maxTokens = config.maxTokens || 1024;
    
    // Initialize the Anthropic client
    this.client = new Anthropic({
      apiKey: this.apiKey
    });
    
    // Test connection by checking models list (there's no dedicated endpoint)
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      logger.debug('Successfully connected to Anthropic API');
    } catch (error) {
      logger.error('Error connecting to Anthropic API:', error);
      throw new ApiError(`Failed to connect to Anthropic API: ${error.message}`, 500);
    }
  }

  /**
   * Send a query to Anthropic Claude
   * @param {string} prompt The prompt to send
   * @param {Object} options Additional options
   * @returns {Promise<Object>} The model's response
   */
  async query(prompt, options = {}) {
    try {
      logger.debug(`Querying Anthropic with model: ${this.model}`);
      
      // Format system prompt if provided
      const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
      
      // Format messages
      let messages = [];
      if (options.messages) {
        messages = options.messages;
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      
      const requestBody = {
        model: options.model || this.model,
        messages: messages,
        system: systemPrompt,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature
      };

      const response = await this.client.messages.create(requestBody);

      return {
        text: response.content[0].text,
        raw: response
      };
    } catch (error) {
      logger.error('Error calling Anthropic:', error);
      throw new ApiError(`Anthropic API error: ${error.message}`, 500);
    }
  }

  /**
   * Stream a response from Anthropic Claude
   * @param {string} prompt The prompt to send
   * @param {function} callback Callback function for each chunk
   * @param {Object} options Additional options
   * @returns {Promise<void>}
   */
  async streamResponse(prompt, callback, options = {}) {
    try {
      logger.debug(`Streaming from Anthropic with model: ${this.model}`);
      
      // Format system prompt if provided
      const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
      
      // Format messages
      let messages = [];
      if (options.messages) {
        messages = options.messages;
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      
      const requestBody = {
        model: options.model || this.model,
        messages: messages,
        system: systemPrompt,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        stream: true
      };

      const stream = await this.client.messages.create(requestBody);

      let text = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          const content = chunk.delta.text;
          text += content;
          
          callback({
            type: 'content',
            content,
            text
          });
        }
      }
      
      // Final callback with complete text
      callback({
        type: 'done',
        text
      });
    } catch (error) {
      logger.error('Error streaming from Anthropic:', error);
      callback({
        type: 'error',
        error: error.message
      });
      throw new ApiError(`Anthropic API error: ${error.message}`, 500);
    }
  }

  /**
   * Get Anthropic model capabilities
   * @returns {Object} Model capabilities
   */
  getCapabilities() {
    const modelCapabilities = {
      'claude-2': {
        maxTokens: 100000,
        supportsStreaming: true,
        supportsFunctions: false,
        supportsVision: false
      },
      'claude-instant-1': {
        maxTokens: 100000,
        supportsStreaming: true,
        supportsFunctions: false,
        supportsVision: false
      },
      'claude-3-opus': {
        maxTokens: 200000,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true
      },
      'claude-3-sonnet': {
        maxTokens: 200000,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true
      }
    };

    return modelCapabilities[this.model] || {
      maxTokens: 100000,
      supportsStreaming: true,
      supportsFunctions: false,
      supportsVision: false
    };
  }
  
  /**
   * Get the name of the model
   * @returns {string} The name of the model
   */
  getModelName() {
    return this.model;
  }
}

module.exports = AnthropicAdapter;