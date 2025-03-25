// routes/config-routes.js - Configuration-related routes
const express = require('express');
const configService = require('../services/config-service');
const { catchAsync } = require('../middleware/error-handler');

const router = express.Router();

// Get current configuration
router.get('/', catchAsync(async (req, res) => {
  const config = await configService.getConfig();
  res.json({ success: true, config });
}));

// Update UI configuration
router.put('/ui', catchAsync(async (req, res) => {
  const { uiConfig } = req.body;
  await configService.updateUiConfig(uiConfig);
  res.json({ success: true });
}));

// Reset configuration to defaults
router.post('/reset', catchAsync(async (req, res) => {
  await configService.resetConfig();
  res.json({ success: true });
}));

// Check if initial setup is complete
router.get('/setup/check', catchAsync(async (req, res) => {
  const result = await configService.checkSetupComplete();
  res.json({
    success: true,
    setupComplete: result.setupComplete,
    missingApiKey: result.missingApiKey,
    missingDataSource: result.missingDataSource
  });
}));

// Export configuration
router.get('/export', catchAsync(async (req, res) => {
  const exportData = await configService.exportConfig();
  res.json({ success: true, data: exportData });
}));

// Import configuration
router.post('/import', catchAsync(async (req, res) => {
  const { configData } = req.body;
  await configService.importConfig(configData);
  res.json({ success: true });
}));

module.exports = router;