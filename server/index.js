// server/index.js - Main entry point for the server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error-handler');
const logger = require('./utils/logger');
const configManager = require('./config/config-manager');
const knowledgeManager = require('./knowledge/knowledge-manager');

// Initialize Express
const app = express();
const port = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API routes
app.use('/api', routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle any requests that don't match the ones above
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Initialize necessary services
async function initServices() {
  try {
    // Initialize config
    await configManager.getConfig();
    
    // Initialize knowledge manager
    await knowledgeManager.initialize();
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Error initializing services:', error);
  }
}

// Start the server
const server = app.listen(port, async () => {
  logger.info(`Server is running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize services
  await initServices();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Perform graceful shutdown
  server.close(() => {
    logger.info('HTTP server closed due to uncaught exception');
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // Perform graceful shutdown
  server.close(() => {
    logger.info('HTTP server closed due to unhandled rejection');
    process.exit(1);
  });
});

module.exports = { app, server };