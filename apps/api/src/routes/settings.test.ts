import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../testing/testApp.js';

const { app, alice, bob, group5Repository } = await createTestApp();

beforeEach(() => {
  group5Repository.reset();
});

describe('/api/settings', () => {
  it('returns defaults and persists updates independently per user', async () => {
    const initial = await request(app).get('/api/settings').set(alice);
    expect(initial.status).toBe(200);
    expect(initial.body).toEqual({ font_size: 'medium', contrast: 'normal', sound_on: true });

    const updated = await request(app)
      .put('/api/settings')
      .set(alice)
      .send({ font_size: 'large', contrast: 'high', sound_on: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ font_size: 'large', contrast: 'high', sound_on: false });

    const persisted = await request(app).get('/api/settings').set(alice);
    expect(persisted.body).toEqual(updated.body);
    const otherUser = await request(app).get('/api/settings').set(bob);
    expect(otherUser.body).toEqual({ font_size: 'medium', contrast: 'normal', sound_on: true });
  });

  it('requires authentication and rejects invalid settings', async () => {
    const missingAuth = await request(app).get('/api/settings');
    expect(missingAuth.status).toBe(401);
    for (const body of [
      { font_size: 'extra-large', contrast: 'normal', sound_on: true },
      { font_size: 'small', contrast: 'low', sound_on: true },
      { font_size: 'small', contrast: 'high', sound_on: 'yes' },
      { font_size: 'small', contrast: 'high' },
    ]) {
      const invalid = await request(app).put('/api/settings').set(alice).send(body);
      expect(invalid.status).toBe(400);
    }
  });
});

describe('/api/auth/me', () => {
  it('returns the current profile and updates only its name', async () => {
    const initial = await request(app).get('/api/auth/me').set(alice);
    expect(initial.status).toBe(200);
    expect(initial.body).toMatchObject({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'caregiver',
    });

    const updated = await request(app)
      .patch('/api/auth/me')
      .set(alice)
      .send({ name: 'Alice Updated' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ id: 1, name: 'Alice Updated' });
    expect(updated.body.email).toBe('alice@example.com');

    const persisted = await request(app).get('/api/auth/me').set(alice);
    expect(persisted.body.name).toBe('Alice Updated');
    const otherUser = await request(app).get('/api/auth/me').set(bob);
    expect(otherUser.body.name).toBe('Bob');
  });

  it('rejects invalid profile updates and unauthenticated access', async () => {
    const missingAuth = await request(app).patch('/api/auth/me').send({ name: 'New Name' });
    expect(missingAuth.status).toBe(401);

    for (const body of [{ name: '  ' }, { name: 'Valid', email: 'change@example.com' }, {}]) {
      const invalid = await request(app).patch('/api/auth/me').set(alice).send(body);
      expect(invalid.status).toBe(400);
    }
  });
});
