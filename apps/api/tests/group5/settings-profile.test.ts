import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob, group5Repository } = await createTestApp();

const DEFAULTS = { font_size: 'medium', contrast: 'normal', sound_on: true };

beforeEach(() => {
  resetStore();
  group5Repository.reset();
});

describe('GET /api/settings (task 5.4)', () => {
  it('requires a valid token', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTypeOf('string');
  });

  it('returns the persisted defaults for a new user', async () => {
    const res = await request(app).get('/api/settings').set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULTS);
  });
});

describe('PUT /api/settings (task 5.4)', () => {
  it('updates font size, contrast and sound, and persists them', async () => {
    const patch = { font_size: 'large', contrast: 'high', sound_on: false };
    const updated = await request(app).put('/api/settings').set(alice).send(patch);
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(patch);
    const read = await request(app).get('/api/settings').set(alice);
    expect(read.body).toEqual(patch);
  });

  it('rejects a partial update that omits a required field with 400', async () => {
    const res = await request(app).put('/api/settings').set(alice).send({ font_size: 'small' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid values with 400', async () => {
    for (const body of [
      { font_size: 'huge', contrast: 'normal', sound_on: true },
      { font_size: 'small', contrast: 'dark', sound_on: true },
      { font_size: 'small', contrast: 'normal', sound_on: 'yes' },
      { font_size: 12, contrast: 'normal', sound_on: true },
    ]) {
      const res = await request(app).put('/api/settings').set(alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it("keeps each user's settings isolated", async () => {
    await request(app).put('/api/settings').set(alice).send({ font_size: 'large', contrast: 'high', sound_on: false });
    const bobSettings = await request(app).get('/api/settings').set(bob);
    expect(bobSettings.status).toBe(200);
    expect(bobSettings.body).toEqual(DEFAULTS);
  });
});

describe('profile name editing (task 5.4, FR-SET-01)', () => {
  it('updates the own name while email and role stay read-only', async () => {
    const before = await request(app).get('/api/auth/me').set(alice);
    expect(before.status).toBe(200);
    const updated = await request(app).patch('/api/auth/me').set(alice).send({ name: 'Alice Updated' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Alice Updated');
    expect(updated.body.email).toBe(before.body.email);
    expect(updated.body.role).toBe(before.body.role);
    const read = await request(app).get('/api/auth/me').set(alice);
    expect(read.body.name).toBe('Alice Updated');
  });

  it('rejects attempts to change read-only fields with 400', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set(alice)
      .send({ name: 'Valid', email: 'hacker@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a blank or missing name with 400', async () => {
    for (const body of [{ name: '   ' }, {}]) {
      const res = await request(app).patch('/api/auth/me').set(alice).send(body);
      expect(res.status).toBe(400);
    }
  });

  it('requires a valid token', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});