import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../../src/db/pool.js';
import { applySchema, resetDb } from '../helpers/db.js';

beforeAll(() => {
  applySchema();
});

beforeEach(async () => {
  await resetDb();
});

async function seedFamily(): Promise<void> {
  const pool = getDatabasePool();
  await pool.query("INSERT INTO users (name, email, role) VALUES ('Owner', 'owner@example.com', 'caregiver')");
  await pool.query("INSERT INTO children (user_id, name, age, delay_domain) VALUES (1, 'Mia', 6, 'speech')");
  await pool.query("INSERT INTO schedules (child_id, schedule_date) VALUES (1, '2026-11-14')");
  await pool.query("INSERT INTO tasks (schedule_id, name, icon, position) VALUES (1, 'Wake up', '🌅', 1)");
  await pool.query("INSERT INTO picture_cards (child_id, category, label, icon) VALUES (1, 'Food', 'Water', '💧')");
}

describe('1.2 schema script', () => {
  it('creates all seven SRS tables', async () => {
    const [rows] = await getDatabasePool().query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const names = rows.map((r) => String(r.name).toLowerCase()).sort();
    expect(names).toEqual(['activities', 'children', 'picture_cards', 'schedules', 'settings', 'tasks', 'users']);
  });

  it('enforces unique users.email', async () => {
    const pool = getDatabasePool();
    await pool.query("INSERT INTO users (name, email, role) VALUES ('A', 'dup@example.com', 'ot')");
    await expect(
      pool.query("INSERT INTO users (name, email, role) VALUES ('B', 'dup@example.com', 'caregiver')"),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('enforces one schedule per child per date', async () => {
    await seedFamily();
    await expect(
      getDatabasePool().query("INSERT INTO schedules (child_id, schedule_date) VALUES (1, '2026-11-14')"),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('enforces unique task positions within a schedule', async () => {
    await seedFamily();
    await expect(
      getDatabasePool().query("INSERT INTO tasks (schedule_id, name, icon, position) VALUES (1, 'Again', '🌅', 1)"),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('cascades child deletion to schedules, tasks and custom cards', async () => {
    await seedFamily();
    await getDatabasePool().query('DELETE FROM children WHERE id = 1');
    for (const table of ['schedules', 'tasks', 'picture_cards']) {
      const [rows] = await getDatabasePool().query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`);
      expect(Number(rows[0]?.n)).toBe(0);
    }
  });

  it('keeps tasks but clears activity_id when a library activity is deleted', async () => {
    const pool = getDatabasePool();
    await pool.query("INSERT INTO activities (name, icon, category) VALUES ('Bath', '🛁', 'hygiene')");
    await seedFamily();
    await pool.query('UPDATE tasks SET activity_id = 1 WHERE id = 1');
    await pool.query('DELETE FROM activities WHERE id = 1');
    const [rows] = await pool.query<RowDataPacket[]>('SELECT activity_id, name FROM tasks WHERE id = 1');
    expect(rows[0]).toMatchObject({ activity_id: null, name: 'Wake up' });
  });
});