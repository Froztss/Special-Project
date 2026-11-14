import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetStore } from '../mocks/data.js';

const alice = { Authorization: 'Bearer 1' };
const bob = { Authorization: 'Bearer 2' };
const DATE = '2026-11-14';

beforeEach(() => {
  resetStore();
});

function createSchedule(body: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/schedules')
    .set(alice)
    .send({ childId: 1, date: DATE, ...body });
}

describe('schedule auth', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/schedules').query({ childId: 1, date: DATE });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects an unknown token', async () => {
    const res = await request(app)
      .get('/api/schedules')
      .set({ Authorization: 'Bearer 999' })
      .query({ childId: 1, date: DATE });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/schedules', () => {
  it('creates a schedule for an owned child', async () => {
    const res = await createSchedule();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ child_id: 1, schedule_date: DATE, tasks: [] });
    expect(res.body.id).toBeTypeOf('number');
  });

  it('rejects a duplicate child + date with 409', async () => {
    await createSchedule();
    const res = await createSchedule();
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it('allows the same date for a different child', async () => {
    await createSchedule();
    const res = await createSchedule({ childId: 2 });
    expect(res.status).toBe(201);
  });

  it('returns 404 for another user\'s child', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set(bob)
      .send({ childId: 1, date: DATE });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown child', async () => {
    const res = await createSchedule({ childId: 999 });
    expect(res.status).toBe(404);
  });

  it('rejects invalid input with 400', async () => {
    for (const body of [
      { childId: 1, date: '14-11-2026' },
      { childId: 1, date: '2026-02-30' },
      { childId: 1 },
      { date: DATE },
      { childId: 0, date: DATE },
    ]) {
      const res = await request(app).post('/api/schedules').set(alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  it('copies tasks from another date as pending', async () => {
    const source = await createSchedule({ date: '2026-11-13' });
    const first = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: source.body.id, activityId: 2 });
    await request(app)
      .put(`/api/tasks/${first.body.id}`)
      .set(alice)
      .send({ start_time: '07:30', duration_min: 10 });
    await request(app).patch(`/api/tasks/${first.body.id}/complete`).set(alice).send({ done: true });
    await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: source.body.id, name: 'Custom chore', icon: '⭐' });

    const res = await createSchedule({ copyFrom: '2026-11-13' });
    expect(res.status).toBe(201);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0]).toMatchObject({
      name: 'Brush teeth',
      start_time: '07:30',
      duration_min: 10,
      position: 1,
      status: 'pending',
      completed_at: null,
    });
    expect(res.body.tasks[1]).toMatchObject({ name: 'Custom chore', position: 2, status: 'pending' });
  });

  it('returns 404 and creates nothing when the copy source is missing', async () => {
    const res = await createSchedule({ copyFrom: '2026-11-01' });
    expect(res.status).toBe(404);
    const check = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(check.status).toBe(404);
  });
});

describe('GET /api/schedules', () => {
  it('returns the schedule with tasks ordered by position', async () => {
    const created = await createSchedule();
    const ids: number[] = [];
    for (const activityId of [1, 2, 3]) {
      const res = await request(app)
        .post('/api/tasks')
        .set(alice)
        .send({ scheduleId: created.body.id, activityId });
      ids.push(res.body.id);
    }
    await request(app).put(`/api/tasks/${ids[2]}`).set(alice).send({ position: 1 });

    const res = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(res.status).toBe(200);
    expect(res.body.schedule_date).toBe(DATE);
    expect(res.body.tasks.map((t: { id: number }) => t.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(res.body.tasks.map((t: { position: number }) => t.position)).toEqual([1, 2, 3]);
  });

  it('returns 404 when no schedule exists for the date', async () => {
    const res = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: '2026-11-20' });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's child", async () => {
    await createSchedule();
    const res = await request(app)
      .get('/api/schedules')
      .set(bob)
      .query({ childId: 1, date: DATE });
    expect(res.status).toBe(404);
  });

  it('rejects a bad query with 400', async () => {
    const res = await request(app).get('/api/schedules').set(alice).query({ childId: 1, date: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set(alice)
      .set('Content-Type', 'application/json')
      .send('{"childId":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('PUT /api/schedules/:id', () => {
  it('moves the schedule to a new date', async () => {
    const created = await createSchedule();
    const res = await request(app)
      .put(`/api/schedules/${created.body.id}`)
      .set(alice)
      .send({ date: '2026-11-15' });
    expect(res.status).toBe(200);
    expect(res.body.schedule_date).toBe('2026-11-15');

    const oldDate = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(oldDate.status).toBe(404);
  });

  it('returns 409 when the target date already has a schedule', async () => {
    const first = await createSchedule();
    await createSchedule({ date: '2026-11-15' });
    const res = await request(app)
      .put(`/api/schedules/${first.body.id}`)
      .set(alice)
      .send({ date: '2026-11-15' });
    expect(res.status).toBe(409);
  });

  it("returns 404 for another user's schedule", async () => {
    const created = await createSchedule();
    const res = await request(app)
      .put(`/api/schedules/${created.body.id}`)
      .set(bob)
      .send({ date: '2026-11-15' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid date with 400', async () => {
    const created = await createSchedule();
    const res = await request(app)
      .put(`/api/schedules/${created.body.id}`)
      .set(alice)
      .send({ date: '2026-13-01' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/schedules/:id', () => {
  it('deletes the schedule and its tasks', async () => {
    const created = await createSchedule();
    const task = await request(app)
      .post('/api/tasks')
      .set(alice)
      .send({ scheduleId: created.body.id, activityId: 1 });

    const res = await request(app).delete(`/api/schedules/${created.body.id}`).set(alice);
    expect(res.status).toBe(200);

    const gone = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(gone.status).toBe(404);
    const taskGone = await request(app).put(`/api/tasks/${task.body.id}`).set(alice).send({ duration_min: 5 });
    expect(taskGone.status).toBe(404);
  });

  it("returns 404 for another user's schedule", async () => {
    const created = await createSchedule();
    const res = await request(app).delete(`/api/schedules/${created.body.id}`).set(bob);
    expect(res.status).toBe(404);
  });
});