import { Router } from 'express';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import * as data from '../mocks/data.js';
import { createChildSchema, idParamSchema, updateChildSchema } from '@starter/shared';

export function childrenRouter(users: UserRepository): Router {
  const router = Router();
  router.use(requireAuth(users));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(data.listChildrenForUser(currentUser(req).id));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = parse(createChildSchema, req.body);
      const child = data.createChildForUser(currentUser(req).id, input);
      res.status(201).json(child);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parse(idParamSchema, req.params);
      const child = data.findChildForUser(id, currentUser(req).id);
      if (!child) throw new HttpError(404, 'Child not found');
      res.json(child);
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parse(idParamSchema, req.params);
      const patch = parse(updateChildSchema, req.body);
      const child = data.updateChildForUser(id, currentUser(req).id, patch);
      if (!child) throw new HttpError(404, 'Child not found');
      res.json(child);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parse(idParamSchema, req.params);
      if (!data.deleteChildForUser(id, currentUser(req).id)) {
        throw new HttpError(404, 'Child not found');
      }
      res.json({ success: true });
    }),
  );

  return router;
}
