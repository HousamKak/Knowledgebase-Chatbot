// ConfigContext.js placeholder
import React, { createContext, useContext, useState, useCallback } from 'react';
import apiService from '../services/api';

const ConfigContext = createContext();

export const useConfigContext = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getConfig();
      
      if (result.success) {
        setConfig(result.config);
      } else {
        setError(result.error || 'Failed to load configuration');
      }
    } catch (error) {
      setError('Error loading configuration: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (updates) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Different endpoints for different config types
      let result;
      
      if (updates.ui) {
        result = await apiService.updateUiConfig(updates.ui);
      } else if (updates.activeModel) {
        result = await apiService.setActiveModel(updates.activeModel);
      } else if (updates.modelSettings) {
        result = await apiService.updateModelSettings(
          updates.activeModel || config.activeModel,
          updates.modelSettings
        );
      }
      
      if (result && result.success) {
        // Refresh config after update
        await fetchConfig();
        return true;
      } else {
        setError((result && result.error) || 'Failed to update configuration');
        return false;
      }
    } catch (error) {
      setError('Error updating configuration: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config, fetchConfig]);

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        isLoading,
        error,
        fetchConfig,
        updateConfig
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};