import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetStore } from '../mocks/data.js';

const alice = { Authorization: 'Bearer 1' };
const bob = { Authorization: 'Bearer 2' };
const DATE = '2026-11-14';

let scheduleId: number;

beforeEach(async () => {
  resetStore();
  const res = await request(app)
    .post('/api/schedules')
    .set(alice)
    .send({ childId: 1, date: DATE });
  scheduleId = res.body.id;
});

function addTask(body: Record<string, unknown>, headers = alice) {
  return request(app).post('/api/tasks').set(headers).send({ scheduleId, ...body });
}

describe('POST /api/tasks', () => {
  it('adds a library activity with its name and icon', async () => {
    const res = await addTask({ activityId: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      schedule_id: scheduleId,
      activity_id: 2,
      name: 'Brush teeth',
      icon: '🪥',
      position: 1,
      status: 'pending',
      start_time: null,
      duration_min: null,
      completed_at: null,
    });
  });

  it('adds a custom task with a predefined icon', async () => {
    const res = await addTask({ name: 'Water the plants', icon: '💧' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ activity_id: null, name: 'Water the plants', icon: '💧' });
  });

  it('appends tasks in order', async () => {
    const first = await addTask({ activityId: 1 });
    const second = await addTask({ activityId: 2 });
    expect(first.body.position).toBe(1);
    expect(second.body.position).toBe(2);
  });

  it('rejects invalid bodies with 400', async () => {
    for (const body of [
      { activityId: 999 },
      { name: 'No icon' },
      { icon: '⭐' },
      { name: 'Bad icon', icon: '🚀' },
      { activityId: 1, name: 'Both', icon: '⭐' },
      {},
      { name: '   ', icon: '⭐' },
    ]) {
      const res = await addTask(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  it('returns 404 for an unknown schedule', async () => {
    const res = await request(app).post('/api/tasks').set(alice).send({ scheduleId: 999, activityId: 1 });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's schedule", async () => {
    const res = await addTask({ activityId: 1 }, bob);
    expect(res.status).toBe(404);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).post('/api/tasks').send({ scheduleId, activityId: 1 });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('sets start_time and duration_min, and clears them with null', async () => {
    const task = await addTask({ activityId: 1 });
    const set = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .set(alice)
      .send({ start_time: '08:15', duration_min: 20 });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({ start_time: '08:15', duration_min: 20 });

    const cleared = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .set(alice)
      .send({ start_time: null, duration_min: null });
    expect(cleared.body).toMatchObject({ start_time: null, duration_min: null });
  });

  it('reorders tasks and resequences positions', async () => {
    const a = await addTask({ activityId: 1 });
    const b = await addTask({ activityId: 2 });
    const c = await addTask({ activityId: 3 });

    const res = await request(app).put(`/api/tasks/${c.body.id}`).set(alice).send({ position: 1 });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(1);

    const schedule = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(schedule.body.tasks.map((t: { id: number }) => t.id)).toEqual([
      c.body.id,
      a.body.id,
      b.body.id,
    ]);
    expect(schedule.body.tasks.map((t: { position: number }) => t.position)).toEqual([1, 2, 3]);
  });

  it('rejects invalid updates with 400', async () => {
    const task = await addTask({ activityId: 1 });
    for (const body of [
      { start_time: '25:00' },
      { start_time: '8:00' },
      { start_time: '08:60' },
      { duration_min: 0 },
      { duration_min: 1.5 },
      { position: 0 },
      { position: 5 },
      {},
    ]) {
      const res = await request(app).put(`/api/tasks/${task.body.id}`).set(alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  it("returns 404 for another user's task", async () => {
    const task = await addTask({ activityId: 1 });
    const res = await request(app).put(`/api/tasks/${task.body.id}`).set(bob).send({ duration_min: 5 });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tasks/:id/complete', () => {
  it('marks done with a completion timestamp, then undoes it', async () => {
    const task = await addTask({ activityId: 1 });

    const done = await request(app)
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(alice)
      .send({ done: true });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('done');
    expect(Number.isNaN(Date.parse(done.body.completed_at))).toBe(false);

    const undone = await request(app)
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(alice)
      .send({ done: false });
    expect(undone.body).toMatchObject({ status: 'pending', completed_at: null });
  });

  it('keeps the original completion time when completed again', async () => {
    const task = await addTask({ activityId: 1 });
    const first = await request(app)
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(alice)
      .send({ done: true });
    const second = await request(app)
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(alice)
      .send({ done: true });
    expect(second.body.completed_at).toBe(first.body.completed_at);
  });

  it('rejects a missing done flag with 400', async () => {
    const task = await addTask({ activityId: 1 });
    const res = await request(app).patch(`/api/tasks/${task.body.id}/complete`).set(alice).send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's task", async () => {
    const task = await addTask({ activityId: 1 });
    const res = await request(app)
      .patch(`/api/tasks/${task.body.id}/complete`)
      .set(bob)
      .send({ done: true });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('removes the task and resequences the rest', async () => {
    const a = await addTask({ activityId: 1 });
    const b = await addTask({ activityId: 2 });
    const c = await addTask({ activityId: 3 });

    const res = await request(app).delete(`/api/tasks/${a.body.id}`).set(alice);
    expect(res.status).toBe(200);

    const schedule = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(schedule.body.tasks.map((t: { id: number }) => t.id)).toEqual([b.body.id, c.body.id]);
    expect(schedule.body.tasks).toHaveLength(2);
    expect(schedule.body.tasks.map((t: { position: number }) => t.position)).toEqual([1, 2]);
  });

  it("returns 404 for another user's task", async () => {
    const task = await addTask({ activityId: 1 });
    const res = await request(app).delete(`/api/tasks/${task.body.id}`).set(bob);
    expect(res.status).toBe(404);
  });
});

describe('schedule/task lifecycle', () => {
  it('create → add → reorder → time → complete → undo survives re-reads', async () => {
    const wake = await addTask({ activityId: 1 });
    const teeth = await addTask({ activityId: 2 });
    const breakfast = await addTask({ activityId: 4 });

    await request(app).put(`/api/tasks/${breakfast.body.id}`).set(alice).send({ position: 2 });
    await request(app)
      .put(`/api/tasks/${teeth.body.id}`)
      .set(alice)
      .send({ start_time: '07:45', duration_min: 5 });
    await request(app).patch(`/api/tasks/${wake.body.id}/complete`).set(alice).send({ done: true });

    const mid = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(mid.body.tasks.map((t: { name: string }) => t.name)).toEqual([
      'Wake up',
      'Eat breakfast',
      'Brush teeth',
    ]);
    expect(mid.body.tasks[0].status).toBe('done');
    expect(mid.body.tasks[2]).toMatchObject({ start_time: '07:45', duration_min: 5 });

    await request(app).patch(`/api/tasks/${wake.body.id}/complete`).set(alice).send({ done: false });
    const final = await request(app)
      .get('/api/schedules')
      .set(alice)
      .query({ childId: 1, date: DATE });
    expect(final.body.tasks.every((t: { status: string }) => t.status === 'pending')).toBe(true);
  });

  // Requires the real MySQL persistence layer (Group 1); the mock store is in-memory.
  it.todo('state survives a server restart');
});