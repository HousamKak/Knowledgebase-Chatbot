// services/query-service.js - Query-related services
const ModelService = require('./model-service');
const modelService = new ModelService();
const knowledgeManager = require('../knowledge/knowledge-manager');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/error-types');
const fs = require('fs');
const path = require('path');

/**
 * Service for query-related operations
 */
class QueryService {
  constructor() {
    this.chatHistoryFile = path.join(__dirname, '../data/chat_history.json');
    this.chatHistory = [];
    this.loadChatHistory();
  }
  
  /**
   * Answer a question
   * @param {string} question Question to answer
   * @param {string} modelType Model type (optional, uses active model if not specified)
   * @returns {Promise<Object>} Answer and sources
   */
  async answerQuestion(question, modelType) {
    try {
      logger.info(`Answering question: ${question}`);
      
      let answer, sources;
      
      try {
        // Try to answer using RAG
        const result = await knowledgeManager.answerQuestion(question);
        answer = result.answer;
        sources = result.sources;
      } catch (error) {
        logger.error('Error using RAG to answer question:', error);
        
        // Fall back to direct model query
        const model = await modelService.getModelInstance(modelType);
        const response = await model.query(question, {
          systemPrompt: "You are a helpful assistant. Answer the user's question to the best of your ability."
        });
        
        answer = response.text;
        sources = [];
      }
      
      // Add to chat history
      const messageId = this.addMessageToHistory(question, answer, sources);
      
      return {
        messageId,
        answer,
        sources
      };
    } catch (error) {
      logger.error(`Error answering question: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Stream an answer
   * @param {string} question Question to answer
   * @param {string} modelType Model type
   * @param {function} callback Callback for streaming
   * @returns {Promise<void>}
   */
  async streamAnswer(question, modelType, callback) {
    try {
      logger.info(`Streaming answer for question: ${question}`);
      
      try {
        // Try to stream using RAG
        await knowledgeManager.streamAnswer(question, callback, { modelType });
      } catch (error) {
        logger.error('Error streaming with RAG:', error);
        
        // Fall back to direct model streaming
        const model = await modelService.getModelInstance(modelType);
        await model.streamResponse(question, callback, {
          systemPrompt: "You are a helpful assistant. Answer the user's question to the best of your ability."
        });
      }
      
      // Add to chat history (will be handled by the client)
    } catch (error) {
      logger.error(`Error streaming answer: ${error.message}`);
      callback({
        type: 'error',
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get knowledge statistics
   * @returns {Promise<Object>} Knowledge statistics
   */
  async getKnowledgeStats() {
    try {
      return await knowledgeManager.getStats();
    } catch (error) {
      logger.error(`Error getting knowledge stats: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get chat history
   * @param {number} limit Maximum number of messages to return
   * @returns {Promise<Array>} Chat history
   */
  async getChatHistory(limit = 50) {
    try {
      return this.chatHistory.slice(-limit);
    } catch (error) {
      logger.error(`Error getting chat history: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Clear chat history
   * @returns {Promise<boolean>} Success status
   */
  async clearChatHistory() {
    try {
      this.chatHistory = [];
      await this.saveChatHistory();
      return true;
    } catch (error) {
      logger.error(`Error clearing chat history: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Add message to chat history
   * @param {string} question User question
   * @param {string} answer Assistant answer
   * @param {Array} sources Reference sources
   * @returns {string} Message ID
   * @private
   */
  addMessageToHistory(question, answer, sources = []) {
    const timestamp = new Date().toISOString();
    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `assistant_${Date.now()}`;
    
    // Add user message
    this.chatHistory.push({
      id: userMessageId,
      role: 'user',
      content: question,
      timestamp
    });
    
    // Add assistant message
    this.chatHistory.push({
      id: assistantMessageId,
      role: 'assistant',
      content: answer,
      sources,
      timestamp
    });
    
    // Save chat history
    this.saveChatHistory();
    
    return assistantMessageId;
  }
  
  /**
   * Load chat history from file
   * @private
   */
  loadChatHistory() {
    try {
      if (fs.existsSync(this.chatHistoryFile)) {
        const data = fs.readFileSync(this.chatHistoryFile, 'utf8');
        this.chatHistory = JSON.parse(data);
      } else {
        this.chatHistory = [];
      }
    } catch (error) {
      logger.error('Error loading chat history:', error);
      this.chatHistory = [];
    }
  }
  
  /**
   * Save chat history to file
   * @private
   */
  async saveChatHistory() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.chatHistoryFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save chat history
      fs.writeFileSync(this.chatHistoryFile, JSON.stringify(this.chatHistory), 'utf8');
    } catch (error) {
      logger.error('Error saving chat history:', error);
    }
  }
}

module.exports = new QueryService();