import { Router } from 'express';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { listActivities } from '../mocks/data.js';

export function activitiesRouter(users: UserRepository): Router {
  const router = Router();
  router.use(requireAuth(users));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(listActivities());
  }),
);

  return router;
}
