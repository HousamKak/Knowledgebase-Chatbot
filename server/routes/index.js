// server/routes/index.js
const express = require('express');
const router = express.Router();

// Import all route files
const modelRoutes = require('./model-routes');
const dataSourceRoutes = require('./data-source-routes');
const configRoutes = require('./config-routes');
const queryRoutes = require('./query-routes');

// Mount the routes
router.use('/models', modelRoutes);
router.use('/data-sources', dataSourceRoutes);
router.use('/config', configRoutes);
router.use('/query', queryRoutes);

module.exports = router;