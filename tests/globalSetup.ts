import { execSync } from 'node:child_process';

/** Applies all migrations to the test database once, before the tests run. */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/momenta_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
