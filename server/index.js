// Main entry point for the server
// index.js placeholder
import Resolver from '@forge/resolver';
import api, { storage, fetch, route } from '@forge/api';
import { createLogger, format as _format, transports as _transports } from 'winston';
import { modelResolvers } from './resolvers/model-resolvers';
import { sourceResolvers } from './resolvers/source-resolvers';
import { configResolvers } from './resolvers/config-resolvers';
import { queryResolvers } from './resolvers/query-resolvers';

// Initialize logger
const logger = createLogger({
  level: 'info',
  format: _format.json(),
  transports: [
    new _transports.File({ filename: 'error.log', level: 'error' }),
    new _transports.File({ filename: 'combined.log' }),
  ],
});

// Initialize resolver
const resolver = new Resolver();

// Register all resolvers
const registerResolvers = () => {
  // Model related resolvers
  Object.entries(modelResolvers).forEach(([name, fn]) => {
    resolver.define(name, async (req) => {
      try {
        return await fn(req, { api, storage, fetch, route, logger });
      } catch (error) {
        logger.error(`Error in resolver ${name}: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  });

  // Data source related resolvers
  Object.entries(sourceResolvers).forEach(([name, fn]) => {
    resolver.define(name, async (req) => {
      try {
        return await fn(req, { api, storage, fetch, route, logger });
      } catch (error) {
        logger.error(`Error in resolver ${name}: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  });

  // Configuration related resolvers
  Object.entries(configResolvers).forEach(([name, fn]) => {
    resolver.define(name, async (req) => {
      try {
        return await fn(req, { api, storage, fetch, route, logger });
      } catch (error) {
        logger.error(`Error in resolver ${name}: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  });

  // Query related resolvers
  Object.entries(queryResolvers).forEach(([name, fn]) => {
    resolver.define(name, async (req) => {
      try {
        return await fn(req, { api, storage, fetch, route, logger });
      } catch (error) {
        logger.error(`Error in resolver ${name}: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  });
};

// Register all resolvers
registerResolvers();

// Export handler for Forge
export const handler = resolver.getDefinitions();