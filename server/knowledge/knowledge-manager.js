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
    this.initializationError = null;
    this.lastInitAttempt = null;
  }

  /**
   * Initialize the knowledge manager
   * @param {Object} config Configuration
   */
  async initialize(config = {}) {
    try {
      logger.info('Initializing knowledge manager with LangChain');

      // If already initialized, return early
      if (this.initialized) {
        logger.debug('Knowledge manager already initialized');
        return true;
      }
      
      // Throttle initialization attempts (prevent rapid re-init)
      const now = Date.now();
      if (this.lastInitAttempt && (now - this.lastInitAttempt < 5000)) {
        logger.warn('Initialization attempted too frequently, skipping');
        return this.initialized;
      }
      this.lastInitAttempt = now;

      let initSuccess = true;

      try {
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

        // Create embeddings with fallback
        try {
          this.embeddings = EmbeddingsFactory.createEmbeddings(
            mergedConfig.embeddings || { provider: 'openai' },
            apiKeys
          );
          logger.debug('Embeddings initialized successfully');
        } catch (error) {
          logger.error(`Failed to create embeddings: ${error.message}`);
          initSuccess = false;
          // Fall back to TF-IDF if available
          try {
            this.embeddings = EmbeddingsFactory.createEmbeddings(
              { provider: 'tfidf' },
              {}
            );
            logger.warn('Falling back to TF-IDF embeddings');
          } catch (fallbackError) {
            logger.error(`Failed to create fallback embeddings: ${fallbackError.message}`);
            throw new Error('Could not initialize embeddings, even with fallback');
          }
        }

        // Create vector store with fallback
        try {
          this.vectorStore = await VectorStoreFactory.createVectorStore(
            mergedConfig.vectorStore || { type: 'memory' },
            this.embeddings
          );
          logger.debug('Vector store initialized successfully');

          // Initialize vector store if needed
          if (typeof this.vectorStore.initialize === 'function') {
            await this.vectorStore.initialize();
          }
        } catch (error) {
          logger.error(`Failed to create vector store: ${error.message}`);
          initSuccess = false;
          // Fall back to memory vector store
          try {
            this.vectorStore = await VectorStoreFactory.createVectorStore(
              { type: 'memory' },
              this.embeddings
            );
            logger.warn('Falling back to in-memory vector store');
          } catch (fallbackError) {
            logger.error(`Failed to create fallback vector store: ${fallbackError.message}`);
            throw new Error('Could not initialize vector store, even with fallback');
          }
        }

        // Create text splitter with fallback
        try {
          this.textSplitter = TextSplitterFactory.createSplitter(
            mergedConfig.textSplitter || {}
          );
          logger.debug('Text splitter initialized successfully');
        } catch (error) {
          logger.error(`Failed to create text splitter: ${error.message}`);
          initSuccess = false;
          // Fall back to default text splitter
          try {
            this.textSplitter = TextSplitterFactory.createSplitter({});
            logger.warn('Falling back to default text splitter');
          } catch (fallbackError) {
            logger.error(`Failed to create fallback text splitter: ${fallbackError.message}`);
            throw new Error('Could not initialize text splitter, even with fallback');
          }
        }

        // Create RAG chain (no fallback, but don't fail initialization if it fails)
        try {
          this.ragChain = RAGChainFactory.createChain(
            mergedConfig.chain,
            this.vectorStore,
            apiKeys
          );
          logger.debug('RAG chain initialized successfully');
        } catch (error) {
          logger.error(`Failed to create RAG chain: ${error.message}`);
          initSuccess = false;
          this.initializationError = error.message;
        }

        this.initialized = true;
        if (!initSuccess) {
          logger.warn('Knowledge manager initialized with fallbacks due to errors');
        } else {
          logger.info('Knowledge manager initialized successfully');
        }
        return true;
      } catch (error) {
        logger.error(`Error in knowledge manager initialization: ${error.message}`);
        this.initialized = false;
        this.initializationError = error.message;
        throw error;
      }
    } catch (error) {
      logger.error(`Fatal error initializing knowledge manager: ${error.message}`);
      this.initializationError = error.message;
      throw new ApiError(`Failed to initialize knowledge manager: ${error.message}`, 500);
    }
  }

  /**
   * Reinitialize the knowledge manager
   * @param {Object} config Configuration
   * @returns {Promise<boolean>} Success status
   */
  async reinitialize(config = {}) {
    this.initialized = false;
    this.vectorStore = null;
    this.ragChain = null;
    this.textSplitter = null;
    this.embeddings = null;
    this.initializationError = null;
    return this.initialize(config);
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

      if (!documents || documents.length === 0) {
        logger.warn(`No documents provided for source: ${source}`);
        return false;
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

      if (lcDocs.length === 0) {
        logger.warn(`No valid documents found after conversion from source: ${source}`);
        return false;
      }

      // Split documents into chunks
      const splitDocs = await this.textSplitter.splitDocuments(lcDocs);

      logger.info(`Split into ${splitDocs.length} chunks`);

      // Add to vector store in batches to prevent memory issues
      const batchSize = 100;
      for (let i = 0; i < splitDocs.length; i += batchSize) {
        const batch = splitDocs.slice(i, i + batchSize);
        await this.vectorStore.addDocuments(batch);
        logger.debug(`Added batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(splitDocs.length/batchSize)}`);
      }

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

      // Check if RAG chain initialization failed
      if (!this.ragChain) {
        throw new ApiError(`RAG chain not available: ${this.initializationError || 'unknown error'}`, 500);
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
      
      // If this is a RAG-specific error, try to recover
      if (this.ragChain && error.message.includes('RAG')) {
        logger.info('Attempting to recover from RAG error by reinitializing');
        await this.reinitialize();
      }
      
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

      try {
        // Stream the answer if the RAG chain supports it
        if (this.ragChain && typeof this.ragChain.streamResponse === 'function') {
          await this.ragChain.streamResponse(
            question, 
            relevantDocs, 
            chunk => callback({
              type: 'content',
              ...chunk
            }),
            options
          );
        } else {
          // Fall back to non-streaming if the chain doesn't support streaming
          const result = await this.answerQuestion(question, options);
          callback({
            type: 'content',
            content: result.answer,
            text: result.answer
          });
        }
      } catch (error) {
        logger.error(`Error in streaming response: ${error.message}`);
        callback({
          type: 'error',
          error: error.message
        });
      }

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
        lastUpdated: new Date().toISOString(),
        initialized: this.initialized,
        initializationError: this.initializationError || null
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

      // Add vector store type
      if (this.vectorStore) {
        stats.vectorStoreType = this.vectorStore.constructor.name;
      }
      
      // Add embeddings type
      if (this.embeddings) {
        stats.embeddingsType = this.embeddings.constructor.name;
      }

      return stats;
    } catch (error) {
      logger.error(`Error getting knowledge stats: ${error.message}`);
      throw new ApiError(`Failed to get knowledge stats: ${error.message}`, 500);
    }
  }
  
  /**
   * Check health of the knowledge manager
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    return {
      initialized: this.initialized,
      error: this.initializationError,
      components: {
        vectorStore: !!this.vectorStore,
        embeddings: !!this.embeddings,
        textSplitter: !!this.textSplitter,
        ragChain: !!this.ragChain
      }
    };
  }
}

// Singleton instance
const knowledgeManager = new KnowledgeManager();

module.exports = knowledgeManager;