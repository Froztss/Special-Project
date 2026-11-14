import 'dotenv/config';
import { app } from './app.js';
import { getJwtSecret } from './config.js';
import { checkDatabaseConnection, closeDatabasePool } from './db/pool.js';

getJwtSecret(); // fail fast if JWT_SECRET is missing

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

async function startServer(): Promise<void> {
  await checkDatabaseConnection();
  console.log('Database connection established.');

  const server = app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => {
        void closeDatabasePool().then(
          () => process.exit(0),
          (error: unknown) => {
            console.error('Failed to close the database pool:', error);
            process.exit(1);
          },
        );
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    });
  }
}

void startServer().catch(async (error: unknown) => {
  console.error('API startup failed: database connectivity could not be verified.', error);
  try {
    await closeDatabasePool();
  } catch (closeError) {
    console.error('Failed to close the database pool after startup failure:', closeError);
  }
  process.exitCode = 1;
});
