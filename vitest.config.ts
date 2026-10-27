import { defineConfig } from 'vitest/config';

// Tests run against a separate PostgreSQL database, never the development one.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/momenta_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-that-is-long-enough-1234567890',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_ROUNDS: '4',
      CORS_ORIGIN: '*',
    },
  },
});
