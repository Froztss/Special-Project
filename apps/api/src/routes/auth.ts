import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema } from '../auth/schemas.js';
import { getJwtSecret, JWT_EXPIRES_IN } from '../config.js';
import { HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import type { UserRepository } from '../users/userRepository.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown so login timing doesn't reveal it.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export function authRouter(users: UserRepository): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const input = parse(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await users.insert({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });
    if (!user) throw new HttpError(409, 'Email is already registered');
    res.status(201).json(user);
  });

  router.post('/login', async (req, res) => {
    const input = parse(loginSchema, req.body);
    const row = await users.findByEmailWithHash(input.email);
    const ok = await bcrypt.compare(input.password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !ok) throw new HttpError(401, 'Invalid email or password');

    const token = jwt.sign({}, getJwtSecret(), {
      algorithm: 'HS256',
      subject: String(row.id),
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({ token, user: { id: row.id, name: row.name, email: row.email, role: row.role } });
  });

  router.get('/me', requireAuth(users), (req, res) => {
    const { id, name, email, role } = req.user!;
    res.json({ id, name, email, role });
  });

  return router;
}