// ApiKeySetup.js placeholder
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';

const ApiKeySetup = ({ onNext }) => {
  const [modelType, setModelType] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiService.listModels();
        
        if (result.success) {
          setAvailableModels(result.models);
          
          // If there are models, set the first one as default
          if (result.models.length > 0) {
            setModelType(result.models[0].id);
          }
        } else {
          setError(result.error || 'Failed to load AI models');
        }
      } catch (error) {
        setError('Error loading models: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, []);

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await apiService.storeModelApiKey(modelType, apiKey);
      
      if (result.success) {
        // Set as active model
        await apiService.setActiveModel(modelType);
        onNext(modelType, apiKey);
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (error) {
      setError('Error saving API key: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="setup-step">
        <LoadingSpinner />
        <p>Loading available AI models...</p>
      </div>
    );
  }

  return (
    <div className="setup-step">
      <h2>Step 1: Set Up AI Model</h2>
      <p>Select an AI model and provide an API key to power your assistant.</p>
      
      {error && <ErrorDisplay message={error} />}
      
      <div className="form-group">
        <label htmlFor="modelType">AI Model:</label>
        <select 
          id="modelType"
          value={modelType}
          onChange={(e) => setModelType(e.target.value)}
          disabled={isSaving}
        >
          {availableModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="apiKey">API Key:</label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          disabled={isSaving}
        />
        <p className="input-help">
          {modelType === 'openai' ? 
            'Enter your OpenAI API key. You can find this in your OpenAI dashboard.' :
            modelType === 'anthropic' ?
            'Enter your Anthropic Claude API key. You can find this in your Anthropic dashboard.' :
            'Enter your API key for the selected model.'}
        </p>
      </div>
      
      <div className="button-container">
        <button 
          className="primary-button"
          onClick={handleContinue}
          disabled={!apiKey || isSaving}
        >
          {isSaving ? <LoadingSpinner size="small" /> : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default ApiKeySetup;