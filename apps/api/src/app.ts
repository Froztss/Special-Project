import cors from 'cors';
import express from 'express';
import { errorHandler, HttpError } from './middleware.js';
import { healthRouter } from './routes/health.js';

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
app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
app.use(errorHandler);
