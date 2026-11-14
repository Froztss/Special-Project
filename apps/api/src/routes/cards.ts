import { Router } from 'express';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import * as data from '../mocks/data.js';
import type { Group5Repository, PictureCard } from '../group5/repository.js';
import { CARD_CATEGORIES } from '../group5/repository.js';
import {
  cardQuerySchema,
  createCardSchema,
  idParamSchema,
  updateCardVisibilitySchema,
} from '@starter/shared';

export function cardsRouter(users: UserRepository, group5: Group5Repository): Router {
  const router = Router();
  router.use(requireAuth(users));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { childId, includeHidden } = parse(cardQuerySchema, req.query);
      if (!(await group5.ownsChild(childId, currentUser(req).id))) {
        throw new HttpError(404, 'Child not found');
      }

      const cards = await group5.listCardsForChild(childId, includeHidden);
      const groups = Object.fromEntries(
        CARD_CATEGORIES.map((category) => [
          category,
          cards.filter((card) => card.category === category),
        ]),
      );
      res.json(groups);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = parse(createCardSchema, req.body);
      if (!data.isPredefinedIcon(body.icon)) {
        throw new HttpError(400, 'icon must be one of the predefined icons');
      }

      const card: PictureCard | null = await group5.createCardForUser(currentUser(req).id, {
        childId: body.childId,
        category: body.category,
        label: body.label,
        icon: body.icon,
      });
      if (!card) throw new HttpError(404, 'Child not found');
      res.status(201).json(card);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parse(idParamSchema, req.params);
      const { hidden } = parse(updateCardVisibilitySchema, req.body);
      const card = await group5.setCardHiddenForUser(id, currentUser(req).id, hidden);
      if (!card) throw new HttpError(404, 'Card not found');
      res.json(card);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parse(idParamSchema, req.params);
      if (!(await group5.deleteCardForUser(id, currentUser(req).id))) {
        throw new HttpError(404, 'Card not found');
      }
      res.json({ success: true });
    }),
  );

  return router;
}
