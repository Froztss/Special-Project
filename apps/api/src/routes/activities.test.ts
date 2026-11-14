import type { Activity } from '@starter/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../testing/testApp.js';

const { app, alice, bob } = await createTestApp();

describe('GET /api/activities', () => {
  it('requires a valid token', async () => {
    for (const token of [undefined, 'Bearer 999']) {
      const req = request(app).get('/api/activities');
      if (token) req.set('Authorization', token);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it('serves the same predefined library to both users, with stable ids and categories', async () => {
    const first = await request(app).get('/api/activities').set(alice);
    const second = await request(app).get('/api/activities').set(bob);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(second.body);
    const activities = first.body as Activity[];
    expect(activities.map((activity) => activity.name)).toEqual(expect.arrayContaining([
      'Wake up', 'Brush teeth', 'Wash hands', 'Eat breakfast', 'Get dressed',
      'Toilet', 'Go to school', 'Learning activity', 'Play', 'Bath', 'Get ready for bed',
    ]));
    expect(new Set(activities.map((activity) => activity.id)).size).toBe(activities.length);
    expect(new Set(activities.map((activity) => activity.category))).toEqual(
      new Set(['hygiene', 'food', 'school', 'play', 'other']),
    );
    for (const activity of activities) {
      expect(activity.id).toBeGreaterThan(0);
      expect(activity.name.length).toBeGreaterThan(0);
      expect(activity.icon.length).toBeGreaterThan(0);
    }
  });
});
