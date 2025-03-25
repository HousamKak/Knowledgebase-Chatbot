// components/setup/DataSourceSetup.jsx - Modified for web application
import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import apiService from '../../services/api';

const DataSourceSetup = ({ onNext, onBack, modelType }) => {
  const [sourceType, setSourceType] = useState('documents');
  const [sourceName, setSourceName] = useState('My Documents');
  const [folderPath, setFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleContinue = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add data source
      const sourceResult = await apiService.addDataSource(sourceType, sourceName, {
        folderPath,
        includeSubfolders: true
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
          <option value="documents">Document Folder</option>
          <option value="website">Website</option>
          <option value="pdf">PDF Documents</option>
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
      
      {sourceType === 'documents' && (
        <div className="form-group">
          <label htmlFor="folderPath">Document Folder Path:</label>
          <input
            id="folderPath"
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter folder path or upload files"
            disabled={isLoading}
          />
          <p className="input-help">
            Enter the path to your documents folder or upload files directly.
          </p>
          
          <div className="file-upload">
            <label className="upload-button">
              Upload Files
              <input 
                type="file" 
                multiple 
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    setFolderPath(`${e.target.files.length} files selected`);
                    // In a real implementation, you would handle file uploads here
                  }
                }} 
              />
            </label>
          </div>
        </div>
      )}
      
      {sourceType === 'website' && (
        <div className="form-group">
          <label htmlFor="websiteUrl">Website URL:</label>
          <input
            id="websiteUrl"
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter website URL (e.g., https://example.com)"
            disabled={isLoading}
          />
          <p className="input-help">
            Enter the URL of the website you want to index. The assistant will crawl 
            and index content from this website.
          </p>
        </div>
      )}
      
      {sourceType === 'pdf' && (
        <div className="form-group">
          <label htmlFor="pdfFiles">PDF Files:</label>
          <div className="file-upload">
            <label className="upload-button">
              Upload PDF Files
              <input 
                type="file" 
                multiple 
                accept=".pdf" 
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    setFolderPath(`${e.target.files.length} PDF files selected`);
                    // In a real implementation, you would handle PDF uploads here
                  }
                }} 
              />
            </label>
          </div>
          <p className="input-help">
            Upload PDF files to be indexed by the AI assistant.
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
          disabled={!sourceName || (sourceType === 'documents' && !folderPath) || isLoading}
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