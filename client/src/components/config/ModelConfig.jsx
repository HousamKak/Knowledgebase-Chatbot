// ModelConfig.js placeholder
import React, { useState, useEffect } from 'react';
import { useModelContext } from '../../contexts/ModelContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';

const ModelConfig = () => {
  const { models, selectedModel, setSelectedModel, refreshModels } = useModelContext();
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  const handleSelectModel = async (model) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.setActiveModel(model.id);
      
      if (result.success) {
        setSelectedModel(model);
      } else {
        setError(result.error || 'Failed to select model');
      }
    } catch (error) {
      setError('Error selecting model: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApiKey = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.storeModelApiKey(editingModel.id, apiKey);
      
      if (result.success) {
        setApiKey('');
        setShowApiKeyInput(false);
        setEditingModel(null);
        refreshModels();
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (error) {
      setError('Error saving API key: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async (modelId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.deleteModelApiKey(modelId);
      
      if (result.success) {
        refreshModels();
      } else {
        setError(result.error || 'Failed to delete API key');
      }
    } catch (error) {
      setError('Error deleting API key: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="model-config">
      <h3>AI Models</h3>
      <p>Configure the AI models used by your assistant.</p>
      
      {error && <ErrorDisplay message={error} />}
      
      {isLoading ? (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading models...</p>
        </div>
      ) : (
        <>
          <div className="model-list">
            {models.map(model => (
              <div 
                key={model.id}
                className={`model-item ${selectedModel?.id === model.id ? 'selected' : ''}`}
              >
                <div className="model-info">
                  <h4>{model.name}</h4>
                  <p>Status: {model.hasApiKey ? 'Configured' : 'Missing API Key'}</p>
                </div>
                
                <div className="model-actions">
                  {model.hasApiKey ? (
                    <>
                      <button
                        className="action-button"
                        onClick={() => handleSelectModel(model)}
                        disabled={selectedModel?.id === model.id}
                      >
                        {selectedModel?.id === model.id ? 'Active' : 'Use This Model'}
                      </button>
                      <button
                        className="action-button delete"
                        onClick={() => handleDeleteApiKey(model.id)}
                      >
                        Remove Key
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-button"
                      onClick={() => {
                        setEditingModel(model);
                        setShowApiKeyInput(true);
                      }}
                    >
                      Add API Key
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {showApiKeyInput && editingModel && (
            <div className="api-key-form">
              <h4>Add API Key for {editingModel.name}</h4>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter ${editingModel.name} API Key`}
              />
              <div className="button-row">
                <button
                  className="cancel-button"
                  onClick={() => {
                    setShowApiKeyInput(false);
                    setApiKey('');
                    setEditingModel(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="save-button"
                  onClick={handleAddApiKey}
                  disabled={!apiKey.trim()}
                >
                  Save API Key
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ModelConfig;