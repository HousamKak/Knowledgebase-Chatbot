// model-interface.js placeholder
/**
 * Interface for LLM model adapters
 * All model implementations should extend this class
 */
class ModelInterface {
    /**
     * Initialize the model with configuration
     * @param {Object} config Configuration for the model
     */
    async initialize(config) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Send a query to the model
     * @param {string} prompt The prompt to send to the model
     * @param {Object} options Additional options for the query
     * @returns {Promise<Object>} The model's response
     */
    async query(prompt, options) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Get the capabilities of the model
     * @returns {Object} The capabilities of the model
     */
    getCapabilities() {
      throw new Error('Method not implemented');
    }
  }
  
  export default ModelInterface;