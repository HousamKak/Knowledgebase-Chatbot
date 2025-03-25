// DataSourceForm.js placeholder
import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const DataSourceForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'confluence',
    name: initialData?.name || '',
    config: initialData?.config || { spaceKey: '', includeChildren: true }
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
          <option value="confluence">Confluence Space</option>
          <option value="halo-istm">Halo ISTM</option>
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
      
      {formData.type === 'confluence' && (
        <>
          <div className="form-group">
            <label htmlFor="spaceKey">Space Key:</label>
            <input
              id="spaceKey"
              name="spaceKey"
              type="text"
              value={formData.config.spaceKey}
              onChange={handleConfigChange}
              placeholder="Enter Confluence space key"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input
                name="includeChildren"
                type="checkbox"
                checked={formData.config.includeChildren}
                onChange={handleConfigChange}
                disabled={isLoading}
              />
              Include child pages
            </label>
          </div>
        </>
      )}
      
      {formData.type === 'halo-istm' && (
        <>
          <div className="form-group">
            <label htmlFor="baseUrl">API URL:</label>
            <input
              id="baseUrl"
              name="baseUrl"
              type="text"
              value={formData.config.baseUrl || ''}
              onChange={handleConfigChange}
              placeholder="Enter Halo ISTM API URL"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endpoint">Endpoint:</label>
            <input
              id="endpoint"
              name="endpoint"
              type="text"
              value={formData.config.endpoint || ''}
              onChange={handleConfigChange}
              placeholder="Enter API endpoint"
              disabled={isLoading}
              required
            />
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
          disabled={isLoading || !formData.name || (formData.type === 'confluence' && !formData.config.spaceKey)}
        >
          {isLoading ? <LoadingSpinner size="small" /> : (initialData ? 'Update' : 'Add')}
        </button>
      </div>
    </form>
  );
};

export default DataSourceForm;