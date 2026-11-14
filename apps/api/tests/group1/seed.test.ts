import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../../src/db/pool.js';
import { applySchema, resetDb, runSeed } from '../helpers/db.js';

beforeAll(() => {
  applySchema();
});

beforeEach(async () => {
  await resetDb();
});

async function count(table: string, where = ''): Promise<number> {
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table} ${where}`);
  return Number(rows[0]?.n);
}

describe('1.3 seed script', () => {
  it('seeds the activity library with icons and categories', async () => {
    runSeed();
    expect(await count('activities')).toBe(11);
    const [rows] = await getDatabasePool().query<RowDataPacket[]>(
      'SELECT name, icon, category FROM activities WHERE name = ?',
      ['Brush teeth'],
    );
    expect(rows[0]).toMatchObject({ name: 'Brush teeth', icon: '🪥', category: 'hygiene' });
  });

  it('seeds default picture cards in the four required categories', async () => {
    runSeed();
    expect(await count('picture_cards', 'WHERE child_id IS NULL')).toBe(10);
    const [rows] = await getDatabasePool().query<RowDataPacket[]>(
      'SELECT DISTINCT category FROM picture_cards WHERE child_id IS NULL',
    );
    expect(rows.map((r) => String(r.category)).sort()).toEqual(['Activities', 'Emotions', 'Food', 'Needs']);
  });

  it('seeds three demo children with sample schedules for today', async () => {
    runSeed();
    expect(await count('users')).toBe(1);
    expect(await count('children')).toBe(3);
    expect(await count('schedules')).toBe(3);
    expect(await count('tasks')).toBe(15);
    const [rows] = await getDatabasePool().query<RowDataPacket[]>(
      'SELECT COUNT(*) AS n FROM schedules WHERE schedule_date = CURRENT_DATE()',
    );
    expect(Number(rows[0]?.n)).toBe(3);
    const [tasks] = await getDatabasePool().query<RowDataPacket[]>(
      'SELECT start_time, duration_min FROM tasks WHERE start_time IS NOT NULL AND duration_min IS NOT NULL',
    );
    expect(tasks.length).toBe(15);
  });

  it('is idempotent across repeated runs', async () => {
    runSeed();
    runSeed();
    expect(await count('activities')).toBe(11);
    expect(await count('picture_cards', 'WHERE child_id IS NULL')).toBe(10);
    expect(await count('users')).toBe(1);
    expect(await count('children')).toBe(3);
    expect(await count('schedules')).toBe(3);
    expect(await count('tasks')).toBe(15);
  });
});