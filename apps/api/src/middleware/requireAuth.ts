import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config.js';
import { HttpError } from '../lib/errors.js';
import type { PublicUser, UserRepository } from '../users/userRepository.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser;
  }
}

/** The authenticated user; only valid on routes behind equireAuth. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  return req.user;
}

/** Verifies the Bearer token and attaches the user to the request (FR-AUTH-05). */
export function requireAuth(users: UserRepository): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const match = header?.match(/^Bearer (.+)$/);
    if (!match) throw new HttpError(401, 'Authentication required');

    let userId: number;
    try {
      const payload = jwt.verify(match[1]!, getJwtSecret(), { algorithms: ['HS256'] });
      userId = Number(typeof payload === 'object' ? payload.sub : NaN);
    } catch {
      throw new HttpError(401, 'Invalid or expired token');
    }
    const user = Number.isInteger(userId) ? await users.findById(userId) : null;
    if (!user) throw new HttpError(401, 'Invalid or expired token');
    req.user = user;
    next();
  };
}