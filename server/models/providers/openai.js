// models/providers/openai.js - OpenAI model adapter
const { OpenAI } = require('openai');
const ModelInterface = require('../model-interface');
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * OpenAI model adapter
 */
class OpenAIAdapter extends ModelInterface {
  /**
   * Initialize the OpenAI model
   * @param {Object} config Configuration for OpenAI
   */
  async initialize(config) {
    this.apiKey = config.apiKey;
    
    if (!this.apiKey) {
      throw new ApiError('OpenAI API key is required', 400);
    }
    
    this.model = config.model || 'gpt-3.5-turbo';
    this.temperature = config.temperature !== undefined ? config.temperature : 0.7;
    this.maxTokens = config.maxTokens || 1024;
    
    // Initialize the OpenAI client
    this.client = new OpenAI({
      apiKey: this.apiKey
    });
    
    // Test connection
    try {
      await this.client.models.list();
      logger.debug('Successfully connected to OpenAI API');
    } catch (error) {
      logger.error('Error connecting to OpenAI API:', error);
      throw new ApiError(`Failed to connect to OpenAI API: ${error.message}`, 500);
    }
  }

  /**
   * Send a query to OpenAI
   * @param {string} prompt The prompt to send
   * @param {Object} options Additional options
   * @returns {Promise<Object>} The model's response
   */
  async query(prompt, options = {}) {
    try {
      logger.debug(`Querying OpenAI with model: ${this.model}`);
      
      const messages = options.messages || [
        { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ];

      const requestBody = {
        model: options.model || this.model,
        messages: messages,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
      };
      
      // Add functions if provided
      if (options.functions) {
        requestBody.functions = options.functions;
        
        if (options.functionCall) {
          requestBody.function_call = options.functionCall;
        }
      }

      const response = await this.client.chat.completions.create(requestBody);

      return {
        text: response.choices[0].message.content,
        functionCall: response.choices[0].message.function_call,
        raw: response
      };
    } catch (error) {
      logger.error('Error calling OpenAI:', error);
      throw new ApiError(`OpenAI API error: ${error.message}`, 500);
    }
  }

  /**
   * Stream a response from OpenAI
   * @param {string} prompt The prompt to send
   * @param {function} callback Callback function for each chunk
   * @param {Object} options Additional options
   * @returns {Promise<void>}
   */
  async streamResponse(prompt, callback, options = {}) {
    try {
      logger.debug(`Streaming from OpenAI with model: ${this.model}`);
      
      const messages = options.messages || [
        { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ];

      const requestBody = {
        model: options.model || this.model,
        messages: messages,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        stream: true
      };
      
      // Add functions if provided
      if (options.functions) {
        requestBody.functions = options.functions;
        
        if (options.functionCall) {
          requestBody.function_call = options.functionCall;
        }
      }

      const stream = await this.client.chat.completions.create(requestBody);
      
      let text = '';
      let functionCall = null;

      for await (const chunk of stream) {
        // Process function call if present
        if (chunk.choices[0]?.delta?.function_call) {
          if (!functionCall) {
            functionCall = {
              name: '',
              arguments: ''
            };
          }
          
          if (chunk.choices[0].delta.function_call.name) {
            functionCall.name += chunk.choices[0].delta.function_call.name;
          }
          
          if (chunk.choices[0].delta.function_call.arguments) {
            functionCall.arguments += chunk.choices[0].delta.function_call.arguments;
          }
          
          callback({
            type: 'function_call',
            functionCall
          });
        } 
        // Process text content
        else if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
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
        text,
        functionCall
      });
    } catch (error) {
      logger.error('Error streaming from OpenAI:', error);
      callback({
        type: 'error',
        error: error.message
      });
      throw new ApiError(`OpenAI API error: ${error.message}`, 500);
    }
  }

  /**
   * Get OpenAI model capabilities
   * @returns {Object} Model capabilities
   */
  getCapabilities() {
    const modelCapabilities = {
      'gpt-3.5-turbo': {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false
      },
      'gpt-4': {
        maxTokens: 8192,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false
      },
      'gpt-4-turbo': {
        maxTokens: 128000,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true
      }
    };

    return modelCapabilities[this.model] || {
      maxTokens: 4096,
      supportsStreaming: true,
      supportsFunctions: true,
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

module.exports = OpenAIAdapter;