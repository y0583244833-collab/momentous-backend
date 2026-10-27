import { api, auth, loginAs, prisma, resetDb, uploadPng, userWithToken } from './helpers';

beforeEach(resetDb);

describe('PATCH /api/users/me', () => {
  it('updates the name', async () => {
    const { token } = await userWithToken();
    const res = await api().patch('/api/users/me').set(auth(token)).send({ fullName: '  שם חדש  ' });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('שם חדש');
  });

  it('sets and removes a profile picture', async () => {
    const { user, token } = await userWithToken();
    const upload = await uploadPng(token);
    const set = await api().patch('/api/users/me').set(auth(token)).send({ avatarImageId: upload.body.id });
    expect(set.status).toBe(200);
    expect(set.body.avatarUrl).toBe(`/api/images/${upload.body.id}`);

    const removed = await api().patch('/api/users/me').set(auth(token)).send({ avatarImageId: null });
    expect(removed.body.avatarUrl).toBeNull();
    // The unused image is deleted from the database.
    expect(await prisma.image.count({ where: { uploaderId: user.id } })).toBe(0);
  });

  it('does not allow using an image uploaded by someone else', async () => {
    const a = await userWithToken();
    const b = await userWithToken();
    const upload = await uploadPng(a.token);
    const res = await api().patch('/api/users/me').set(auth(b.token)).send({ avatarImageId: upload.body.id });
    expect(res.status).toBe(403);
  });

  it('rejects an empty update and unknown fields', async () => {
    const { token } = await userWithToken();
    expect((await api().patch('/api/users/me').set(auth(token)).send({})).status).toBe(400);
    expect((await api().patch('/api/users/me').set(auth(token)).send({ role: 'ADMIN' })).status).toBe(400);
    expect((await api().patch('/api/users/me').set(auth(token)).send({ email: 'x@example.com' })).status).toBe(400);
  });

  it('requires a token', async () => {
    expect((await api().patch('/api/users/me').send({ fullName: 'שם' })).status).toBe(401);
  });
});

describe('PATCH /api/users/me/password', () => {
  it('changes the password', async () => {
    const { user, token } = await userWithToken();
    const res = await api()
      .patch('/api/users/me/password')
      .set(auth(token))
      .send({ currentPassword: 'Test1234!', newPassword: 'NewPass5678!' });
    expect(res.status).toBe(204);
    await expect(loginAs(user.email, 'Test1234!')).rejects.toThrow();
    expect(await loginAs(user.email, 'NewPass5678!')).toEqual(expect.any(String));
  });

  it('rejects a wrong current password', async () => {
    const { token } = await userWithToken();
    const res = await api()
      .patch('/api/users/me/password')
      .set(auth(token))
      .send({ currentPassword: 'Wrong0000!', newPassword: 'NewPass5678!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
  });

  it('validates the new password', async () => {
    const { token } = await userWithToken();
    const res = await api()
      .patch('/api/users/me/password')
      .set(auth(token))
      .send({ currentPassword: 'Test1234!', newPassword: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('newPassword');
  });
});
