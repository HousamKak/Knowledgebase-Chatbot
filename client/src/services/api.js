// services/api.js - API client for server communication
import axios from 'axios';

// Configure base API URL depending on environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';

/**
 * API client for interacting with the server
 */
class ApiService {
  /**
   * Send a request to the server
   * @param {string} endpoint The endpoint to call
   * @param {Object} payload The payload to send
   * @returns {Promise<Object>} The response
   */
  async request(endpoint, payload = {}) {
    try {
      if (USE_MOCK_API) {
        return this.handleMockRequest(endpoint, payload);
      }
      
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, payload);
      return response.data;
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Handle mock API requests for development/testing
   * @param {string} endpoint The endpoint to mock
   * @param {Object} payload The payload data
   * @returns {Promise<Object>} Mock response
   * @private
   */
  async handleMockRequest(endpoint, payload = {}) {
    // Add a small delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 300)); 
    
    console.log(`Mock API call to ${endpoint} with payload:`, payload);
    
    switch(endpoint) {
      case 'list_models':
        return this.mockListModels();
      case 'check_setup_complete':
        return this.mockCheckSetupComplete();
      case 'ask_question':
        return this.mockAskQuestion(payload);
      case 'add_data_source':
        return this.mockAddDataSource(payload);
      case 'list_data_sources':
        return this.mockListDataSources();
      case 'get_config':
        return this.mockGetConfig();
      default:
        return { success: true, message: `Mock response for ${endpoint}` };
    }
  }
  
  // Model-related endpoints
  async listModels() {
    return this.request('list_models');
  }

  async setActiveModel(modelType) {
    return this.request('set_active_model', { modelType });
  }

  async updateModelSettings(modelType, settings) {
    return this.request('update_model_settings', { modelType, settings });
  }

  async storeModelApiKey(modelType, apiKey) {
    return this.request('store_model_api_key', { modelType, apiKey });
  }

  async deleteModelApiKey(modelType) {
    return this.request('delete_model_api_key', { modelType });
  }

  async checkModelApiKey(modelType) {
    return this.request('check_model_api_key', { modelType });
  }

  // Data source-related endpoints
  async listDataSources() {
    return this.request('list_data_sources');
  }

  async addDataSource(type, name, config) {
    return this.request('add_data_source', { type, name, config });
  }

  async updateDataSource(id, updates) {
    return this.request('update_data_source', { id, updates });
  }

  async deleteDataSource(id) {
    return this.request('delete_data_source', { id });
  }

  async fetchAndIndexData(sourceId) {
    return this.request('fetch_and_index', { sourceId });
  }

  // Configuration-related endpoints
  async getConfig() {
    return this.request('get_config');
  }

  async updateUiConfig(uiConfig) {
    return this.request('update_ui_config', { uiConfig });
  }

  async resetConfig() {
    return this.request('reset_config');
  }

  async checkSetupComplete() {
    return this.request('check_setup_complete');
  }

  // Query-related endpoints
  async askQuestion(question, modelType) {
    return this.request('ask_question', { question, modelType });
  }

  async getKnowledgeStats() {
    return this.request('get_knowledge_stats');
  }
  
  // Mock implementations for development
  mockListModels() {
    const activeModel = localStorage.getItem('active_model') || 'openai';
    
    return {
      success: true,
      models: [
        {
          id: 'openai',
          name: 'OpenAI GPT',
          active: activeModel === 'openai',
          hasApiKey: !!localStorage.getItem('api_key_openai'),
          model: 'gpt-3.5-turbo'
        },
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          active: activeModel === 'anthropic',
          hasApiKey: !!localStorage.getItem('api_key_anthropic'),
          model: 'claude-2'
        }
      ]
    };
  }
  
  mockCheckSetupComplete() {
    const hasOpenAIKey = !!localStorage.getItem('api_key_openai');
    const hasAnthropicKey = !!localStorage.getItem('api_key_anthropic');
    
    // Check if there are any data sources
    const configStr = localStorage.getItem('app_config') || '{}';
    const config = JSON.parse(configStr);
    const hasDataSource = config.dataSources && config.dataSources.length > 0;
    
    return {
      success: true,
      setupComplete: (hasOpenAIKey || hasAnthropicKey) && hasDataSource,
      missingApiKey: !hasOpenAIKey && !hasAnthropicKey,
      missingDataSource: !hasDataSource
    };
  }
  
  mockAskQuestion(payload) {
    return {
      success: true,
      answer: `This is a simulated answer to your question: "${payload.question}".`,
      sources: [
        {
          title: 'Sample Document',
          id: 'sample-1',
          url: '#',
          source: 'documents',
          score: 0.95,
          snippet: 'This is a sample document snippet that would match your query.'
        }
      ]
    };
  }
  
  mockAddDataSource(payload) {
    const { type, name, config } = payload;
    const newSource = {
      id: `${type}_${Date.now()}`,
      type,
      name,
      enabled: true,
      config: config || {}
    };
    
    // Add to mock storage
    const configStr = localStorage.getItem('app_config') || '{}';
    const appConfig = JSON.parse(configStr);
    
    if (!appConfig.dataSources) {
      appConfig.dataSources = [];
    }
    
    appConfig.dataSources.push(newSource);
    localStorage.setItem('app_config', JSON.stringify(appConfig));
    
    return { 
      success: true, 
      dataSource: newSource 
    };
  }
  
  mockListDataSources() {
    const configStr = localStorage.getItem('app_config') || '{}';
    const config = JSON.parse(configStr);
    return { 
      success: true, 
      dataSources: config.dataSources || [] 
    };
  }
  
  mockGetConfig() {
    const configStr = localStorage.getItem('app_config');
    if (configStr) {
      return { success: true, config: JSON.parse(configStr) };
    } else {
      // Return default config
      const defaultConfig = {
        activeModel: 'openai',
        modelSettings: {
          openai: {
            name: 'OpenAI',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 1024
          },
          anthropic: {
            name: 'Anthropic',
            model: 'claude-2',
            temperature: 0.7,
            maxTokens: 1024
          }
        },
        dataSources: [],
        ui: {
          theme: 'light',
          chatHistoryLimit: 50
        }
      };
      localStorage.setItem('app_config', JSON.stringify(defaultConfig));
      return { success: true, config: defaultConfig };
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;