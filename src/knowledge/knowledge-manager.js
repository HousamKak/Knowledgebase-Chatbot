import { DataSourceAdapter } from './langchain/document-loaders';
import { TextSplitterFactory } from './langchain/text-splitters';
import { EmbeddingsFactory } from './langchain/embeddings';
import { VectorStoreFactory } from './langchain/vector-stores';
import { RAGChainFactory } from './langchain/chains';
import ApiKeyManager from '../config/api-key-manager';

/**
 * Knowledge manager using LangChain for RAG
 */
class KnowledgeManager {
    /**
     * Create a knowledge manager
     * @param {Object} storage Forge storage API
     * @param {Object} logger Logger instance
     */
    constructor(storage, logger) {
        this.storage = storage;
        this.logger = logger;
        this.vectorStore = null;
        this.ragChain = null;
        this.initialized = false;
    }

    /**
     * Initialize the knowledge manager
     * @param {Object} config Configuration
     */
    async initialize(config) {
        try {
            this.logger.info('Initializing knowledge manager with LangChain');

            // Get API keys
            const apiKeyManager = new ApiKeyManager(this.storage);
            const apiKeys = {
                openai: await apiKeyManager.getApiKey('openai'),
                anthropic: await apiKeyManager.getApiKey('anthropic')
            };

            // Create embeddings
            const embeddings = EmbeddingsFactory.createEmbeddings(
                config.embeddings || { provider: 'openai' },
                apiKeys
            );

            // Create vector store
            this.vectorStore = await VectorStoreFactory.createVectorStore(
                config.vectorStore || { type: 'forge' },
                embeddings,
                this.storage
            );

            // Initialize vector store if needed
            if (typeof this.vectorStore.initialize === 'function') {
                await this.vectorStore.initialize();
            }

            // Create text splitter
            this.textSplitter = TextSplitterFactory.createSplitter(
                config.textSplitter || {}
            );

            // Create RAG chain
            this.ragChain = RAGChainFactory.createChain(
                config.chain || {
                    modelProvider: 'openai',
                    modelName: 'gpt-3.5-turbo',
                    retrievalConfig: { k: 5 }
                },
                this.vectorStore,
                apiKeys
            );

            this.initialized = true;
            this.logger.info('Knowledge manager initialized successfully');
        } catch (error) {
            this.logger.error(`Error initializing knowledge manager: ${error.message}`);
            throw error;
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
                await this.initialize({});
            }

            this.logger.info(`Adding ${documents.length} documents from ${source}`);

            // Convert to LangChain documents
            const lcDocs = DataSourceAdapter.convertToLangChainDocuments(
                documents.map(doc => ({ ...doc, source }))
            );

            // Split documents into chunks
            const splitDocs = await this.textSplitter.splitDocuments(lcDocs);

            this.logger.info(`Split into ${splitDocs.length} chunks`);

            // Add to vector store
            await this.vectorStore.addDocuments(splitDocs);

            this.logger.info(`Successfully added ${splitDocs.length} document chunks to knowledge base`);
            return true;
        } catch (error) {
            this.logger.error(`Error adding documents: ${error.message}`);
            return false;
        }
    }

    /**
     * Answer a question using RAG
     * @param {string} question Question to answer
     * @returns {Promise<Object>} Answer and sources
     */
    async answerQuestion(question) {
        try {
            if (!this.initialized) {
                await this.initialize({});
            }

            this.logger.info(`Answering question: ${question}`);

            // Get answer from RAG chain
            const result = await this.ragChain.call({ query: question });

            // Get source documents
            const sourceDocuments = result.sourceDocuments || [];

            // Format sources
            const sources = sourceDocuments.map(doc => ({
                title: doc.metadata.title,
                id: doc.metadata.id,
                url: doc.metadata.url,
                source: doc.metadata.source,
                // Extract a relevant snippet
                snippet: doc.pageContent.length > 200
                    ? doc.pageContent.substring(0, 200) + '...'
                    : doc.pageContent
            }));

            return {
                answer: result.text,
                sources
            };
        } catch (error) {
            this.logger.error(`Error answering question: ${error.message}`);
            throw error;
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
                await this.initialize({});
            }

            this.logger.info(`Clearing documents from source: ${source}`);

            // Use the deleteDocumentsBySource method from ForgeVectorStore
            if (this.vectorStore && typeof this.vectorStore.deleteDocumentsBySource === 'function') {
                await this.vectorStore.deleteDocumentsBySource(source);
                this.logger.info(`Successfully cleared documents from source: ${source}`);
                return true;
            } else {
                this.logger.warn(`Current vector store does not support clearing by source: ${source}`);
                return false;
            }
        } catch (error) {
            this.logger.error(`Error clearing source documents: ${error.message}`);
            return false;
        }
    }
}

export default KnowledgeManager;