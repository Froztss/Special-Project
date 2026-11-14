import cors from 'cors';
import express from 'express';
import { errorHandler } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { activitiesRouter } from './routes/activities.js';
import { cardsRouter } from './routes/cards.js';
import { childrenRouter } from './routes/children.js';
import { healthRouter } from './routes/health.js';
import { progressRouter } from './routes/progress.js';
import { schedulesRouter } from './routes/schedules.js';
import { settingsRouter } from './routes/settings.js';
import { tasksRouter } from './routes/tasks.js';
import { MySqlUserRepository } from './users/mysqlUserRepository.js';
import type { UserRepository } from './users/userRepository.js';
import { MySqlGroup5Repository } from './group5/repository.js';
import type { Group5Repository } from './group5/repository.js';

export function createApp(
  users: UserRepository = new MySqlUserRepository(),
  group5: Group5Repository = new MySqlGroup5Repository(),
) {
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
  app.use('/api/children', childrenRouter(users));
  app.use('/api/activities', activitiesRouter(users));
  app.use('/api/schedules', schedulesRouter(users));
  app.use('/api/tasks', tasksRouter(users));
  app.use('/api/cards', cardsRouter(users, group5));
  app.use('/api/progress', progressRouter(users));
  app.use('/api/settings', settingsRouter(users, group5));
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
