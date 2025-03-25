// routes/model-routes.js - Model-related routes
const express = require('express');
const modelService = require('../services/model-service');
const { catchAsync } = require('../middleware/error-handler');

const router = express.Router();

// List models
router.get('/list', catchAsync(async (req, res) => {
  const models = await modelService.listModels();
  res.json({ success: true, models });
}));

// Set active model
router.post('/set-active', catchAsync(async (req, res) => {
  const { modelType } = req.body;
  await modelService.setActiveModel(modelType);
  res.json({ success: true });
}));

// Update model settings
router.put('/update-settings', catchAsync(async (req, res) => {
  const { modelType, settings } = req.body;
  await modelService.updateModelSettings(modelType, settings);
  res.json({ success: true });
}));

// Store model API key
router.post('/store-api-key', catchAsync(async (req, res) => {
  const { modelType, apiKey } = req.body;
  await modelService.storeModelApiKey(modelType, apiKey);
  res.json({ success: true });
}));

// Delete model API key
router.delete('/delete-api-key', catchAsync(async (req, res) => {
  const { modelType } = req.body;
  await modelService.deleteModelApiKey(modelType);
  res.json({ success: true });
}));

// Check if model has API key
router.get('/check-api-key', catchAsync(async (req, res) => {
  const { modelType } = req.query;
  const hasApiKey = await modelService.hasModelApiKey(modelType);
  res.json({ success: true, hasApiKey });
}));

module.exports = router;