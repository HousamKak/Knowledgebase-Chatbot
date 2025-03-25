// ConfigPanel.js placeholder
import React, { useState } from 'react';
import ModelConfig from './ModelConfig';
import DataSourceConfig from './DataSourceConfig';
import AppearanceConfig from './AppearanceConfig';
import '../../styles/ConfigPanel.css';

const ConfigPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('models');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'models':
        return <ModelConfig />;
      case 'dataSources':
        return <DataSourceConfig />;
      case 'appearance':
        return <AppearanceConfig />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>Configuration</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="config-tabs">
        <button 
          className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          AI Models
        </button>
        <button 
          className={`tab-button ${activeTab === 'dataSources' ? 'active' : ''}`}
          onClick={() => setActiveTab('dataSources')}
        >
          Data Sources
        </button>
        <button 
          className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          Appearance
        </button>
      </div>
      
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ConfigPanel;