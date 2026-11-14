// Mock stand-in for Group 2 auth: the Bearer token is simply the mock user id.
// Replace with real JWT verification (requireAuth) when Group 2 lands.
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.js';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'caregiver' | 'ot' | 'sped_teacher';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const mockUsers: AuthUser[] = [
  { id: 1, name: 'Alice Caregiver', email: 'alice@example.com', role: 'caregiver' },
  { id: 2, name: 'Bob OT', email: 'bob@example.com', role: 'ot' },
];

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required');
  }
  const user = mockUsers.find((u) => String(u.id) === header.slice(7).trim());
  if (!user) {
    throw new HttpError(401, 'Invalid or expired token');
  }
  req.user = user;
  next();
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }
  return req.user;
}