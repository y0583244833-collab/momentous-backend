import { execSync } from 'node:child_process';

const run = (cmd: string) => execSync(cmd, { encoding: 'utf8', stdio: 'pipe', env: process.env });

describe('Prisma', () => {
  it('the schema is valid', () => {
    expect(run('npx prisma validate')).toContain('is valid');
  });

  it('all migrations are applied to the test database', () => {
    expect(run('npx prisma migrate status')).toContain('Database schema is up to date');
  });

  it('the migrations match the schema exactly (no missing migration)', () => {
    // --exit-code makes the command fail if the database (built from migrations) differs from schema.prisma.
    expect(() =>
      run('npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code'),
    ).not.toThrow();
  });
});
