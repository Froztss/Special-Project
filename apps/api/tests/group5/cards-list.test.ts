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

type CardGroups = Record<Card['category'], Card[]>;

const CATEGORIES = ['Food', 'Emotions', 'Activities', 'Needs'] as const;

function flatten(groups: CardGroups): Card[] {
  return CATEGORIES.flatMap((category) => groups[category]);
}

beforeEach(() => {
  resetStore();
  group5Repository.reset();
});

describe('GET /api/cards (task 5.1)', () => {
  it('requires a valid token', async () => {
    for (const token of [undefined, 'Bearer 999']) {
      const req = request(app).get('/api/cards').query({ childId: 1 });
      if (token) req.set('Authorization', token);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it('serves the shared default library grouped by the four categories', async () => {
    const res = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual([...CATEGORIES]);
    const groups = res.body as CardGroups;
    expect(groups.Food.map((card) => card.label)).toEqual(['Water', 'Milk', 'Rice', 'Bread']);
    expect(groups.Emotions.map((card) => card.label)).toEqual(['Happy', 'Sad', 'Tired']);
    expect(groups.Activities.map((card) => card.label)).toEqual(['Play', 'TV']);
    expect(groups.Needs.map((card) => card.label)).toEqual(['Toilet']);
    for (const card of flatten(groups)) {
      expect(card.id).toBeGreaterThan(0);
      expect(card.child_id).toBeNull();
      expect(card.is_hidden).toBe(false);
      expect(card.icon.length).toBeGreaterThan(0);
    }
  });

  it('serves the same defaults to every owner for their own child', async () => {
    const first = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    const second = await request(app).get('/api/cards').set(bob).query({ childId: 3 });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(flatten(first.body)).toEqual(flatten(second.body));
  });

  it('rejects a missing or malformed childId with 400', async () => {
    for (const query of [{}, { childId: 0 }, { childId: -1 }, { childId: 'abc' }, { childId: 1.5 }]) {
      const res = await request(app).get('/api/cards').set(alice).query(query);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it("returns 404 for another user's child and for an unknown child", async () => {
    const owned = await request(app).get('/api/cards').set(alice).query({ childId: 1 });
    expect(owned.status).toBe(200);
    const foreign = await request(app).get('/api/cards').set(bob).query({ childId: 1 });
    expect(foreign.status).toBe(404);
    const missing = await request(app).get('/api/cards').set(alice).query({ childId: 999 });
    expect(missing.status).toBe(404);
  });
});