import { Router } from 'express';
import type { HealthResponse } from '@starter/shared';
import { checkDatabaseConnection } from '../db/pool.js';
import { asyncHandler } from '../middleware.js';

export const healthRouter = Router();
healthRouter.get('/', asyncHandler(async (_req, res) => {
  try {
    await checkDatabaseConnection();
    const response: HealthResponse = {
      status: 'ok',
      database: 'connected',
      message: 'API and database are available.',
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error('Database health check failed:', error);
    const response: HealthResponse = {
      status: 'error',
      database: 'disconnected',
      message: 'Database unavailable.',
      timestamp: new Date().toISOString(),
    };
    res.status(503).json(response);
  }
}));
