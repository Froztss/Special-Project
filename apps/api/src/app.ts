import cors from 'cors';
import express from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import { errorHandler } from './lib/errors.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { schedulesRouter } from './routes/schedules.js';
import { tasksRouter } from './routes/tasks.js';
import { MySqlUserRepository } from './users/mysqlUserRepository.js';
import type { UserRepository } from './users/userRepository.js';

export function createApp(users: UserRepository = new MySqlUserRepository()) {
const app = express();
app.disable('x-powered-by');
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || origin === frontendOrigin);
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter(users));
app.use('/api/schedules', requireAuth(users), schedulesRouter);
app.use('/api/tasks', requireAuth(users), tasksRouter);
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);
return app;
}

export const app = createApp();
