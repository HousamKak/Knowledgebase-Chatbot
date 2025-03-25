// components/common/Header.jsx - Modified for web application
import React from 'react';
import { useModelContext } from '../../contexts/ModelContext';
import '../../styles/Header.css';

const Header = ({ showConfigButton, onConfigClick }) => {
  const { selectedModel } = useModelContext();

  return (
    <header className="app-header">
      <div className="header-title">
        <h1>AI Knowledge Assistant</h1>
        {selectedModel && (
          <div className="model-badge">
            {selectedModel.name}
          </div>
        )}
      </div>
      
      {showConfigButton && (
        <button
          className="config-button"
          onClick={onConfigClick}
          title="Open Configuration"
        >
          ⚙️ Settings
        </button>
      )}
    </header>
  );
};

export default Header;