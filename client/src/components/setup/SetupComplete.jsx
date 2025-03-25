// SetupComplete.js placeholder
import React from 'react';

const SetupComplete = ({ setupData, onFinish, onBack }) => {
  return (
    <div className="setup-step">
      <h2>Setup Complete!</h2>
      <p>Your AI Assistant is ready to use.</p>
      
      <div className="setup-summary">
        <h3>Configuration Summary:</h3>
        <div className="summary-item">
          <strong>AI Model:</strong> {setupData.modelType.charAt(0).toUpperCase() + setupData.modelType.slice(1)}
        </div>
        
        <div className="summary-item">
          <strong>Data Source:</strong> {setupData.dataSource?.name}
          <div className="summary-detail">
            {setupData.dataSource?.type === 'confluence' && (
              <span>Confluence Space Key: {setupData.dataSource.config?.spaceKey}</span>
            )}
          </div>
        </div>
      </div>
      
      <p>
        You can modify these settings at any time through the configuration panel.
      </p>
      
      <div className="button-container">
        <button 
          className="secondary-button"
          onClick={onBack}
        >
          Back
        </button>
        <button 
          className="primary-button"
          onClick={onFinish}
        >
          Start Using AI Assistant
        </button>
      </div>
    </div>
  );
};

export default SetupComplete;