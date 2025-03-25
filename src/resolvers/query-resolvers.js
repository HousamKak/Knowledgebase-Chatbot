// server/resolvers/query-resolvers.js
import ApiKeyManager from '../config/api-key-manager';
import ConfigManager from '../config/config-manager';
import KnowledgeManager from '../knowledge/knowledge-manager';

// Cache the knowledge manager
let knowledgeManagerInstance = null;

/**
 * Resolvers for query operations
 */
export const queryResolvers = {
  /**
   * Ask a question using the RAG system
   */
  ask_question: async (req, context) => {
    try {
      const { question, modelType } = req.payload;
      
      if (!question) {
        return { success: false, error: 'Question is required' };
      }
      
      // Initialize knowledge manager if needed
      if (!knowledgeManagerInstance) {
        knowledgeManagerInstance = new KnowledgeManager(context.storage, context.logger);
        
        // Get active model configuration
        const configManager = new ConfigManager(context.storage);
        const config = await configManager.getConfig();
        
        // Initialize with model configuration
        await knowledgeManagerInstance.initialize({
          modelProvider: modelType || config.activeModel,
          embeddings: { provider: 'openai' }
        });
      }
      
      // Answer the question
      const { answer, sources } = await knowledgeManagerInstance.answerQuestion(question);
      
      return {
        success: true,
        answer,
        sources
      };
    } catch (error) {
      context.logger.error(`Error asking question: ${error.message}`);
      return { success: false, error: `Error processing question: ${error.message}` };
    }
  },

  /**
   * Get knowledge base statistics
   */
  get_knowledge_stats: async (req, context) => {
    try {
      // Initialize knowledge manager if needed
      if (!knowledgeManagerInstance) {
        knowledgeManagerInstance = new KnowledgeManager(context.storage, context.logger);
        await knowledgeManagerInstance.initialize({});
      }
      
      // For now, just return basic statistics
      return {
        success: true,
        stats: {
          documentCount: knowledgeManagerInstance.vectorStore 
            ? knowledgeManagerInstance.vectorStore.memoryVectors.length 
            : 0,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      context.logger.error(`Error getting knowledge stats: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
};