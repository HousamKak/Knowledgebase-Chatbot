// SetupWizard.js placeholder
import React, { useState } from 'react';
import ApiKeySetup from './ApiKeySetup';
import DataSourceSetup from './DataSourceSetup';
import SetupComplete from './SetupComplete';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';
import '../../styles/SetupWizard.css';

const STEPS = {
  API_KEY: 0,
  DATA_SOURCE: 1,
  COMPLETE: 2
};

const SetupWizard = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.API_KEY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupData, setSetupData] = useState({
    modelType: 'openai',
    apiKey: '',
    dataSource: null
  });

  const handleApiKeyNext = (modelType, apiKey) => {
    setSetupData(prev => ({ ...prev, modelType, apiKey }));
    setCurrentStep(STEPS.DATA_SOURCE);
  };

  const handleDataSourceNext = (dataSource) => {
    setSetupData(prev => ({ ...prev, dataSource }));
    setCurrentStep(STEPS.COMPLETE);
  };

  const handleFinishSetup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Final check to ensure everything is set up
      const checkResult = await apiService.checkSetupComplete();
      
      if (checkResult.success && checkResult.setupComplete) {
        onSetupComplete();
      } else {
        setError('Setup is not complete. Please check your configuration.');
      }
    } catch (error) {
      setError('Error completing setup: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.API_KEY:
        return <ApiKeySetup onNext={handleApiKeyNext} />;
        
      case STEPS.DATA_SOURCE:
        return (
          <DataSourceSetup 
            onNext={handleDataSourceNext}
            onBack={() => setCurrentStep(STEPS.API_KEY)}
            modelType={setupData.modelType}
          />
        );
        
      case STEPS.COMPLETE:
        return (
          <SetupComplete 
            setupData={setupData}
            onFinish={handleFinishSetup}
            onBack={() => setCurrentStep(STEPS.DATA_SOURCE)}
          />
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="setup-wizard">
      <div className="setup-card">
        <h1>Confluence AI Assistant Setup</h1>
        
        <div className="step-indicator">
          <div className={`step ${currentStep >= STEPS.API_KEY ? 'active' : ''}`}>
            1. AI Model
          </div>
          <div className={`step ${currentStep >= STEPS.DATA_SOURCE ? 'active' : ''}`}>
            2. Data Source
          </div>
          <div className={`step ${currentStep >= STEPS.COMPLETE ? 'active' : ''}`}>
            3. Complete
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Setting up your AI Assistant...</p>
          </div>
        ) : (
          <>
            {error && <ErrorDisplay message={error} />}
            {renderStep()}
          </>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;