import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../mocks/auth.js';
import { listActivities } from '../mocks/data.js';

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth);

activitiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(listActivities());
  }),
);
