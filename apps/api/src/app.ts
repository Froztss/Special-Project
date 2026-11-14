import cors from 'cors';
import express from 'express';
import { errorHandler } from './lib/errors.js';
import { activitiesRouter } from './routes/activities.js';
import { childrenRouter } from './routes/children.js';
import { healthRouter } from './routes/health.js';
import { schedulesRouter } from './routes/schedules.js';
import { tasksRouter } from './routes/tasks.js';

export const app = express();
app.disable('x-powered-by');
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || origin === frontendOrigin);
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
app.use('/api/children', childrenRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/tasks', tasksRouter);
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);
