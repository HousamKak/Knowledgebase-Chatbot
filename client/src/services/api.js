// api.js placeholder
import { invoke } from '@forge/bridge';

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
      const response = await invoke(endpoint, { payload });
      return response;
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;