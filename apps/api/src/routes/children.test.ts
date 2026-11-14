import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { findScheduleByChildAndDate, resetStore, tasksForSchedule } from '../mocks/data.js';
import { createTestApp } from '../testing/testApp.js';

const { app, alice, bob } = await createTestApp();
const profile = { name: 'Sam', age: 5, delay_domain: 'speech', avatar: '🐼' };

beforeEach(() => resetStore());

describe('child authentication and isolation', () => {
  it.each(['get', 'post', 'put', 'delete'] as const)(
    'requires authentication for %s requests',
    async (method) => {
      const path = method === 'post' ? '/api/children' : '/api/children/1';
      for (const token of [undefined, 'Bearer 999', 'Basic 1']) {
        const req = request(app)[method](path);
        if (token) req.set('Authorization', token);
        const res = await req.send(profile);
        expect(res.status).toBe(401);
        expect(res.body.error).toBeTypeOf('string');
      }
    },
  );

  it('requires authentication for the child list', async () => {
    const res = await request(app).get('/api/children');
    expect(res.status).toBe(401);
  });

  it('lists only the current user\'s children, ignoring an owner query parameter', async () => {
    const first = await request(app).get('/api/children').set(alice).query({ user_id: 2 });
    const second = await request(app).get('/api/children').set(bob).query({ user_id: 1 });
    expect(first.status).toBe(200);
    expect(first.body.map((child: { id: number }) => child.id)).toEqual([1, 2]);
    expect(second.status).toBe(200);
    expect(second.body.map((child: { id: number }) => child.id)).toEqual([3]);
  });

  it.each(['get', 'put', 'delete'] as const)(
    'returns the same 404 for foreign and missing children on %s',
    async (method) => {
      for (const id of [1, 999]) {
        const req = request(app)[method](`/api/children/${id}`).set(bob);
        if (method === 'put') req.send({ name: 'Changed' });
        const res = await req;
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Child not found' });
      }
      const unchanged = await request(app).get('/api/children/1').set(alice);
      expect(unchanged.status).toBe(200);
      expect(unchanged.body.name).toBe('Mia');
    },
  );

  it.each(['get', 'put', 'delete'] as const)('rejects malformed ids on %s', async (method) => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const req = request(app)[method](`/api/children/${id}`).set(alice);
      if (method === 'put') req.send({ name: 'Changed' });
      const res = await req;
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTypeOf('string');
    }
  });
});

describe('child create, read and update', () => {
  it('creates a child for the caller and supplies optional defaults', async () => {
    const res = await request(app).post('/api/children').set(bob).send({
      name: '  Sam  ', age: 0, delay_domain: 'general',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Sam', age: 0, delay_domain: 'general', user_id: 2, notes: null, avatar: '🦊',
    });
    expect(res.body.id).toBeGreaterThan(3);
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);
    const read = await request(app).get(`/api/children/${res.body.id}`).set(bob);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(res.body);
    const foreign = await request(app).get(`/api/children/${res.body.id}`).set(alice);
    expect(foreign.status).toBe(404);
  });

  it('updates all editable fields, preserves omitted fields, and can clear notes', async () => {
    const created = await request(app).post('/api/children').set(alice).send(profile);
    const url = `/api/children/${created.body.id}`;
    const patch = { name: '  Sammy  ', age: 6, delay_domain: 'social', notes: ' Likes music ', avatar: '🐰' };
    const updated = await request(app).put(url).set(alice).send(patch);
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      ...created.body, ...patch, name: 'Sammy', notes: 'Likes music',
    });
    const cleared = await request(app).put(url).set(alice).send({ notes: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toEqual({ ...updated.body, notes: null });
    const read = await request(app).get(url).set(alice);
    expect(read.body).toEqual(cleared.body);
  });

  it.each([
    {}, { name: ' ' }, { name: 'x'.repeat(101) }, { age: -1 }, { age: 121 },
    { age: 1.5 }, { age: '5' }, { age: null }, { delay_domain: 'unknown' },
    { avatar: 'https://example.com/photo.png' }, { avatar: null },
    { notes: 'x'.repeat(2001) }, { notes: 123 }, { user_id: 2 }, { id: 123 },
    { created_at: '2026-11-14T00:00:00Z' },
  ])('rejects invalid create/update input: %j', async (invalid) => {
    const body = Object.keys(invalid).length ? { ...profile, ...invalid } : {};
    const created = await request(app).post('/api/children').set(alice).send(body);
    expect(created.status).toBe(400);
    expect(created.body.error).toBeTypeOf('string');
    const updated = await request(app).put('/api/children/1').set(alice).send(invalid);
    expect(updated.status).toBe(400);
    expect(updated.body.error).toBeTypeOf('string');
    const unchanged = await request(app).get('/api/children/1').set(alice);
    expect(unchanged.body).toMatchObject({ name: 'Mia', age: 6, user_id: 1 });
    const list = await request(app).get('/api/children').set(alice);
    expect(list.body).toHaveLength(2);
  });

  it('rejects missing required create fields', async () => {
    for (const body of [
      { age: 5, delay_domain: 'speech' },
      { name: 'Sam', delay_domain: 'speech' },
      { name: 'Sam', age: 5 },
    ]) {
      const res = await request(app).post('/api/children').set(alice).send(body);
      expect(res.status).toBe(400);
    }
  });
});

describe('child deletion and schedule integration', () => {
  it('uses newly created children and library activities in schedules and tasks', async () => {
    const child = await request(app).post('/api/children').set(alice).send(profile);
    const activities = await request(app).get('/api/activities').set(alice);
    const schedule = await request(app).post('/api/schedules').set(alice).send({
      childId: child.body.id, date: '2026-11-14',
    });
    expect(schedule.status).toBe(201);
    const task = await request(app).post('/api/tasks').set(alice).send({
      scheduleId: schedule.body.id, activityId: activities.body[0].id,
    });
    expect(task.status).toBe(201);
    expect(task.body).toMatchObject({ name: activities.body[0].name, icon: activities.body[0].icon });
  });

  it('removes all child schedules and tasks while preserving other children\'s data', async () => {
    const entries = [];
    for (const [childId, date, headers] of [
      [1, '2026-11-14', alice], [1, '2026-11-15', alice],
      [2, '2026-11-14', alice], [3, '2026-11-14', bob],
    ] as const) {
      const schedule = await request(app).post('/api/schedules').set(headers).send({ childId, date });
      expect(schedule.status).toBe(201);
      const task = await request(app).post('/api/tasks').set(headers).send({
        scheduleId: schedule.body.id, activityId: 1,
      });
      expect(task.status).toBe(201);
      entries.push({ childId, date, headers, scheduleId: schedule.body.id as number, taskId: task.body.id as number });
    }

    const denied = await request(app).delete('/api/children/1').set(bob);
    expect(denied.status).toBe(404);
    for (const entry of entries) {
      expect(tasksForSchedule(entry.scheduleId)).toHaveLength(1);
    }

    const deleted = await request(app).delete('/api/children/1').set(alice);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ success: true });
    for (const entry of entries) {
      const removed = entry.childId === 1;
      // Inspect storage too: an API 404 alone could hide orphaned rows.
      expect(tasksForSchedule(entry.scheduleId)).toHaveLength(removed ? 0 : 1);
      expect(findScheduleByChildAndDate(entry.childId, entry.date) === undefined).toBe(removed);
      const res = await request(app).put(`/api/tasks/${entry.taskId}`).set(entry.headers).send({ duration_min: 5 });
      expect(res.status).toBe(removed ? 404 : 200);
    }
    const list = await request(app).get('/api/children').set(alice);
    expect(list.body.map((child: { id: number }) => child.id)).toEqual([2]);
    expect((await request(app).get('/api/children/1').set(alice)).status).toBe(404);
    expect((await request(app).delete('/api/children/1').set(alice)).status).toBe(404);
  });

  it.todo('verifies MySQL foreign-key cascades to schedules, tasks and custom picture cards');
});
