// server/resolvers/source-resolvers.js
import DataSourceFactory from '../datasources/source-factory';
import ConfigManager from '../config/config-manager';
import ApiKeyManager from '../config/api-key-manager';
import KnowledgeManager from '../knowledge/knowledge-manager';

// Cache the knowledge manager instance
let knowledgeManagerInstance = null;

/**
 * Resolvers for data source operations
 */
export const sourceResolvers = {
    /**
     * List data sources
     */
    list_data_sources: async (req, context) => {
        try {
            const configManager = new ConfigManager(context.storage);
            const config = await configManager.getConfig();

            return {
                success: true,
                dataSources: config.dataSources.map(source => ({
                    id: source.id,
                    name: source.name,
                    type: source.type,
                    enabled: source.enabled,
                    config: source.config
                }))
            };
        } catch (error) {
            context.logger.error(`Error listing data sources: ${error.message}`);
            return { success: false, error: error.message };
        }
    },

    /**
     * Add data source
     */
    add_data_source: async (req, context) => {
        try {
            const { type, name, config } = req.payload;

            if (!type || !name) {
                return { success: false, error: 'Type and name are required' };
            }

            const configManager = new ConfigManager(context.storage);
            const appConfig = await configManager.getConfig();

            // Create new data source with unique ID
            const newSource = {
                id: `${type}_${Date.now()}`,
                type,
                name,
                enabled: true,
                config: config || {}
            };

            // Add to config
            appConfig.dataSources.push(newSource);

            const success = await configManager.updateConfig({ dataSources: appConfig.dataSources });

            return { success, dataSource: newSource };
        } catch (error) {
            context.logger.error(`Error adding data source: ${error.message}`);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update data source
     */
    update_data_source: async (req, context) => {
        try {
            const { id, updates } = req.payload;

            if (!id || !updates) {
                return { success: false, error: 'ID and updates are required' };
            }

            const configManager = new ConfigManager(context.storage);
            const appConfig = await configManager.getConfig();

            // Find data source
            const sourceIndex = appConfig.dataSources.findIndex(source => source.id === id);

            if (sourceIndex === -1) {
                return { success: false, error: 'Data source not found' };
            }

            // Update data source
            appConfig.dataSources[sourceIndex] = {
                ...appConfig.dataSources[sourceIndex],
                ...updates,
                config: { 
                    ...appConfig.dataSources[sourceIndex].config, 
                    ...(updates.config || {}) 
                }
            };

            const success = await configManager.updateConfig({ dataSources: appConfig.dataSources });

            return { success, dataSource: appConfig.dataSources[sourceIndex] };
        } catch (error) {
            context.logger.error(`Error updating data source: ${error.message}`);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete data source
     */
    delete_data_source: async (req, context) => {
        try {
            const { id } = req.payload;

            if (!id) {
                return { success: false, error: 'ID is required' };
            }

            const configManager = new ConfigManager(context.storage);
            const appConfig = await configManager.getConfig();

            // Filter out data source
            appConfig.dataSources = appConfig.dataSources.filter(source => source.id !== id);

            const success = await configManager.updateConfig({ dataSources: appConfig.dataSources });

            // Remove documents from knowledge base
            try {
                // Initialize knowledge manager if needed
                if (!knowledgeManagerInstance) {
                    knowledgeManagerInstance = new KnowledgeManager(context.storage, context.logger);
                    await knowledgeManagerInstance.initialize({
                        embeddings: { provider: 'tfidf' } // Use TF-IDF as fallback
                    });
                }
                
                await knowledgeManagerInstance.clearSourceDocuments(id);
                context.logger.info(`Successfully cleared documents from source: ${id}`);
            } catch (err) {
                // Log error but don't fail the operation
                context.logger.warn(`Could not clear documents from source ${id}: ${err.message}`);
            }

            return { success };
        } catch (error) {
            context.logger.error(`Error deleting data source: ${error.message}`);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch and index data from a data source
     */
    fetch_and_index: async (req, context) => {
        try {
            const { sourceId } = req.payload;

            if (!sourceId) {
                return { success: false, error: 'Source ID is required' };
            }

            // Get data source config
            const configManager = new ConfigManager(context.storage);
            const appConfig = await configManager.getConfig();

            const dataSource = appConfig.dataSources.find(source => source.id === sourceId);

            if (!dataSource) {
                return { success: false, error: 'Data source not found' };
            }

            // Initialize data source
            const apiKeyManager = new ApiKeyManager(context.storage);
            const apiKey = await apiKeyManager.getApiKey(dataSource.type);

            const sourceInstance = await DataSourceFactory.createDataSource(dataSource.type, {
                ...dataSource.config,
                apiKey,
                api: context.api,
                route: context.route,
                fetch: context.fetch
            });

            // Fetch documents
            const documents = await sourceInstance.fetchDocuments();

            if (!documents.length) {
                return { success: false, error: 'No documents fetched' };
            }

            // Get active model for embedding type selection
            const activeModel = appConfig.activeModel || 'openai';
            const hasOpenAIKey = await apiKeyManager.hasApiKey('openai');
            
            // Initialize knowledge manager if needed
            if (!knowledgeManagerInstance) {
                knowledgeManagerInstance = new KnowledgeManager(context.storage, context.logger);
                await knowledgeManagerInstance.initialize({
                    modelProvider: activeModel,
                    embeddings: { 
                        provider: hasOpenAIKey ? 'openai' : 'tfidf' // Use OpenAI if available, fallback to TF-IDF
                    }
                });
            }

            // Clear existing documents from this source
            await knowledgeManagerInstance.clearSourceDocuments(sourceId);

            // Add new documents
            const success = await knowledgeManagerInstance.addDocuments(documents, sourceId);

            if (!success) {
                return { success: false, error: 'Failed to index documents' };
            }

            return {
                success: true,
                documentCount: documents.length,
                message: `Successfully indexed ${documents.length} documents from ${dataSource.name}`
            };
        } catch (error) {
            context.logger.error(`Error fetching and indexing data: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
};