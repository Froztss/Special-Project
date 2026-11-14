import 'dotenv/config';
import { afterAll } from 'vitest';
import { closeDatabasePool } from '../src/db/pool.js';

afterAll(async () => {
  await closeDatabasePool();
});