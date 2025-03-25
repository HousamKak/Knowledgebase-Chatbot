// SourceDisplay.js placeholder
import React from 'react';

const SourceDisplay = ({ sources, onClose }) => {
  const handleSourceClick = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="source-panel">
      <div className="source-panel-header">
        <h3>Information Sources</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="source-list">
        {sources.map((source, index) => (
          <div 
            key={index} 
            className="source-item"
            onClick={() => handleSourceClick(source.url)}
          >
            <div className="source-title">{source.title || 'Untitled Document'}</div>
            <div className="source-meta">
              <span className="source-relevance">
                Relevance: {Math.round(source.score * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="source-footer">
        <p className="source-note">
          The assistant uses these sources to provide information.
          Click on a source to view the original document.
        </p>
      </div>
    </div>
  );
};

export default SourceDisplay;