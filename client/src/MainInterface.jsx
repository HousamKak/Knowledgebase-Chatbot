// MainInterface.js placeholder
import React, { useState } from 'react';
import ChatInterface from './components/chat/ChatInterface';
import ConfigPanel from './components/config/ConfigPanel';
import Header from './components/common/Header';
import './styles/MainInterface.css';

const MainInterface = () => {
  const [showConfig, setShowConfig] = useState(false);

  const toggleConfig = () => {
    setShowConfig(!showConfig);
  };

  return (
    <div className="main-interface">
      <Header 
        showConfigButton
        onConfigClick={toggleConfig}
      />
      
      <div className="content-container">
        {showConfig ? (
          <ConfigPanel onClose={() => setShowConfig(false)} />
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  );
};

export default MainInterface;