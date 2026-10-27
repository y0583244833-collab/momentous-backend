import jwt from 'jsonwebtoken';
import { api, auth, createUser, loginAs, PASSWORD, prisma, resetDb, userWithToken } from './helpers';

beforeEach(resetDb);

describe('POST /api/auth/register', () => {
  it('creates a regular user and returns a token without any password data', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'נועה לוי', email: 'Noa@Example.com', password: 'Demo1234!' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ fullName: 'נועה לוי', email: 'noa@example.com', role: 'USER' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Demo1234/);

    const saved = await prisma.user.findUniqueOrThrow({ where: { email: 'noa@example.com' } });
    expect(saved.passwordHash).not.toBe('Demo1234!');
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects an email that is already registered with 409', async () => {
    const body = { fullName: 'נועה', email: 'noa@example.com', password: 'Demo1234!' };
    await api().post('/api/auth/register').send(body).expect(201);
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates the fields', async () => {
    const res = await api().post('/api/auth/register').send({ fullName: 'א', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password']));
  });

  it('does not allow registering as an admin', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'האקר', email: 'h@example.com', password: 'Demo1234!', role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(0);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a JWT for correct credentials', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    const decoded = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(decoded.sub).toBe(user.id);
    expect(decoded.exp).toBeGreaterThan(decoded.iat!);
    expect(res.body.user.id).toBe(user.id);
  });

  it('returns 401 for a wrong password', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'Wrong1234!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for an unknown email', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'x@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 403 for a blocked user', async () => {
    const user = await createUser({ isBlocked: true });
    const res = await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('USER_BLOCKED');
  });
});

describe('GET /api/auth/me and token checks', () => {
  it('returns the signed-in user', async () => {
    const { user, token } = await userWithToken();
    const res = await api().get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('returns 401 for a malformed token', async () => {
    const res = await api().get('/api/auth/me').set(auth('not-a-real-token'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('returns 401 for a token signed with another secret', async () => {
    const user = await createUser();
    const forged = jwt.sign({ role: 'ADMIN' }, 'some-other-secret-some-other-secret', { subject: user.id });
    const res = await api().get('/api/auth/me').set(auth(forged));
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const user = await createUser();
    const expired = jwt.sign({ role: 'USER' }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: -10 });
    const res = await api().get('/api/auth/me').set(auth(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('returns 401 when the scheme is not Bearer', async () => {
    const { token } = await userWithToken();
    const res = await api().get('/api/auth/me').set({ Authorization: `Basic ${token}` });
    expect(res.status).toBe(401);
  });

  it('rejects the token of a user who was deleted', async () => {
    const { user, token } = await userWithToken();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(401);
  });

  it('takes the role from the database, not from the token', async () => {
    const { user, token } = await userWithToken();
    // A token that claims ADMIN but is signed for a regular user still gets 403 on admin routes.
    const claimsAdmin = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: '1h' });
    expect((await api().get('/api/admin/users').set(auth(claimsAdmin))).status).toBe(403);
    expect((await api().get('/api/admin/users').set(auth(token))).status).toBe(403);
  });

  it('logs in with a fresh token after re-login', async () => {
    const user = await createUser();
    const token = await loginAs(user.email);
    expect((await api().get('/api/auth/me').set(auth(token))).status).toBe(200);
  });
});
