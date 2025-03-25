// knowledge/langchain/embeddings.js - Embeddings factory
const { OpenAIEmbeddings } = require("@langchain/openai");
const { TfIdfVectorizer } = require("@langchain/community/embeddings/tfid");
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * Factory for creating embedding models
 */
class EmbeddingsFactory {
  /**
   * Create an embeddings provider based on configuration
   * @param {Object} config Embeddings configuration
   * @param {Object} apiKeys API keys for various services
   * @returns {Embeddings} LangChain embeddings provider
   */
  static createEmbeddings(config, apiKeys) {
    const provider = config.provider || 'openai';
    
    logger.debug(`Creating embeddings provider: ${provider}`);
    
    switch (provider) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new ApiError('OpenAI API key is required for OpenAI embeddings', 400);
        }
        
        return new OpenAIEmbeddings({
          openAIApiKey: apiKeys.openai,
          modelName: config.modelName || 'text-embedding-ada-002',
          batchSize: config.batchSize || 512,  // Process in batches to avoid rate limits
          maxConcurrency: config.maxConcurrency || 5  // Limit concurrent requests
        });
      
      case 'tfidf':
        // TF-IDF is a local option that doesn't require API keys
        return new TfIdfVectorizer();
      
      // Add more providers as needed
      
      default:
        throw new ApiError(`Unsupported embeddings provider: ${provider}`, 400);
    }
  }
  
  /**
   * Get available embedding providers
   * @returns {Array<Object>} Array of available embedding providers
   */
  static getAvailableProviders() {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI embeddings API (requires API key)',
        requiresApiKey: true,
        defaultModel: 'text-embedding-ada-002',
        availableModels: [
          { id: 'text-embedding-ada-002', name: 'Ada 002', dimensions: 1536 }
        ]
      },
      {
        id: 'tfidf',
        name: 'TF-IDF',
        description: 'Term Frequency-Inverse Document Frequency (local, no API key required)',
        requiresApiKey: false
      }
    ];
  }
}

module.exports = {
  EmbeddingsFactory
};