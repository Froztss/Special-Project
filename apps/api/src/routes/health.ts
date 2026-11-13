import { Router } from 'express';
import type { HealthResponse } from '@starter/shared';

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    message: 'Your TypeScript API is running.',
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});
