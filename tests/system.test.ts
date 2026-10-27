import { api, resetDb } from './helpers';

beforeAll(resetDb);

describe('system', () => {
  it('GET /api/health reports the server and database as ok', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('GET /api/options returns both lists with Hebrew labels', async () => {
    const res = await api().get('/api/options');
    expect(res.status).toBe(200);
    expect(res.body.memoryTypes).toHaveLength(5);
    expect(res.body.eventTypes).toContainEqual({ value: 'TRIP', label: 'טיול' });
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('invalid JSON returns 400', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('sends CORS headers', async () => {
    const res = await api().options('/api/auth/login').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });
});
