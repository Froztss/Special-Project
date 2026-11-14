import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    env: {
      DB_NAME: 'special_project_test',
      JWT_SECRET: 'test-secret-test-secret-123',
    },
  },
});