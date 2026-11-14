import { createPool } from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

let pool: Pool | undefined;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return value.trim();
}

function getPool(): Pool {
  if (!pool) {
    const portValue = requiredEnvironmentVariable('DB_PORT');
    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be an integer between 1 and 65535');
    }

    const password = process.env.DB_PASSWORD;
    if (password === undefined) {
      throw new Error('DB_PASSWORD must be set');
    }

    pool = createPool({
      host: requiredEnvironmentVariable('DB_HOST'),
      port,
      user: requiredEnvironmentVariable('DB_USER'),
      password,
      database: requiredEnvironmentVariable('DB_NAME'),
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

export function getDatabasePool(): Pool {
  return getPool();
}

export async function checkDatabaseConnection(): Promise<void> {
  await getPool().query('SELECT 1');
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}
