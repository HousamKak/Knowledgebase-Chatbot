// services/api.js - API client for server communication
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api-endpoints';

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
      
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error: error.response.data?.error || `Server error: ${error.response.status}`
        };
      } else if (error.request) {
        // Request made but no response received
        return {
          success: false,
          error: 'Network error: No response from server'
        };
      } else {
        // Request setup error
        return {
          success: false,
          error: `Request error: ${error.message}`
        };
      }
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
      case API_ENDPOINTS.LIST_MODELS:
        return this.mockListModels();
      case API_ENDPOINTS.CHECK_SETUP_COMPLETE:
        return this.mockCheckSetupComplete();
      case API_ENDPOINTS.ASK_QUESTION:
        return this.mockAskQuestion(payload);
      case API_ENDPOINTS.ADD_DATA_SOURCE:
        return this.mockAddDataSource(payload);
      case API_ENDPOINTS.LIST_DATA_SOURCES:
        return this.mockListDataSources();
      case API_ENDPOINTS.GET_CONFIG:
        return this.mockGetConfig();
      default:
        return { success: true, message: `Mock response for ${endpoint}` };
    }
  }
  
  // Model-related endpoints
  async listModels() {
    return this.request(API_ENDPOINTS.LIST_MODELS);
  }

  async setActiveModel(modelType) {
    return this.request(API_ENDPOINTS.SET_ACTIVE_MODEL, { modelType });
  }

  async updateModelSettings(modelType, settings) {
    return this.request(API_ENDPOINTS.UPDATE_MODEL_SETTINGS, { modelType, settings });
  }

  async storeModelApiKey(modelType, apiKey) {
    return this.request(API_ENDPOINTS.STORE_MODEL_API_KEY, { modelType, apiKey });
  }

  async deleteModelApiKey(modelType) {
    return this.request(API_ENDPOINTS.DELETE_MODEL_API_KEY, { modelType });
  }

  async checkModelApiKey(modelType) {
    return this.request(API_ENDPOINTS.CHECK_MODEL_API_KEY, { modelType });
  }

  // Data source-related endpoints
  async listDataSources() {
    return this.request(API_ENDPOINTS.LIST_DATA_SOURCES);
  }

  async addDataSource(type, name, config) {
    return this.request(API_ENDPOINTS.ADD_DATA_SOURCE, { type, name, config });
  }

  async updateDataSource(id, updates) {
    return this.request(API_ENDPOINTS.UPDATE_DATA_SOURCE, { id, updates });
  }

  async deleteDataSource(id) {
    return this.request(API_ENDPOINTS.DELETE_DATA_SOURCE, { id });
  }

  async fetchAndIndexData(sourceId) {
    return this.request(API_ENDPOINTS.FETCH_AND_INDEX, { sourceId });
  }

  // Configuration-related endpoints
  async getConfig() {
    return this.request(API_ENDPOINTS.GET_CONFIG);
  }

  async updateUiConfig(uiConfig) {
    return this.request(API_ENDPOINTS.UPDATE_UI_CONFIG, { uiConfig });
  }

  async resetConfig() {
    return this.request(API_ENDPOINTS.RESET_CONFIG);
  }

  async checkSetupComplete() {
    return this.request(API_ENDPOINTS.CHECK_SETUP_COMPLETE);
  }

  // Query-related endpoints
  async askQuestion(question, modelType) {
    return this.request(API_ENDPOINTS.ASK_QUESTION, { question, modelType });
  }

  async getKnowledgeStats() {
    return this.request(API_ENDPOINTS.GET_KNOWLEDGE_STATS);
  }
  
  // Mock implementations for development (leaving these as they were)
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