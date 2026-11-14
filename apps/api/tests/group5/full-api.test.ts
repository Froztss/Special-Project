import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob } = await createTestApp();

const DATE = '2026-11-14';

const PROTECTED: [string, string][] = [
  ['get', '/api/children'],
  ['post', '/api/children'],
  ['get', '/api/activities'],
  ['get', '/api/schedules?childId=1&date=2026-11-14'],
  ['post', '/api/schedules'],
  ['post', '/api/tasks'],
  ['get', '/api/cards?childId=1'],
  ['post', '/api/cards'],
  ['get', '/api/progress/1?range=7d'],
  ['get', '/api/settings'],
  ['put', '/api/settings'],
  ['get', '/api/auth/me'],
];

beforeEach(() => resetStore());

describe('uniform authentication guard (task 5.5)', () => {
  it.each(PROTECTED)('rejects %s %s without a token', async (method, path) => {
    const res = await (request(app) as Record<string, (p: string) => request.Test>)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTypeOf('string');
  });
});

describe('uniform error shape (task 5.5)', () => {
  it('returns { error: string } for validation, auth and not-found failures', async () => {
    const failures = [
      request(app).post('/api/children').set(alice).send({}),
      request(app).get('/api/children/1').set({ Authorization: 'Bearer 999' }),
      request(app).get('/api/children/999').set(alice),
      request(app).get('/api/no-such-route').set(alice),
    ];
    for (const res of await Promise.all(failures)) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(Object.keys(res.body)).toEqual(['error']);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it('keeps the JSON 404 fallback for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});

describe('cross-user isolation across resources (task 5.5)', () => {
  it("denies user B access to user A's child, schedule, task and cards", async () => {
    const child = await request(app).get('/api/children/1').set(alice);
    expect(child.status).toBe(200);
    const schedule = await request(app).post('/api/schedules').set(alice).send({ childId: 1, date: DATE });
    expect(schedule.status).toBe(201);
    const task = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: schedule.body.id, activityId: 1 });
    expect(task.status).toBe(201);
    const cards = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(cards.status).toBe(200);

    expect((await request(app).get('/api/children/1').set(bob)).status).toBe(404);
    expect((await request(app).put('/api/children/1').set(bob).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).delete('/api/children/1').set(bob)).status).toBe(404);
    expect((await request(app).get('/api/schedules').set(bob).query({ childId: 1, date: DATE })).status).toBe(404);
    expect((await request(app).put(`/api/tasks/${task.body.id}`).set(bob).send({ duration_min: 5 })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${task.body.id}`).set(bob)).status).toBe(404);
    expect((await request(app).get('/api/cards').set(bob).query({ childId: 1 })).status).toBe(404);
    expect((await request(app).get('/api/progress/1').set(bob).query({ range: '7d' })).status).toBe(404);
  });
});

describe('end-to-end MVP flow through the API (task 5.5)', () => {
  it('register → child → schedule → tasks → complete → cards → progress → settings', async () => {
    const child = await request(app).post('/api/children').set(alice).send({
      name: 'Flow', age: 5, delay_domain: 'speech',
    });
    expect(child.status).toBe(201);
    const schedule = await request(app)
      .post('/api/schedules')
      .set(alice)
      .send({ childId: child.body.id, date: DATE });
    expect(schedule.status).toBe(201);
    const task = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: schedule.body.id, activityId: 2 });
    expect(task.status).toBe(201);
    const done = await request(app).patch(`/api/tasks/${task.body.id}/complete`).set(alice).send({ done: true });
    expect(done.status).toBe(200);

    const cards = await request(app).get('/api/cards').set(alice).query({ childId: child.body.id });
    expect(cards.status).toBe(200);
    const progress = await request(app)
      .get(`/api/progress/${child.body.id}`)
      .set(alice)
      .query({ range: '7d' });
    expect(progress.status).toBe(200);
    expect(progress.body.today).toMatchObject({ done: 1, total: 1 });
    const settings = await request(app).put('/api/settings').set(alice).send({ sound_on: false });
    expect(settings.status).toBe(200);
  });
});