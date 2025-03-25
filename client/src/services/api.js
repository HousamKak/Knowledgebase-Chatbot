// services/api.js - Modified for web application
import axios from 'axios';

// Configure base API URL depending on environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, payload);
      return response.data;
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
    }
  }

  // For development/demo mode, we can use local storage to mock API calls
  async requestMock(endpoint, payload = {}) {
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
      // Add other mock endpoints as needed
      default:
        return { success: true, message: `Mock response for ${endpoint}` };
    }
  }
  
  // Model-related endpoints
  async listModels() {
    // For development, you can use the mock version
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      return this.requestMock('list_models');
    }
    return this.request('list_models');
  }

  async setActiveModel(modelType) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      localStorage.setItem('active_model', modelType);
      return { success: true };
    }
    return this.request('set_active_model', { modelType });
  }

  async updateModelSettings(modelType, settings) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const config = JSON.parse(configStr);
      
      if (!config.modelSettings) {
        config.modelSettings = {};
      }
      
      config.modelSettings[modelType] = {
        ...config.modelSettings[modelType],
        ...settings
      };
      
      localStorage.setItem('app_config', JSON.stringify(config));
      return { success: true };
    }
    
    return this.request('update_model_settings', { modelType, settings });
  }

  async storeModelApiKey(modelType, apiKey) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      localStorage.setItem(`api_key_${modelType}`, apiKey);
      return { success: true };
    }
    return this.request('store_model_api_key', { modelType, apiKey });
  }

  async deleteModelApiKey(modelType) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      localStorage.removeItem(`api_key_${modelType}`);
      return { success: true };
    }
    return this.request('delete_model_api_key', { modelType });
  }

  async checkModelApiKey(modelType) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const hasKey = !!localStorage.getItem(`api_key_${modelType}`);
      return { success: true, hasKey };
    }
    return this.request('check_model_api_key', { modelType });
  }

  // Data source-related endpoints
  async listDataSources() {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const config = JSON.parse(configStr);
      return { 
        success: true, 
        dataSources: config.dataSources || [] 
      };
    }
    return this.request('list_data_sources');
  }

  async addDataSource(type, name, config) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const appConfig = JSON.parse(configStr);
      
      if (!appConfig.dataSources) {
        appConfig.dataSources = [];
      }
      
      const newSource = {
        id: `${type}_${Date.now()}`,
        type,
        name,
        enabled: true,
        config: config || {}
      };
      
      appConfig.dataSources.push(newSource);
      localStorage.setItem('app_config', JSON.stringify(appConfig));
      
      return { 
        success: true, 
        dataSource: newSource 
      };
    }
    
    return this.request('add_data_source', { type, name, config });
  }

  async updateDataSource(id, updates) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const appConfig = JSON.parse(configStr);
      
      if (!appConfig.dataSources) {
        return { success: false, error: 'Data source not found' };
      }
      
      const sourceIndex = appConfig.dataSources.findIndex(source => source.id === id);
      
      if (sourceIndex === -1) {
        return { success: false, error: 'Data source not found' };
      }
      
      appConfig.dataSources[sourceIndex] = {
        ...appConfig.dataSources[sourceIndex],
        ...updates,
        config: { 
          ...appConfig.dataSources[sourceIndex].config, 
          ...(updates.config || {}) 
        }
      };
      
      localStorage.setItem('app_config', JSON.stringify(appConfig));
      
      return { 
        success: true, 
        dataSource: appConfig.dataSources[sourceIndex] 
      };
    }
    
    return this.request('update_data_source', { id, updates });
  }

  async deleteDataSource(id) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const appConfig = JSON.parse(configStr);
      
      if (!appConfig.dataSources) {
        return { success: true };
      }
      
      appConfig.dataSources = appConfig.dataSources.filter(source => source.id !== id);
      localStorage.setItem('app_config', JSON.stringify(appConfig));
      
      return { success: true };
    }
    
    return this.request('delete_data_source', { id });
  }

  async fetchAndIndexData(sourceId) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      return { 
        success: true, 
        documentCount: 15,
        message: `Successfully indexed 15 documents` 
      };
    }
    return this.request('fetch_and_index', { sourceId });
  }

  // Configuration-related endpoints
  async getConfig() {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
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
    
    return this.request('get_config');
  }

  async updateUiConfig(uiConfig) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config') || '{}';
      const config = JSON.parse(configStr);
      
      config.ui = {
        ...config.ui,
        ...uiConfig
      };
      
      localStorage.setItem('app_config', JSON.stringify(config));
      
      return { success: true };
    }
    
    return this.request('update_ui_config', { uiConfig });
  }

  async resetConfig() {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      localStorage.removeItem('app_config');
      return { success: true };
    }
    
    return this.request('reset_config');
  }

  async checkSetupComplete() {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      const configStr = localStorage.getItem('app_config');
      if (!configStr) {
        return { 
          success: true, 
          setupComplete: false,
          missingApiKey: true,
          missingDataSource: true
        };
      }
      
      const config = JSON.parse(configStr);
      const apiKeyExists = !!localStorage.getItem(`api_key_${config.activeModel || 'openai'}`);
      const hasDataSource = config.dataSources && config.dataSources.some(source => source.enabled);
      
      return { 
        success: true, 
        setupComplete: apiKeyExists && hasDataSource,
        missingApiKey: !apiKeyExists,
        missingDataSource: !hasDataSource
      };
    }
    
    return this.request('check_setup_complete');
  }

  // Query-related endpoints
  async askQuestion(question, modelType) {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      // For demo purposes, just return a mock response
      return { 
        success: true, 
        answer: `This is a mock response to your question: "${question}". In a real implementation, this would be answered by ${modelType || 'the AI model'}.`,
        sources: [
          { 
            title: 'Mock Document 1', 
            id: 'doc1', 
            url: '#', 
            source: 'documents',
            score: 0.92,
            snippet: 'This is a snippet from the first mock document that would be relevant to your question.'
          },
          { 
            title: 'Mock Document 2', 
            id: 'doc2', 
            url: '#', 
            source: 'documents',
            score: 0.85,
            snippet: 'This is a snippet from the second mock document with information related to your query.'
          }
        ]
      };
    }
    
    return this.request('ask_question', { question, modelType });
  }

  async getKnowledgeStats() {
    if (process.env.REACT_APP_USE_MOCK_API === 'true') {
      return { 
        success: true, 
        stats: {
          documentCount: 42,
          lastUpdated: new Date().toISOString()
        }
      };
    }
    
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;