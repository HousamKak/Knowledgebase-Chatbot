// components/config/DataSourceForm.jsx - Modified for web application
import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const DataSourceForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'documents',
    name: initialData?.name || '',
    config: initialData?.config || { 
      folderPath: '', 
      includeSubfolders: true 
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const fileNames = Array.from(files).map(file => file.name).join(', ');
      
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          folderPath: `${files.length} files selected: ${fileNames}`
        }
      }));
      
      // In a real implementation, you would handle the file upload here
      // This could involve:
      // 1. Uploading to a server
      // 2. Processing locally with a web worker
      // 3. Storing in IndexedDB temporarily
    }
  };

  return (
    <form className="datasource-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Data Source' : 'Add Data Source'}</h3>
      
      <div className="form-group">
        <label htmlFor="type">Source Type:</label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          disabled={isLoading || initialData}
        >
          <option value="documents">Document Folder</option>
          <option value="website">Website</option>
          <option value="pdf">PDF Documents</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter name for this data source"
          disabled={isLoading}
          required
        />
      </div>
      
      {formData.type === 'documents' && (
        <>
          <div className="form-group">
            <label htmlFor="folderPath">Document Path/Files:</label>
            <input
              id="folderPath"
              name="folderPath"
              type="text"
              value={formData.config.folderPath}
              onChange={handleConfigChange}
              placeholder="Enter path or select files"
              disabled={isLoading}
              required
            />
            <div className="file-upload">
              <label className="upload-button">
                Select Files
                <input 
                  type="file" 
                  multiple
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input
                name="includeSubfolders"
                type="checkbox"
                checked={formData.config.includeSubfolders}
                onChange={handleConfigChange}
                disabled={isLoading}
              />
              Include subfolders
            </label>
          </div>
        </>
      )}
      
      {formData.type === 'website' && (
        <>
          <div className="form-group">
            <label htmlFor="websiteUrl">Website URL:</label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              value={formData.config.websiteUrl || formData.config.folderPath || ''}
              onChange={(e) => {
                handleConfigChange({
                  target: {
                    name: 'websiteUrl',
                    value: e.target.value
                  }
                });
                handleConfigChange({
                  target: {
                    name: 'folderPath',
                    value: e.target.value
                  }
                });
              }}
              placeholder="Enter website URL (e.g., https://example.com)"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="crawlDepth">Crawl Depth:</label>
            <select
              id="crawlDepth"
              name="crawlDepth"
              value={formData.config.crawlDepth || 3}
              onChange={handleConfigChange}
              disabled={isLoading}
            >
              <option value="1">1 - Homepage only</option>
              <option value="2">2 - Homepage + direct links</option>
              <option value="3">3 - Medium depth</option>
              <option value="5">5 - Deep crawl</option>
            </select>
          </div>
        </>
      )}
      
      {formData.type === 'pdf' && (
        <>
          <div className="form-group">
            <label htmlFor="pdfFiles">PDF Files:</label>
            <div className="file-upload">
              <label className="upload-button">
                Select PDF Files
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files.length > 0) {
                      const fileNames = Array.from(files).map(file => file.name).join(', ');
                      
                      handleConfigChange({
                        target: {
                          name: 'folderPath',
                          value: `${files.length} PDFs: ${fileNames}`
                        }
                      });
                      
                      // In a real implementation, you would handle the PDF uploads here
                    }
                  }}
                  disabled={isLoading}
                />
              </label>
            </div>
            <p className="form-note">Selected: {formData.config.folderPath || 'No PDFs selected'}</p>
          </div>
        </>
      )}
      
      <div className="button-row">
        <button
          type="button"
          className="cancel-button"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="save-button"
          disabled={isLoading || !formData.name || (
            (formData.type === 'documents' || formData.type === 'pdf') && !formData.config.folderPath
          ) || (
            formData.type === 'website' && !(formData.config.websiteUrl || formData.config.folderPath)
          )}
        >
          {isLoading ? <LoadingSpinner size="small" /> : (initialData ? 'Update' : 'Add')}
        </button>
      </div>
    </form>
  );
};

export default DataSourceForm;