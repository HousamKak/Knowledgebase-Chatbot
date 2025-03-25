// knowledge/knowledge-manager.js - Knowledge management using LangChain
const { DataSourceAdapter } = require('./langchain/document-loaders');
const { TextSplitterFactory } = require('./langchain/text-splitters');
const { EmbeddingsFactory } = require('./langchain/embeddings');
const { VectorStoreFactory } = require('./langchain/vector-stores');
const { RAGChainFactory } = require('./langchain/chains');
const apiKeyManager = require('../config/api-key-manager');
const configManager = require('../config/config-manager');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/error-types');

/**
 * Knowledge manager using LangChain for RAG
 */
class KnowledgeManager {
  /**
   * Create a knowledge manager
   */
  constructor() {
    this.vectorStore = null;
    this.ragChain = null;
    this.textSplitter = null;
    this.embeddings = null;
    this.initialized = false;
  }

  /**
   * Initialize the knowledge manager
   * @param {Object} config Configuration
   */
  async initialize(config = {}) {
    try {
      logger.info('Initializing knowledge manager with LangChain');

      // Get application config
      const appConfig = await configManager.getConfig();
      
      // Merge with provided config
      const mergedConfig = {
        modelProvider: config.modelProvider || appConfig.activeModel,
        embeddings: config.embeddings || appConfig.embeddings,
        vectorStore: config.vectorStore || appConfig.vectorStore,
        textSplitter: config.textSplitter || appConfig.textSplitter,
        retrieval: config.retrieval || appConfig.retrieval,
        chain: {
          modelProvider: config.modelProvider || appConfig.activeModel,
          modelName: null, // Will be determined by the model provider
          retrievalConfig: config.retrieval || appConfig.retrieval
        }
      };

      // Get API keys
      const apiKeys = {
        openai: await apiKeyManager.getApiKey('openai'),
        anthropic: await apiKeyManager.getApiKey('anthropic')
      };

      // Create embeddings
      this.embeddings = EmbeddingsFactory.createEmbeddings(
        mergedConfig.embeddings || { provider: 'openai' },
        apiKeys
      );

      // Create vector store
      this.vectorStore = await VectorStoreFactory.createVectorStore(
        mergedConfig.vectorStore || { type: 'memory' },
        this.embeddings
      );

      // Initialize vector store if needed
      if (typeof this.vectorStore.initialize === 'function') {
        await this.vectorStore.initialize();
      }

      // Create text splitter
      this.textSplitter = TextSplitterFactory.createSplitter(
        mergedConfig.textSplitter || {}
      );

      // Create RAG chain
      this.ragChain = RAGChainFactory.createChain(
        mergedConfig.chain,
        this.vectorStore,
        apiKeys
      );

      this.initialized = true;
      logger.info('Knowledge manager initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Error initializing knowledge manager: ${error.message}`);
      throw new ApiError(`Failed to initialize knowledge manager: ${error.message}`, 500);
    }
  }

  /**
   * Add documents to the knowledge base
   * @param {Array} documents Array of documents
   * @param {string} source Source identifier
   * @returns {Promise<boolean>} Success status
   */
  async addDocuments(documents, source) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(`Adding ${documents.length} documents from ${source}`);

      // Convert to LangChain documents
      const lcDocs = DataSourceAdapter.convertToLangChainDocuments(
        documents.map(doc => ({ 
          ...doc, 
          metadata: {
            ...doc.metadata,
            source
          }
        }))
      );

      // Split documents into chunks
      const splitDocs = await this.textSplitter.splitDocuments(lcDocs);

      logger.info(`Split into ${splitDocs.length} chunks`);

      // Add to vector store
      await this.vectorStore.addDocuments(splitDocs);

      logger.info(`Successfully added ${splitDocs.length} document chunks to knowledge base`);
      return true;
    } catch (error) {
      logger.error(`Error adding documents: ${error.message}`);
      throw new ApiError(`Failed to add documents: ${error.message}`, 500);
    }
  }

  /**
   * Answer a question using RAG
   * @param {string} question Question to answer
   * @param {Object} options Options for the query
   * @returns {Promise<Object>} Answer and sources
   */
  async answerQuestion(question, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(`Answering question: ${question}`);

      // Get answer from RAG chain
      const result = await this.ragChain.call({ 
        query: question,
        ...options
      });

      // Get source documents
      const sourceDocuments = result.sourceDocuments || [];

      // Format sources
      const sources = sourceDocuments.map(doc => ({
        title: doc.metadata.title || 'Unknown Source',
        id: doc.metadata.id || '',
        url: doc.metadata.url || '#',
        source: doc.metadata.source || 'unknown',
        score: doc.metadata.score || 1.0,
        // Extract a relevant snippet
        snippet: doc.pageContent.length > 200
          ? doc.pageContent.substring(0, 200) + '...'
          : doc.pageContent
      }));

      return {
        answer: result.text,
        sources,
        rawSources: sourceDocuments
      };
    } catch (error) {
      logger.error(`Error answering question: ${error.message}`);
      throw new ApiError(`Failed to answer question: ${error.message}`, 500);
    }
  }

  /**
   * Stream an answer using RAG
   * @param {string} question Question to answer
   * @param {function} callback Callback function for streaming
   * @param {Object} options Options for the query
   * @returns {Promise<void>}
   */
  async streamAnswer(question, callback, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(`Streaming answer for question: ${question}`);

      // First, retrieve relevant documents
      const relevantDocs = await this.vectorStore.similaritySearch(
        question,
        options.retrievalConfig?.k || 5
      );

      // Format sources
      const sources = relevantDocs.map(doc => ({
        title: doc.metadata.title || 'Unknown Source',
        id: doc.metadata.id || '',
        url: doc.metadata.url || '#',
        source: doc.metadata.source || 'unknown',
        score: doc.metadata.score || 1.0,
        snippet: doc.pageContent.length > 200
          ? doc.pageContent.substring(0, 200) + '...'
          : doc.pageContent
      }));

      // Send sources first
      callback({
        type: 'sources',
        sources
      });

      // Stream the answer
      await this.ragChain.streamResponse(
        question, 
        relevantDocs, 
        chunk => callback({
          type: 'content',
          ...chunk
        }),
        options
      );

      // Final callback
      callback({
        type: 'done'
      });
    } catch (error) {
      logger.error(`Error streaming answer: ${error.message}`);
      callback({
        type: 'error',
        error: error.message
      });
      throw new ApiError(`Failed to stream answer: ${error.message}`, 500);
    }
  }

  /**
   * Clear documents from a specific source
   * @param {string} source Source identifier
   * @returns {Promise<boolean>} Success status
   */
  async clearSourceDocuments(source) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(`Clearing documents from source: ${source}`);

      // Use the deleteDocumentsBySource method if available
      if (this.vectorStore && typeof this.vectorStore.deleteDocumentsBySource === 'function') {
        await this.vectorStore.deleteDocumentsBySource(source);
        logger.info(`Successfully cleared documents from source: ${source}`);
        return true;
      } else {
        logger.warn(`Current vector store does not support clearing by source: ${source}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error clearing source documents: ${error.message}`);
      throw new ApiError(`Failed to clear source documents: ${error.message}`, 500);
    }
  }

  /**
   * Get statistics about the knowledge base
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const stats = {
        documentCount: 0,
        sourceCount: 0,
        sources: {},
        lastUpdated: new Date().toISOString()
      };

      // Get document count from vector store
      if (this.vectorStore && this.vectorStore.memoryVectors) {
        stats.documentCount = this.vectorStore.memoryVectors.length;

        // Count sources
        const sources = new Set();
        this.vectorStore.memoryVectors.forEach(vector => {
          if (vector.metadata && vector.metadata.source) {
            sources.add(vector.metadata.source);
            
            // Count documents per source
            if (!stats.sources[vector.metadata.source]) {
              stats.sources[vector.metadata.source] = 0;
            }
            stats.sources[vector.metadata.source]++;
          }
        });

        stats.sourceCount = sources.size;
      }

      return stats;
    } catch (error) {
      logger.error(`Error getting knowledge stats: ${error.message}`);
      throw new ApiError(`Failed to get knowledge stats: ${error.message}`, 500);
    }
  }
}

// Singleton instance
const knowledgeManager = new KnowledgeManager();

module.exports = knowledgeManager;