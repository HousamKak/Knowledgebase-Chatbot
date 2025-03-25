// client/src/constants/api-endpoints.js
export const API_ENDPOINTS = {
    // Model-related endpoints
    LIST_MODELS: 'models/list',
    SET_ACTIVE_MODEL: 'models/set-active',
    UPDATE_MODEL_SETTINGS: 'models/update-settings',
    STORE_MODEL_API_KEY: 'models/store-api-key',
    DELETE_MODEL_API_KEY: 'models/delete-api-key',
    CHECK_MODEL_API_KEY: 'models/check-api-key',
    
    // Data source-related endpoints
    LIST_DATA_SOURCES: 'data-sources',
    ADD_DATA_SOURCE: 'data-sources',
    UPDATE_DATA_SOURCE: 'data-sources',
    DELETE_DATA_SOURCE: 'data-sources',
    FETCH_AND_INDEX: 'data-sources/index',
    
    // Configuration-related endpoints
    GET_CONFIG: 'config',
    UPDATE_UI_CONFIG: 'config/ui',
    RESET_CONFIG: 'config/reset',
    CHECK_SETUP_COMPLETE: 'config/setup/check',
    
    // Query-related endpoints
    ASK_QUESTION: 'query/ask',
    GET_KNOWLEDGE_STATS: 'query/stats'
  };