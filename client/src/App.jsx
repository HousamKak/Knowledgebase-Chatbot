// App.js - Modified for web application
import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { ConfigProvider } from './contexts/ConfigContext';
import { ModelProvider } from './contexts/ModelContext';
import { DatasourceProvider } from './contexts/DatasourceContext';
import SetupWizard from './components/setup/SetupWizard';
import MainInterface from './MainInterface';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorDisplay from './components/common/ErrorDisplay';
import apiService from './services/api';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [error, setError] = useState(null);

  // Check if setup is complete on app load
  useEffect(() => {
    const checkSetup = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have a stored configuration in localStorage
        const storedConfig = localStorage.getItem('app_config');
        const hasModelKey = localStorage.getItem('api_key_openai') || localStorage.getItem('api_key_anthropic');
        
        // If we have both config and at least one API key, setup is complete
        if (storedConfig && hasModelKey) {
          setIsSetupComplete(true);
        } else {
          setIsSetupComplete(false);
        }
      } catch (error) {
        setError('Error initializing the app: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkSetup();
  }, []);

  // Complete setup handler
  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <LoadingSpinner size="large" />
          <p>Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <ErrorDisplay message={error} />
      </div>
    );
  }

  return (
    <ConfigProvider>
      <ModelProvider>
        <DatasourceProvider>
          <div className="app-container">
            {isSetupComplete ? (
              <MainInterface />
            ) : (
              <SetupWizard onSetupComplete={handleSetupComplete} />
            )}
          </div>
        </DatasourceProvider>
      </ModelProvider>
    </ConfigProvider>
  );
}

export default App;