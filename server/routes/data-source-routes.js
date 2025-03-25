// routes/data-source-routes.js - Data source-related routes
const express = require('express');
const datasourceService = require('../services/datasource-service');
const fileUploadMiddleware = require('../middleware/file-upload');
const { catchAsync } = require('../middleware/error-handler');

const router = express.Router();

// List data sources
router.get('/', catchAsync(async (req, res) => {
  const dataSources = await datasourceService.listDataSources();
  res.json({ success: true, dataSources });
}));

// Get data source by ID
router.get('/:id', catchAsync(async (req, res) => {
  const dataSource = await datasourceService.getDataSourceById(req.params.id);
  res.json({ success: true, dataSource });
}));

// Add data source
router.post('/', catchAsync(async (req, res) => {
  const { type, name, config } = req.body;
  const dataSource = await datasourceService.addDataSource(type, name, config);
  res.json({ success: true, dataSource });
}));

// Update data source
router.put('/:id', catchAsync(async (req, res) => {
  const { updates } = req.body;
  const dataSource = await datasourceService.updateDataSource(req.params.id, updates);
  res.json({ success: true, dataSource });
}));

// Delete data source
router.delete('/:id', catchAsync(async (req, res) => {
  await datasourceService.deleteDataSource(req.params.id);
  res.json({ success: true });
}));

// Fetch and index data from a data source
router.post('/:id/index', catchAsync(async (req, res) => {
  const result = await datasourceService.fetchAndIndexData(req.params.id);
  res.json({
    success: true,
    documentCount: result.documentCount,
    message: result.message
  });
}));

// Upload files to create or update a data source
router.post('/upload', fileUploadMiddleware.array('files'), catchAsync(async (req, res) => {
  const files = req.files;
  const { sourceName, sourceType } = req.body;
  
  const result = await datasourceService.processUploadedFiles(files, {
    name: sourceName || 'Uploaded Files',
    type: sourceType || 'documents'
  });
  
  res.json({
    success: true,
    dataSource: result.dataSource,
    documentCount: result.documentCount,
    message: `Successfully processed ${files.length} files`
  });
}));

// Configure Confluence credentials if needed
router.post('/confluence/auth', catchAsync(async (req, res) => {
  const { username, apiToken, baseUrl } = req.body;
  await datasourceService.storeConfluenceCredentials(username, apiToken, baseUrl);
  res.json({ success: true });
}));

module.exports = router;