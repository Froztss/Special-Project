import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import type { RowDataPacket } from 'mysql2/promise';
import { closeDatabasePool, getDatabasePool } from '../src/db/pool.js';

async function applySchema(): Promise<void> {
  try {
    const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
    const connection = await getDatabasePool().getConnection();

    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
      const [columns] = await connection.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM picture_cards LIKE 'is_hidden'",
      );
      if (columns.length === 0) {
        await connection.query(
          'ALTER TABLE picture_cards ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE',
        );
      }
    } finally {
      connection.release();
    }

    console.log(`Applied ${statements.length} schema statements.`);
  } finally {
    await closeDatabasePool();
  }
}

void applySchema().catch((error: unknown) => {
  console.error('Failed to apply the database schema:', error);
  process.exitCode = 1;
});
