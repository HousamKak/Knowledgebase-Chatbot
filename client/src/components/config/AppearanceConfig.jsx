// AppearanceConfig.js placeholder
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';

const AppearanceConfig = () => {
  const [uiConfig, setUiConfig] = useState({
    theme: 'light',
    chatHistoryLimit: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiService.getConfig();
        
        if (result.success && result.config.ui) {
          setUiConfig(result.config.ui);
        }
      } catch (error) {
        setError('Error loading configuration: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setUiConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await apiService.updateUiConfig(uiConfig);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      setError('Error saving configuration: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="appearance-config">
      <h3>Appearance Settings</h3>
      <p>Customize the look and behavior of your AI assistant.</p>
      
      {error && <ErrorDisplay message={error} />}
      
      <div className="form-group">
        <label htmlFor="theme">Theme:</label>
        <select
          id="theme"
          name="theme"
          value={uiConfig.theme}
          onChange={handleInputChange}
          disabled={isSaving}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System Default</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="chatHistoryLimit">Chat History Limit:</label>
        <input
          id="chatHistoryLimit"
          name="chatHistoryLimit"
          type="number"
          min="10"
          max="200"
          value={uiConfig.chatHistoryLimit}
          onChange={handleInputChange}
          disabled={isSaving}
        />
        <p className="input-help">
          Maximum number of messages to keep in chat history.
        </p>
      </div>
      
      <button
        className="save-button"
        onClick={handleSaveConfig}
        disabled={isSaving}
      >
        {isSaving ? <LoadingSpinner size="small" /> : 'Save Settings'}
      </button>
    </div>
  );
};

export default AppearanceConfig;