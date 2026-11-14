import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob } = await createTestApp();

const DEFAULTS = { font_size: 'medium', contrast: 'normal', sound_on: true };

beforeEach(() => resetStore());

describe('GET /api/settings (task 5.4)', () => {
  it('requires a valid token', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTypeOf('string');
  });

  it('returns the persisted defaults for a new user', async () => {
    const res = await request(app).get('/api/settings').set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(DEFAULTS);
  });
});

describe('PUT /api/settings (task 5.4)', () => {
  it('updates font size, contrast and sound, and persists them', async () => {
    const patch = { font_size: 'large', contrast: 'high', sound_on: false };
    const updated = await request(app).put('/api/settings').set(alice).send(patch);
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject(patch);
    const read = await request(app).get('/api/settings').set(alice);
    expect(read.body).toMatchObject(patch);
  });

  it('accepts a partial update and keeps the other fields', async () => {
    const res = await request(app).put('/api/settings').set(alice).send({ font_size: 'small' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ font_size: 'small', contrast: 'normal', sound_on: true });
  });

  it('rejects invalid values with 400', async () => {
    for (const body of [
      { font_size: 'huge' },
      { contrast: 'dark' },
      { sound_on: 'yes' },
      { font_size: 12 },
    ]) {
      const res = await request(app).put('/api/settings').set(alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it("keeps each user's settings isolated", async () => {
    await request(app).put('/api/settings').set(alice).send({ font_size: 'large', sound_on: false });
    const bobSettings = await request(app).get('/api/settings').set(bob);
    expect(bobSettings.status).toBe(200);
    expect(bobSettings.body).toMatchObject(DEFAULTS);
  });
});

describe('profile name editing (task 5.4, FR-SET-01)', () => {
  it('updates the own name while email and role stay read-only', async () => {
    const before = await request(app).get('/api/auth/me').set(alice);
    expect(before.status).toBe(200);
    const updated = await request(app)
      .put('/api/auth/me')
      .set(alice)
      .send({ name: 'Alice Updated', email: 'hacker@example.com', role: 'ot' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Alice Updated');
    expect(updated.body.email).toBe(before.body.email);
    expect(updated.body.role).toBe(before.body.role);
    const read = await request(app).get('/api/auth/me').set(alice);
    expect(read.body.name).toBe('Alice Updated');
  });

  it('rejects a blank name with 400', async () => {
    const res = await request(app).put('/api/auth/me').set(alice).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('requires a valid token', async () => {
    const res = await request(app).put('/api/auth/me').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});