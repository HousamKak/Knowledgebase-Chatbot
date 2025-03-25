import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { RetrievalQAChain, StuffDocumentsChain, LLMChain } from "@langchain/core/chains";
import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Factory for creating RAG chains with different models
 */
export class RAGChainFactory {
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
      combineDocumentsChain: documentChain
    });
  }
  
  /**
   * Create an LLM based on provider and model
   * @param {string} provider Provider name
   * @param {string} model Model name
   * @param {Object} apiKeys API keys
   * @returns {BaseLLM} LangChain LLM
   */
  static createLLM(provider, model, apiKeys) {
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: apiKeys.openai,
          modelName: model || 'gpt-3.5-turbo',
          temperature: 0.2 // Lower temperature for more factual responses
        });
      
      case 'anthropic':
        return new ChatAnthropic({
          anthropicApiKey: apiKeys.anthropic,
          modelName: model || 'claude-2',
          temperature: 0.2
        });
      
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}