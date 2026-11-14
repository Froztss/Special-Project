import { Router } from 'express';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import type { Group5Repository } from '../group5/repository.js';
import { updateSettingsSchema } from '@starter/shared';

export function settingsRouter(users: UserRepository, group5: Group5Repository): Router {
  const router = Router();
  router.use(requireAuth(users));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await group5.getSettings(currentUser(req).id));
    }),
  );

  router.put(
    '/',
    asyncHandler(async (req, res) => {
      const settings = parse(updateSettingsSchema, req.body);
      res.json(await group5.updateSettings(currentUser(req).id, settings));
    }),
  );

  return router;
}
