// DataSourceSetup.js placeholder
import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';

const DataSourceSetup = ({ onNext, onBack, modelType }) => {
  const [sourceType, setSourceType] = useState('confluence');
  const [sourceName, setSourceName] = useState('Default Confluence Space');
  const [spaceKey, setSpaceKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleContinue = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add data source
      const sourceResult = await apiService.addDataSource(sourceType, sourceName, {
        spaceKey,
        includeChildren: true
      });
      
      if (!sourceResult.success) {
        throw new Error(sourceResult.error || 'Failed to add data source');
      }
      
      // Fetch and index content
      const indexResult = await apiService.fetchAndIndexData(sourceResult.dataSource.id);
      
      if (!indexResult.success) {
        throw new Error(indexResult.error || 'Failed to index content');
      }
      
      onNext(sourceResult.dataSource);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="setup-step">
      <h2>Step 2: Configure Data Source</h2>
      <p>Select and configure a data source for your AI assistant to learn from.</p>
      
      {error && <ErrorDisplay message={error} />}
      
      <div className="form-group">
        <label htmlFor="sourceType">Data Source Type:</label>
        <select 
          id="sourceType"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          disabled={isLoading}
        >
          <option value="confluence">Confluence Space</option>
          {/* Add other source types here as they become available */}
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="sourceName">Data Source Name:</label>
        <input
          id="sourceName"
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="Enter a name for this data source"
          disabled={isLoading}
        />
      </div>
      
      {sourceType === 'confluence' && (
        <div className="form-group">
          <label htmlFor="spaceKey">Confluence Space Key:</label>
          <input
            id="spaceKey"
            type="text"
            value={spaceKey}
            onChange={(e) => setSpaceKey(e.target.value)}
            placeholder="Enter Confluence space key"
            disabled={isLoading}
          />
          <p className="input-help">
            The space key is shown in the URL of your Confluence space.
            Example: If the URL is confluence.example.com/display/DOCS, enter "DOCS".
          </p>
        </div>
      )}
      
      <div className="button-container">
        <button 
          className="secondary-button"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </button>
        <button 
          className="primary-button"
          onClick={handleContinue}
          disabled={!sourceName || (sourceType === 'confluence' && !spaceKey) || isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="small" />
              <span>Indexing Data...</span>
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
};

export default DataSourceSetup;