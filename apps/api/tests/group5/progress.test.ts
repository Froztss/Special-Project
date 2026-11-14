import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob } = await createTestApp();

function isoDay(offset = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function buildDay(childId: number, date: string, total: number, done: number, headers = alice) {
  const schedule = await request(app).post('/api/schedules').set(headers).send({ childId, date });
  expect(schedule.status).toBe(201);
  const ids: number[] = [];
  for (let i = 0; i < total; i += 1) {
    const task = await request(app)
      .post('/api/tasks')
      .set(headers)
      .send({ scheduleId: schedule.body.id, activityId: i + 1 });
    expect(task.status).toBe(201);
    ids.push(task.body.id as number);
  }
  for (let i = 0; i < done; i += 1) {
    const res = await request(app).patch(`/api/tasks/${ids[i]}/complete`).set(headers).send({ done: true });
    expect(res.status).toBe(200);
  }
  return schedule.body.id as number;
}

beforeEach(() => resetStore());

describe('GET /api/progress/:childId (task 5.3)', () => {
  it('requires a valid token', async () => {
    const res = await request(app).get('/api/progress/1').query({ range: '7d' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTypeOf('string');
  });

  it("reports today's done, total and completion percentage", async () => {
    await buildDay(1, isoDay(0), 3, 1);
    const res = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(res.status).toBe(200);
    expect(res.body.today).toMatchObject({ done: 1, total: 3 });
    expect(res.body.today.percentage).toBeCloseTo(100 / 3, 0);
  });

  it('reports zero percentage when there are no tasks today', async () => {
    await buildDay(1, isoDay(0), 0, 0);
    const res = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(res.status).toBe(200);
    expect(res.body.today).toMatchObject({ done: 0, total: 0, percentage: 0 });
  });

  it('summarizes completion for each of the last seven days', async () => {
    await buildDay(1, isoDay(0), 4, 4);
    await buildDay(1, isoDay(-1), 2, 1);
    const res = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(7);
    const dates = (res.body.days as { date: string }[]).map((day) => day.date);
    expect(dates).toContain(isoDay(0));
    expect(dates).toContain(isoDay(-6));
    const today = (res.body.days as { date: string; done: number; total: number }[])
      .find((day) => day.date === isoDay(0));
    expect(today).toMatchObject({ done: 4, total: 4 });
    const yesterday = (res.body.days as { date: string; done: number; total: number }[])
      .find((day) => day.date === isoDay(-1));
    expect(yesterday).toMatchObject({ done: 1, total: 2 });
  });

  it('lists recent completions with a date and time', async () => {
    await buildDay(1, isoDay(0), 2, 1);
    const res = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recent)).toBe(true);
    expect(res.body.recent.length).toBeGreaterThan(0);
    const entry = res.body.recent[0];
    expect(entry.name).toBeTypeOf('string');
    expect(Number.isNaN(Date.parse(entry.completed_at))).toBe(false);
  });

  it('rejects a malformed childId or range with 400', async () => {
    const badId = await request(app).get('/api/progress/abc').set(alice).query({ range: '7d' });
    expect(badId.status).toBe(400);
    const badRange = await request(app).get('/api/progress/1').set(alice).query({ range: 'forever' });
    expect(badRange.status).toBe(400);
  });

  it("returns 404 for another user's child", async () => {
    await buildDay(1, isoDay(0), 1, 0);
    const owned = await request(app).get('/api/progress/1').set(alice).query({ range: '7d' });
    expect(owned.status).toBe(200);
    const foreign = await request(app).get('/api/progress/1').set(bob).query({ range: '7d' });
    expect(foreign.status).toBe(404);
  });
});