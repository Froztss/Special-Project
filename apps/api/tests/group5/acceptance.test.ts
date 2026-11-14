import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob } = await createTestApp();

const DATE = '2026-11-14';

beforeEach(() => resetStore());

describe('MVP acceptance through the API (task 5.6, SRS 9.1)', () => {
  it('item 1: a staff user can register, log in and log out', async () => {
    const email = 'accept@example.com';
    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Accept', email, password: 'password123', role: 'caregiver' });
    expect(registered.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(login.status).toBe(200);
    const token = { Authorization: `Bearer ${login.body.token as string}` };
    expect((await request(app).get('/api/auth/me').set(token)).status).toBe(200);
    // Logout is client-side: clearing the token must revoke access.
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('item 2: create, edit and delete a child profile, seeing only own children', async () => {
    const created = await request(app).post('/api/children').set(alice).send({
      name: 'Accept Kid', age: 6, delay_domain: 'speech',
    });
    expect(created.status).toBe(201);
    const id = created.body.id as number;
    const edited = await request(app).put(`/api/children/${id}`).set(alice).send({ age: 7 });
    expect(edited.status).toBe(200);
    expect(edited.body.age).toBe(7);
    expect((await request(app).get(`/api/children/${id}`).set(bob)).status).toBe(404);
    const deleted = await request(app).delete(`/api/children/${id}`).set(alice);
    expect(deleted.status).toBe(200);
    expect((await request(app).get(`/api/children/${id}`).set(alice)).status).toBe(404);
  });

  it('item 3: create a schedule, add, reorder and remove activities, and save it', async () => {
    const schedule = await request(app).post('/api/schedules').set(alice).send({ childId: 1, date: DATE });
    expect(schedule.status).toBe(201);
    const ids: number[] = [];
    for (const activityId of [1, 2, 3]) {
      const task = await request(app)
        .post('/api/tasks')
        .set(alice)
        .send({ scheduleId: schedule.body.id, activityId });
      expect(task.status).toBe(201);
      ids.push(task.body.id as number);
    }
    const reordered = await request(app).put(`/api/tasks/${ids[2]}`).set(alice).send({ position: 1 });
    expect(reordered.status).toBe(200);
    const removed = await request(app).delete(`/api/tasks/${ids[0]}`).set(alice);
    expect(removed.status).toBe(200);
    const saved = await request(app).get('/api/schedules').set(alice).query({ childId: 1, date: DATE });
    expect(saved.status).toBe(200);
    expect(saved.body.tasks.map((t: { id: number }) => t.id)).toEqual([ids[2], ids[1]]);
  });

  it("item 4: today's tasks can be marked done and the status persists after reload", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const schedule = await request(app).post('/api/schedules').set(alice).send({ childId: 1, date: today });
    expect(schedule.status).toBe(201);
    const task = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: schedule.body.id, activityId: 1 });
    expect(task.status).toBe(201);
    const done = await request(app).patch(`/api/tasks/${task.body.id}/complete`).set(alice).send({ done: true });
    expect(done.status).toBe(200);
    const reload = await request(app).get('/api/schedules').set(alice).query({ childId: 1, date: today });
    expect(reload.body.tasks[0].status).toBe('done');
    expect(Number.isNaN(Date.parse(reload.body.tasks[0].completed_at))).toBe(false);
  });

  it('item 5: the communication board serves cards with a label and icon to speak', async () => {
    const res = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(res.status).toBe(200);
    const water = (res.body as { label: string; icon: string }[]).find((card) => card.label === 'Water');
    expect(water).toBeTruthy();
    expect(water!.icon.length).toBeGreaterThan(0);
  });

  it("item 6: the dashboard shows today's completion and a 7-day summary", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const schedule = await request(app).post('/api/schedules').set(alice).send({ childId: 1, date: today });
    const task = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: schedule.body.id, activityId: 1 });
    await request(app).patch(`/api/tasks/${task.body.id}/complete`).set(alice).send({ done: true });
    const res = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(res.status).toBe(200);
    expect(res.body.today).toMatchObject({ done: 1, total: 1 });
    expect(res.body.days).toHaveLength(7);
  });

  it.todo('item 5: TTS speaks a tapped card and builds a phrase (client-side, FR-COMM-03/04)');
  it.todo('item 7: responsive layout on phone and desktop screens (client-side, NFR-COMP-01)');
});

describe('documentation completeness (task 5.6, NFR-MAIN-02)', () => {
  it('ships a README with setup steps', async () => {
    const readme = await readFile(new URL('../../../../README.md', import.meta.url), 'utf8');
    expect(readme.length).toBeGreaterThan(0);
    expect(readme.toLowerCase()).toContain('mysql');
  });

  it('keeps a complete .env.example template', async () => {
    const env = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
    for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'FRONTEND_ORIGIN']) {
      expect(env).toContain(key);
    }
  });
});