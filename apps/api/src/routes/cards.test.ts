import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../mocks/data.js';
import { createTestApp } from '../testing/testApp.js';

const { app, alice, bob, group5Repository } = await createTestApp();

beforeEach(() => {
  resetStore();
  group5Repository.reset();
});

describe('/api/cards', () => {
  it('lists shared defaults grouped with only the requested child cards', async () => {
    const created = await request(app)
      .post('/api/cards')
      .set(alice)
      .send({ childId: 1, label: 'Break', category: 'Activities', icon: '⭐' });
    expect(created.status).toBe(201);

    const res = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['Food', 'Emotions', 'Activities', 'Needs']);
    expect(res.body.Food).toHaveLength(4);
    expect(res.body.Activities).toContainEqual(expect.objectContaining({ label: 'Break', child_id: 1 }));

    const otherChild = await request(app).get('/api/cards').set(alice).query({ childId: 2 });
    expect(otherChild.body.Activities).not.toContainEqual(expect.objectContaining({ label: 'Break' }));
  });

  it('creates, hides, unhides, and deletes only owned custom cards', async () => {
    const created = await request(app)
      .post('/api/cards')
      .set(alice)
      .send({ childId: 1, label: 'Break', category: 'Activities', icon: '⭐' });
    const cardId = created.body.id;

    const hidden = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(alice)
      .send({ hidden: true });
    expect(hidden.status).toBe(200);
    expect(hidden.body.is_hidden).toBe(true);

    const visibleCards = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(visibleCards.body.Activities).not.toContainEqual(expect.objectContaining({ id: cardId }));
    const allCards = await request(app)
      .get('/api/cards')
      .set(alice)
      .query({ childId: 1, includeHidden: true });
    expect(allCards.body.Activities).toContainEqual(expect.objectContaining({ id: cardId, is_hidden: true }));

    const denied = await request(app).delete(`/api/cards/${cardId}`).set(bob);
    expect(denied.status).toBe(404);
    const deniedHide = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(bob)
      .send({ hidden: true });
    expect(deniedHide.status).toBe(404);
    const unhidden = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(alice)
      .send({ hidden: false });
    expect(unhidden.body.is_hidden).toBe(false);

    const deleted = await request(app).delete(`/api/cards/${cardId}`).set(alice);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ success: true });
    const gone = await request(app)
      .get('/api/cards')
      .set(alice)
      .query({ childId: 1, includeHidden: true });
    expect(gone.body.Activities).not.toContainEqual(expect.objectContaining({ id: cardId }));
  });

  it('rejects invalid input, unauthorized child access, and changes to defaults', async () => {
    const missingAuth = await request(app).get('/api/cards').query({ childId: 1 });
    expect(missingAuth.status).toBe(401);

    const invalidQuery = await request(app).get('/api/cards').set(alice).query({ childId: 0 });
    expect(invalidQuery.status).toBe(400);

    for (const body of [
      { childId: 1, label: '   ', category: 'Food', icon: '🍞' },
      { childId: 1, label: 'Water', category: 'Other', icon: '💧' },
      { childId: 1, label: 'Rocket', category: 'Activities', icon: '🚀' },
    ]) {
      const invalid = await request(app).post('/api/cards').set(alice).send(body);
      expect(invalid.status).toBe(400);
    }

    const crossUserCreate = await request(app)
      .post('/api/cards')
      .set(bob)
      .send({ childId: 1, label: 'Water', category: 'Food', icon: '💧' });
    expect(crossUserCreate.status).toBe(404);
    const crossUserList = await request(app).get('/api/cards').set(bob).query({ childId: 1 });
    expect(crossUserList.status).toBe(404);

    const defaultDelete = await request(app).delete('/api/cards/1').set(alice);
    expect(defaultDelete.status).toBe(404);
    const defaultHide = await request(app).patch('/api/cards/1').set(alice).send({ hidden: true });
    expect(defaultHide.status).toBe(404);
  });
});
