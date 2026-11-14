import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../mocks/data.js';
import { createTestApp } from '../testing/testApp.js';
const { app, alice } = await createTestApp();

function dateOffset(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

beforeEach(() => {
  resetStore();
});

async function createSchedule(childId: number, date: string) {
  return request(app)
    .post('/api/schedules')
    .set(alice)
    .send({ childId, date });
}

async function addTask(scheduleId: number, activityId: number, done = false) {
  const created = await request(app).post('/api/tasks').set(alice).send({ scheduleId, activityId });
  if (done) {
    await request(app)
      .patch(`/api/tasks/${created.body.id}/complete`)
      .set(alice)
      .send({ done: true });
  }
  return created.body;
}

describe('GET /api/progress/:childId', () => {
  it('summarizes today, the inclusive seven-day window, and recent completions', async () => {
    const todaySchedule = await createSchedule(1, dateOffset(0));
    const yesterdaySchedule = await createSchedule(1, dateOffset(-1));
    await addTask(todaySchedule.body.id, 1, true);
    await addTask(todaySchedule.body.id, 2, true);
    await addTask(todaySchedule.body.id, 3);
    await addTask(yesterdaySchedule.body.id, 4, true);
    await addTask(yesterdaySchedule.body.id, 5);

    const res = await request(app).get('/api/progress/1').set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      child_id: 1,
      range: '7d',
      today: { date: dateOffset(0), done: 2, total: 3, percentage: 67 },
    });
    expect(res.body.last_7_days).toHaveLength(7);
    expect(res.body.last_7_days[5]).toMatchObject({
      date: dateOffset(-1),
      done: 1,
      total: 2,
      percentage: 50,
    });
    expect(res.body.last_7_days[0]).toMatchObject({ done: 0, total: 0, percentage: 0 });
    expect(res.body.recent_completions).toHaveLength(3);
    expect(res.body.recent_completions[0]).toMatchObject({
      task_id: expect.any(Number),
      name: expect.any(String),
      icon: expect.any(String),
      completed_at: expect.any(String),
    });
    expect(Date.parse(res.body.recent_completions[0].completed_at)).not.toBeNaN();
  });

  it('returns zero completion for days without schedules and enforces child ownership', async () => {
    const empty = await request(app).get('/api/progress/2').set(alice);
    expect(empty.status).toBe(200);
    expect(empty.body.today).toMatchObject({ done: 0, total: 0, percentage: 0 });
    expect(empty.body.last_7_days).toHaveLength(7);

    const crossUser = await request(app).get('/api/progress/3').set(alice);
    expect(crossUser.status).toBe(404);
    const missingAuth = await request(app).get('/api/progress/1');
    expect(missingAuth.status).toBe(401);
  });

  it('rejects invalid child ids and unsupported ranges', async () => {
    const invalidId = await request(app).get('/api/progress/0').set(alice);
    expect(invalidId.status).toBe(400);
    const invalidRange = await request(app)
      .get('/api/progress/1')
      .set(alice)
      .query({ range: '30d' });
    expect(invalidRange.status).toBe(400);
  });
});
