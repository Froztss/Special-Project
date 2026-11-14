import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';

const { app, alice, bob, group5Repository } = await createTestApp();

interface Card {
  id: number;
  child_id: number | null;
  category: 'Food' | 'Emotions' | 'Activities' | 'Needs';
  label: string;
  icon: string;
  is_hidden: boolean;
}

const custom = { childId: 1, label: 'Apple', category: 'Food', icon: '🍎' };

function addCard(body: Record<string, unknown>, headers = alice) {
  return request(app).post('/api/cards').set(headers).send(body);
}

function listCards(childId: number, headers = alice, includeHidden = false) {
  return request(app).get('/api/cards').set(headers).query({ childId, includeHidden });
}

function findCard(groups: Record<string, Card[]>, id: number): Card | undefined {
  return Object.values(groups).flat().find((card) => card.id === id);
}

beforeEach(() => {
  resetStore();
  group5Repository.reset();
});

describe('POST /api/cards (task 5.2)', () => {
  it('creates a custom card owned by the child', async () => {
    const res = await addCard(custom);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ child_id: 1, label: 'Apple', category: 'Food', icon: '🍎', is_hidden: false });
    expect(res.body.id).toBeGreaterThan(0);
  });

  it('includes the new custom card alongside the defaults in its category group', async () => {
    const created = await addCard(custom);
    expect(created.status).toBe(201);
    const list = await listCards(1);
    expect(list.status).toBe(200);
    expect(list.body.Food).toContainEqual(expect.objectContaining({ id: created.body.id, label: 'Apple', child_id: 1 }));
    const otherChild = await listCards(2);
    expect(findCard(otherChild.body, created.body.id)).toBeUndefined();
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
    const res = await addCard(custom, bob);
    expect(res.status).toBe(404);
  });

  it('requires a valid token', async () => {
    const res = await request(app).post('/api/cards').send(custom);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/cards/:id hide support (task 5.2, FR-COMM-07)', () => {
  it('hides and unhides a custom card, toggling its visibility in the listing', async () => {
    const created = await addCard(custom);
    const id = created.body.id as number;
    const hidden = await request(app).patch(`/api/cards/${id}`).set(alice).send({ hidden: true });
    expect(hidden.status).toBe(200);
    expect(hidden.body.is_hidden).toBe(true);

    const visible = await listCards(1);
    expect(findCard(visible.body, id)).toBeUndefined();
    const all = await listCards(1, alice, true);
    expect(findCard(all.body, id)).toMatchObject({ id, is_hidden: true });

    const unhidden = await request(app).patch(`/api/cards/${id}`).set(alice).send({ hidden: false });
    expect(unhidden.body.is_hidden).toBe(false);
    expect(findCard((await listCards(1)).body, id)).toBeTruthy();
  });

  it("returns 404 for another user's card and for shared defaults", async () => {
    const created = await addCard(custom);
    const foreign = await request(app).patch(`/api/cards/${created.body.id}`).set(bob).send({ hidden: true });
    expect(foreign.status).toBe(404);
    const defaultCard = await request(app).patch('/api/cards/1').set(alice).send({ hidden: true });
    expect(defaultCard.status).toBe(404);
  });

  it('rejects a non-boolean hidden flag with 400', async () => {
    const created = await addCard(custom);
    const res = await request(app).patch(`/api/cards/${created.body.id}`).set(alice).send({ hidden: 'yes' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/cards/:id (task 5.2)', () => {
  it('deletes an own custom card and removes it from the listing', async () => {
    const created = await addCard(custom);
    expect(created.status).toBe(201);
    const res = await request(app).delete(`/api/cards/${created.body.id}`).set(alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const list = await listCards(1, alice, true);
    expect(findCard(list.body, created.body.id)).toBeUndefined();
  });

  it('refuses to delete a shared default card', async () => {
    const list = await listCards(1);
    expect(list.status).toBe(200);
    const defaultCard = list.body.Food[0] as Card;
    expect(defaultCard.child_id).toBeNull();
    const res = await request(app).delete(`/api/cards/${defaultCard.id}`).set(alice);
    expect(res.status).toBe(404);
    const after = await listCards(1);
    expect(findCard(after.body, defaultCard.id)).toBeTruthy();
  });

  it("returns 404 for another user's custom card", async () => {
    const created = await addCard({ ...custom, childId: 3 }, bob);
    expect(created.status).toBe(201);
    const res = await request(app).delete(`/api/cards/${created.body.id}`).set(alice);
    expect(res.status).toBe(404);
    const stillThere = await listCards(3, bob);
    expect(findCard(stillThere.body, created.body.id)).toBeTruthy();
  });

  it('rejects a malformed id with 400', async () => {
    for (const id of ['abc', '0', '-1']) {
      const res = await request(app).delete(`/api/cards/${id}`).set(alice);
      expect(res.status).toBe(400);
    }
  });
});