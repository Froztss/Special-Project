import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob } = await createTestApp();

interface Card {
  id: number;
  child_id: number | null;
  category: string;
  label: string;
  icon: string;
}

const custom = { childId: 1, label: 'Apple', category: 'Food', icon: '🍎' };

function addCard(body: Record<string, unknown>, headers = alice) {
  return request(app).post('/api/cards').set(headers).send(body);
}

beforeEach(() => resetStore());

describe('POST /api/cards (task 5.2)', () => {
  it('creates a custom card owned by the child', async () => {
    const res = await addCard(custom);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ child_id: 1, label: 'Apple', category: 'Food', icon: '🍎' });
    expect(res.body.id).toBeGreaterThan(0);
  });

  it('includes the new custom card alongside the defaults in the listing', async () => {
    const created = await addCard(custom);
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(list.status).toBe(200);
    const apple = (list.body as Card[]).find((card) => card.label === 'Apple');
    expect(apple).toMatchObject({ id: created.body.id, child_id: 1, category: 'Food' });
  });

  it('rejects invalid input with 400', async () => {
    for (const body of [
      {},
      { childId: 1, category: 'Food', icon: '🍎' },
      { childId: 1, label: '   ', category: 'Food', icon: '🍎' },
      { childId: 1, label: 'Apple', category: 'Snacks', icon: '🍎' },
      { childId: 1, label: 'Apple', category: 'Food' },
      { childId: 1, label: 'Apple', category: 'Food', icon: '🚀' },
      { childId: 0, label: 'Apple', category: 'Food', icon: '🍎' },
      { label: 'Apple', category: 'Food', icon: '🍎' },
    ]) {
      const res = await addCard(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it("returns 404 when creating a card for another user's child", async () => {
    const owned = await addCard(custom);
    expect(owned.status).toBe(201);
    const res = await addCard({ ...custom, childId: 1 }, bob);
    expect(res.status).toBe(404);
  });

  it('requires a valid token', async () => {
    const res = await request(app).post('/api/cards').send(custom);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/cards/:id (task 5.2)', () => {
  it('deletes an own custom card and removes it from the listing', async () => {
    const created = await addCard(custom);
    expect(created.status).toBe(201);
    const res = await request(app).delete(`/api/cards/${created.body.id}`).set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const list = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect((list.body as Card[]).some((card) => card.id === created.body.id)).toBe(false);
  });

  it('refuses to delete a shared default card', async () => {
    const list = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(list.status).toBe(200);
    const defaultCard = (list.body as Card[]).find((card) => card.child_id === null);
    expect(defaultCard).toBeTruthy();
    const res = await request(app).delete(`/api/cards/${defaultCard!.id}`).set(alice);
    expect(res.status).toBe(404);
    const after = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect((after.body as Card[]).some((card) => card.id === defaultCard!.id)).toBe(true);
  });

  it("returns 404 for another user's custom card", async () => {
    const created = await addCard({ ...custom, childId: 3 }, bob);
    expect(created.status).toBe(201);
    const res = await request(app).delete(`/api/cards/${created.body.id}`).set(alice);
    expect(res.status).toBe(404);
    const stillThere = await request(app).get('/api/cards').set(bob).query({ childId: 3 });
    expect((stillThere.body as Card[]).some((card) => card.id === created.body.id)).toBe(true);
  });

  it('rejects a malformed id with 400', async () => {
    for (const id of ['abc', '0', '-1']) {
      const res = await request(app).delete(`/api/cards/${id}`).set(alice);
      expect(res.status).toBe(400);
    }
  });

  it.todo('hides a custom card without deleting it (FR-COMM-07 hide support)');
});