// DatasourceContext.js placeholder
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';
import { useConfigContext } from './ConfigContext';

const DatasourceContext = createContext();

export const useDatasourceContext = () => useContext(DatasourceContext);

export const DatasourceProvider = ({ children }) => {
  const { config } = useConfigContext();
  const [dataSources, setDataSources] = useState([]);
  const [activeSources, setActiveSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshDataSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.listDataSources();
      
      if (result.success) {
        setDataSources(result.dataSources);
        
        // Set active sources (enabled ones)
        const enabled = result.dataSources.filter(source => source.enabled);
        setActiveSources(enabled);
      } else {
        setError(result.error || 'Failed to load data sources');
      }
    } catch (error) {
      setError('Error loading data sources: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update data sources when config changes
  useEffect(() => {
    if (config && config.dataSources) {
      setDataSources(config.dataSources);
      
      // Set active sources (enabled ones)
      const enabled = config.dataSources.filter(source => source.enabled);
      setActiveSources(enabled);
    }
  }, [config]);

  // Initial load
  useEffect(() => {
    refreshDataSources();
  }, [refreshDataSources]);

  return (
    <DatasourceContext.Provider
      value={{
        dataSources,
        activeSources,
        isLoading,
        error,
        refreshDataSources
      }}
    >
      {children}
    </DatasourceContext.Provider>
  );
};