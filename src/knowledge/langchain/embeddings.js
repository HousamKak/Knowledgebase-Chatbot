import { OpenAIEmbeddings } from "@langchain/openai";
import { TfIdfVectorizer } from "@langchain/community/embeddings/tfid";

/**
 * Factory for creating embedding models
 */
export class EmbeddingsFactory {
  /**
   * Create an embeddings provider based on configuration
   * @param {Object} config Embeddings configuration
   * @param {Object} apiKeys API keys for various services
   * @returns {Embeddings} LangChain embeddings provider
   */
  static createEmbeddings(config, apiKeys) {
    const provider = config.provider || 'openai';
    
    switch (provider) {
      case 'openai':
        return new OpenAIEmbeddings({
          openAIApiKey: apiKeys.openai,
          modelName: config.modelName || 'text-embedding-ada-002',
          batchSize: 512  // Process in batches to avoid rate limits
        });
      
      case 'tfidf':
        return new TfIdfVectorizer();
      
      // Add more providers as needed
      
      default:
        throw new Error(`Unsupported embeddings provider: ${provider}`);
    }
  }
}