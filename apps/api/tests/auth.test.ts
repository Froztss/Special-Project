import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { InMemoryUserRepository } from '../src/users/userRepository.js';

const valid = { name: 'Ana', email: 'ana@example.com', password: 'password123', role: 'caregiver' };
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(new InMemoryUserRepository());
});

async function loginToken(): Promise<string> {
  await request(app).post('/api/auth/register').send(valid);
  const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
  return res.body.token;
}

describe('register', () => {
  it('creates a user without exposing the hash', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, name: 'Ana', email: 'ana@example.com', role: 'caregiver' });
  });

  it.each([
    ['missing name', { ...valid, name: '' }],
    ['bad email', { ...valid, email: 'nope' }],
    ['short password', { ...valid, password: 'short' }],
    ['bad role', { ...valid, role: 'admin' }],
    ['no body', undefined],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'ANA@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  it('returns a JWT that expires in 8 hours', async () => {
    const token = await loginToken();
    const payload = jwt.decode(token) as { sub: string; iat: number; exp: number };
    expect(payload.sub).toBe('1');
    expect(payload.exp - payload.iat).toBe(8 * 3600);
  });

  it('gives the same generic 401 for wrong password and unknown email', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const wrong = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'wrongpass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'wrongpass1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});

describe('me / protected routes', () => {
  it('returns id, name, email, role for a valid token', async () => {
    const token = await loginToken();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Ana', email: 'ana@example.com', role: 'caregiver' });
  });

  it('rejects a missing token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    await loginToken();
    const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: '1', expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with another secret', async () => {
    await loginToken();
    const forged = jwt.sign({}, 'some-other-secret-value-xx', { subject: '1' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('errors', () => {
  it('keeps the JSON 404 and returns 400 for malformed JSON', async () => {
    expect((await request(app).get('/api/nope')).body).toEqual({ error: 'Not found' });
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request body' });
  });
});