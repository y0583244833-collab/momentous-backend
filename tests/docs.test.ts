import SwaggerParser from '@apidevtools/swagger-parser';
import { openApiDocument } from '../src/docs/openapi';
import { api, resetDb } from './helpers';

beforeAll(resetDb);

// Every route the server implements. The test checks this list against the OpenAPI document in both directions.
const ROUTES = [
  ['get', '/api/health'],
  ['get', '/api/options'],
  ['post', '/api/auth/register'],
  ['post', '/api/auth/login'],
  ['get', '/api/auth/me'],
  ['patch', '/api/users/me'],
  ['patch', '/api/users/me/password'],
  ['post', '/api/images'],
  ['get', '/api/images/{id}'],
  ['get', '/api/boards'],
  ['post', '/api/boards'],
  ['post', '/api/boards/join'],
  ['get', '/api/boards/{id}'],
  ['patch', '/api/boards/{id}'],
  ['delete', '/api/boards/{id}'],
  ['post', '/api/boards/{id}/join-code'],
  ['get', '/api/boards/{id}/members'],
  ['delete', '/api/boards/{id}/members/{userId}'],
  ['post', '/api/boards/{id}/leave'],
  ['get', '/api/boards/{id}/memories'],
  ['post', '/api/boards/{id}/memories'],
  ['post', '/api/boards/{id}/invitations'],
  ['get', '/api/invitations'],
  ['get', '/api/invitations/pending-count'],
  ['post', '/api/invitations/{id}/accept'],
  ['post', '/api/invitations/{id}/decline'],
  ['get', '/api/memories/{id}'],
  ['patch', '/api/memories/{id}'],
  ['delete', '/api/memories/{id}'],
  ['post', '/api/memories/{id}/like'],
  ['delete', '/api/memories/{id}/like'],
  ['get', '/api/admin/users'],
  ['patch', '/api/admin/users/{id}/block'],
  ['delete', '/api/admin/users/{id}'],
  ['get', '/api/admin/boards'],
] as const;

const PUBLIC = new Set(['/api/health', '/api/options', '/api/auth/register', '/api/auth/login', '/api/images/{id}']);
const METHODS = ['get', 'post', 'patch', 'put', 'delete'];

type Operation = { security?: unknown[]; responses: Record<string, unknown>; summary?: string; description?: string };
const paths = openApiDocument.paths as unknown as Record<string, Record<string, Operation>>;

describe('OpenAPI / Swagger', () => {
  it('is a valid OpenAPI 3 document', async () => {
    const copy = JSON.parse(JSON.stringify(openApiDocument));
    await expect(SwaggerParser.validate(copy)).resolves.toBeTruthy();
  });

  it('documents exactly the implemented routes', () => {
    const documented = Object.entries(paths).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((m) => METHODS.includes(m))
        .map((m) => `${m} ${path}`),
    );
    expect(documented.sort()).toEqual(ROUTES.map(([m, p]) => `${m} ${p}`).sort());
    expect(ROUTES).toHaveLength(35);
  });

  it('every documented route really exists on the server', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    for (const [method, path] of ROUTES) {
      const url = path.replace(/\{[^}]+\}/g, fakeId);
      const res = await api()[method](url);
      expect(res.body?.error?.code, `${method.toUpperCase()} ${path}`).not.toBe('ROUTE_NOT_FOUND');
    }
  });

  it('marks protected routes with the Bearer security scheme and documents 401', () => {
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    for (const [method, path] of ROUTES) {
      const op = paths[path][method];
      expect(op.summary, `${method} ${path} summary`).toBeTruthy();
      expect(op.description, `${method} ${path} description`).toBeTruthy();
      if (PUBLIC.has(path)) {
        expect(op.security, `${method} ${path}`).toEqual([]);
      } else {
        expect(op.security, `${method} ${path}`).toEqual([{ bearerAuth: [] }]);
        expect(op.responses, `${method} ${path}`).toHaveProperty('401');
        expect(op.responses, `${method} ${path}`).toHaveProperty('403');
      }
    }
  });

  it('serves Swagger UI at /api-docs and the JSON at /openapi.json', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    const doc = await api().get('/openapi.json');
    expect(doc.status).toBe(200);
    expect(doc.body.openapi).toBe('3.0.3');
    expect(doc.body.servers).toEqual([{ url: '/', description: expect.any(String) }]);
  });
});

describe('docs/openapi.json', () => {
  it('is up to date with the code (run npm run openapi:export after changing the API)', async () => {
    const { readFileSync } = await import('node:fs');
    const file = JSON.parse(readFileSync('docs/openapi.json', 'utf8'));
    expect(file).toEqual(JSON.parse(JSON.stringify(openApiDocument)));
  });
});
