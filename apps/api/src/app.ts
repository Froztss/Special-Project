import express from 'express';
import { errorHandler } from './lib/errors.js';
import { healthRouter } from './routes/health.js';
import { schedulesRouter } from './routes/schedules.js';
import { tasksRouter } from './routes/tasks.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/tasks', tasksRouter);
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);
