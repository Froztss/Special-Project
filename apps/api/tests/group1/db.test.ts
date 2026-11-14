import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { checkDatabaseConnection, getDatabasePool } from '../../src/db/pool.js';

describe('1.1 MySQL connection module', () => {
  it('exposes a pool that reaches the configured database', async () => {
    const [rows] = await getDatabasePool().query('SELECT DATABASE() AS db');
    expect(rows).toEqual([expect.objectContaining({ db: 'special_project_test' })]);
  });

  it('checkDatabaseConnection resolves when the database is up', async () => {
    await expect(checkDatabaseConnection()).resolves.toBeUndefined();
  });

  it('reports database connectivity on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});