// knowledge/langchain/chains.js - RAG chains factory
const { OpenAI, ChatOpenAI } = require("@langchain/openai");
const { Anthropic } = require("@langchain/anthropic");
const { RetrievalQAChain, StuffDocumentsChain, LLMChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const logger = require('../../utils/logger');
const { ApiError } = require('../../utils/error-types');

/**
 * Factory for creating RAG chains with different models
 */
class RAGChainFactory {
  /**
   * Create a RAG chain based on configuration
   * @param {Object} config Chain configuration
   * @param {VectorStore} vectorStore Vector store for retrieval
   * @param {Object} apiKeys API keys for various services
   * @returns {RetrievalQAChain} LangChain RAG chain
   */
  static createChain(config, vectorStore, apiKeys) {
    // Create the language model
    const llm = this.createLLM(config.modelProvider, config.modelName, apiKeys);
    
    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(
      `You are a knowledgeable assistant that answers questions based on the provided information.
      Answer the question based ONLY on the following context. If you cannot answer from the context,
      say "I don't have enough information to answer that question."
      
      CONTEXT:
      {context}
      
      QUESTION: {question}
      
      ANSWER:`
    );
    
    // Create document chain
    const documentChain = new StuffDocumentsChain({
      llmChain: new LLMChain({ llm, prompt }),
      documentVariableName: "context"
    });
    
    // Create retrieval chain
    return new RetrievalQAChain({
      retriever: vectorStore.asRetriever(config.retrievalConfig),
      combineDocumentsChain: documentChain,
      returnSourceDocuments: true
    });
  }
  
  /**
   * Stream response using RAG
   * @param {string} question The question to answer
   * @param {Array} documents Retrieved documents
   * @param {function} callback Callback for streaming
   * @param {Object} options Options for the query
   * @returns {Promise<void>}
   */
  static async streamResponse(question, documents, callback, options = {}) {
    // Implement streaming by:
    // 1. Combining documents into context
    // 2. Creating prompt
    // 3. Using streaming from the LLM adapter
    
    // Not implemented in this template, but you would need to:
    // - Format the documents into context
    // - Create a prompt with the context and question
    // - Use the model's streaming capability directly
    throw new ApiError('Streaming not implemented yet', 501);
  }
  
  /**
   * Create an LLM based on provider and model
   * @param {string} provider Provider name
   * @param {string} model Model name
   * @param {Object} apiKeys API keys
   * @returns {BaseLLM} LangChain LLM
   */
  static createLLM(provider, model, apiKeys) {
    logger.debug(`Creating LLM for provider: ${provider}, model: ${model || 'default'}`);
    
    switch (provider) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new ApiError('OpenAI API key is required', 400);
        }
        
        return new ChatOpenAI({
          openAIApiKey: apiKeys.openai,
          modelName: model || 'gpt-3.5-turbo',
          temperature: 0.2, // Lower temperature for more factual responses
          maxTokens: 1024
        });
      
      case 'anthropic':
        if (!apiKeys.anthropic) {
          throw new ApiError('Anthropic API key is required', 400);
        }
        
        return new Anthropic({
          anthropicApiKey: apiKeys.anthropic,
          modelName: model || 'claude-2',
          temperature: 0.2
        });
      
      default:
        throw new ApiError(`Unsupported LLM provider: ${provider}`, 400);
    }
  }
}

module.exports = {
  RAGChainFactory
};