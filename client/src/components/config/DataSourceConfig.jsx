// DataSourceConfig.js placeholder
import React, { useState, useEffect } from 'react';
import { useDatasourceContext } from '../../contexts/DatasourceContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import DataSourceForm from './DataSourceForm';
import apiService from '../../services/api';

const DataSourceConfig = () => {
  const { dataSources, refreshDataSources } = useDatasourceContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [indexingProgress, setIndexingProgress] = useState({ sourceId: null, status: '' });

  useEffect(() => {
    refreshDataSources();
  }, [refreshDataSources]);

  const handleAddSource = () => {
    setEditingSource(null);
    setShowAddForm(true);
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setShowAddForm(true);
  };

  const handleDeleteSource = async (sourceId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.deleteDataSource(sourceId);
      
      if (result.success) {
        refreshDataSources();
      } else {
        setError(result.error || 'Failed to delete data source');
      }
    } catch (error) {
      setError('Error deleting data source: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexSource = async (sourceId) => {
    setIsIndexing(true);
    setError(null);
    setIndexingProgress({ sourceId, status: 'Indexing...' });
    
    try {
      const result = await apiService.fetchAndIndexData(sourceId);
      
      if (result.success) {
        setIndexingProgress({ 
          sourceId, 
          status: `Successfully indexed ${result.documentCount} documents` 
        });
        
        setTimeout(() => {
          setIndexingProgress({ sourceId: null, status: '' });
        }, 3000);
      } else {
        setError(result.error || 'Failed to index data source');
      }
    } catch (error) {
      setError('Error indexing data source: ' + error.message);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (editingSource) {
        // Update existing source
        result = await apiService.updateDataSource(editingSource.id, formData);
      } else {
        // Add new source
        result = await apiService.addDataSource(formData.type, formData.name, formData.config);
      }
      
      if (result.success) {
        setShowAddForm(false);
        setEditingSource(null);
        refreshDataSources();
      } else {
        setError(result.error || 'Failed to save data source');
      }
    } catch (error) {
      setError('Error saving data source: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="datasource-config">
      <h3>Data Sources</h3>
      <p>Configure the data sources used to answer questions.</p>
      
      {error && <ErrorDisplay message={error} />}
      
      {isLoading && !showAddForm ? (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading data sources...</p>
        </div>
      ) : showAddForm ? (
        <DataSourceForm 
          initialData={editingSource} 
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowAddForm(false);
            setEditingSource(null);
          }}
          isLoading={isLoading}
        />
      ) : (
        <>
          <button
            className="add-button"
            onClick={handleAddSource}
          >
            Add Data Source
          </button>
          
          <div className="datasource-list">
            {dataSources.length === 0 ? (
              <p className="no-items">No data sources configured. Add one to get started.</p>
            ) : (
              dataSources.map(source => (
                <div key={source.id} className="datasource-item">
                  <div className="datasource-info">
                    <h4>{source.name}</h4>
                    <p className="datasource-type">
                      Type: {source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                    </p>
                    {source.type === 'confluence' && (
                      <p className="datasource-details">
                        Space Key: {source.config.spaceKey}
                      </p>
                    )}
                  </div>
                  
                  <div className="datasource-status">
                    {indexingProgress.sourceId === source.id && (
                      <div className="progress-message">
                        {isIndexing ? <LoadingSpinner size="small" /> : null}
                        <span>{indexingProgress.status}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="datasource-actions">
                    <button
                      className="action-button"
                      onClick={() => handleIndexSource(source.id)}
                      disabled={isIndexing}
                    >
                      {isIndexing && indexingProgress.sourceId === source.id
                        ? 'Indexing...'
                        : 'Re-index'}
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleEditSource(source)}
                    >
                      Edit
                    </button>
                    <button
                      className="action-button delete"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DataSourceConfig;