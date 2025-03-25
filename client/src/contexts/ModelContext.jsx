// ModelContext.js placeholder
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';
import { useConfigContext } from './ConfigContext';

const ModelContext = createContext();

export const useModelContext = () => useContext(ModelContext);

export const ModelProvider = ({ children }) => {
  const { config } = useConfigContext();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.listModels();
      
      if (result.success) {
        setModels(result.models);
        
        // Set selected model from active model
        const activeModel = result.models.find(model => model.active);
        if (activeModel) {
          setSelectedModel(activeModel);
        }
      } else {
        setError(result.error || 'Failed to load models');
      }
    } catch (error) {
      setError('Error loading models: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update selected model when config changes
  useEffect(() => {
    if (config && config.activeModel) {
      const model = models.find(m => m.id === config.activeModel);
      if (model) {
        setSelectedModel(model);
      }
    }
  }, [config, models]);

  // Initial load
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  return (
    <ModelContext.Provider
      value={{
        models,
        selectedModel,
        setSelectedModel,
        isLoading,
        error,
        refreshModels
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};