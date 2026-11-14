import express from 'express';
import { errorHandler, notFoundHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { InMemoryUserRepository, type UserRepository } from './users/userRepository.js';

export function createApp(users: UserRepository = new InMemoryUserRepository()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter(users));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();