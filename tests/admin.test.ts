import { api, auth, createBoard, createMemory, joinBoard, loginAs, prisma, resetDb, userWithToken } from './helpers';

beforeEach(resetDb);

describe('admin permissions', () => {
  it('a regular user gets 403 on every admin route', async () => {
    const { user, token } = await userWithToken();
    expect((await api().get('/api/admin/users').set(auth(token))).status).toBe(403);
    expect((await api().get('/api/admin/boards').set(auth(token))).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(auth(token))).status).toBe(403);
    expect((await api().patch(`/api/admin/users/${user.id}/block`).set(auth(token)).send({ isBlocked: true })).status).toBe(403);
    expect((await api().delete(`/api/admin/users/${user.id}`).set(auth(token))).status).toBe(403);
  });

  it('admin routes return 401 without a token', async () => {
    expect((await api().get('/api/admin/users')).status).toBe(401);
  });

  it('the admin only manages: cannot open, join, write or like', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    const memory = await createMemory(owner.token, board.id);

    expect((await api().get('/api/boards').set(auth(admin.token))).status).toBe(403);
    expect(
      (await api().post('/api/boards').set(auth(admin.token)).send({ name: 'לוח', eventType: 'TRIP', eventDate: '2026-01-01' }))
        .status,
    ).toBe(403);
    expect((await joinBoard(admin.token, board.joinCode)).status).toBe(403);
    expect(
      (await api().post(`/api/boards/${board.id}/memories`).set(auth(admin.token)).send({ title: 'אאא', content: 'ב', type: 'JOKE' }))
        .status,
    ).toBe(403);
    expect((await api().post(`/api/memories/${memory.id}/like`).set(auth(admin.token))).status).toBe(403);
    expect((await api().patch(`/api/memories/${memory.id}`).set(auth(admin.token)).send({ title: 'אאא' })).status).toBe(403);
    expect((await api().patch(`/api/boards/${board.id}`).set(auth(admin.token)).send({ name: 'אאא' })).status).toBe(403);
  });
});

describe('admin stats', () => {
  it('returns the real counts of users, groups and memories', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    await createMemory(owner.token, board.id);
    await createMemory(owner.token, board.id);

    const res = await api().get('/api/admin/stats').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ usersCount: 2, groupsCount: 1, memoriesCount: 2 });
  });

  it('returns 401 without a token', async () => {
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });
});

describe('admin moderation', () => {
  it('lists users without passwords, with search and blocked filter', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    await userWithToken({ fullName: 'נועה לוי' });
    await userWithToken({ fullName: 'יוסי כהן', isBlocked: false });
    const blocked = await userWithToken();
    await prisma.user.update({ where: { id: blocked.user.id }, data: { isBlocked: true } });

    const all = await api().get('/api/admin/users').set(auth(admin.token));
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(4);
    expect(JSON.stringify(all.body)).not.toContain('passwordHash');
    expect(all.body.items[0]).toHaveProperty('email');

    const search = await api().get(`/api/admin/users?q=${encodeURIComponent('נועה')}`).set(auth(admin.token));
    expect(search.body.items.map((u: { fullName: string }) => u.fullName)).toEqual(['נועה לוי']);

    const onlyBlocked = await api().get('/api/admin/users?blocked=true').set(auth(admin.token));
    expect(onlyBlocked.body.items.map((u: { id: string }) => u.id)).toEqual([blocked.user.id]);
  });

  it('blocking takes effect immediately, and unblocking restores access', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const target = await userWithToken();

    const res = await api().patch(`/api/admin/users/${target.user.id}/block`).set(auth(admin.token)).send({ isBlocked: true });
    expect(res.status).toBe(200);
    expect(res.body.isBlocked).toBe(true);

    const withOldToken = await api().get('/api/auth/me').set(auth(target.token));
    expect(withOldToken.status).toBe(403);
    expect(withOldToken.body.error.code).toBe('USER_BLOCKED');
    await expect(loginAs(target.user.email)).rejects.toThrow();

    await api().patch(`/api/admin/users/${target.user.id}/block`).set(auth(admin.token)).send({ isBlocked: false });
    expect((await api().get('/api/auth/me').set(auth(target.token))).status).toBe(200);
  });

  it('cannot block or delete itself or another admin', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const other = await userWithToken({ role: 'ADMIN' });
    expect((await api().patch(`/api/admin/users/${admin.user.id}/block`).set(auth(admin.token)).send({ isBlocked: true })).status).toBe(400);
    expect((await api().patch(`/api/admin/users/${other.user.id}/block`).set(auth(admin.token)).send({ isBlocked: true })).status).toBe(400);
    expect((await api().delete(`/api/admin/users/${admin.user.id}`).set(auth(admin.token))).status).toBe(400);
    expect((await api().delete(`/api/admin/users/${other.user.id}`).set(auth(admin.token))).status).toBe(400);
  });

  it('validates the block request', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const target = await userWithToken();
    expect((await api().patch(`/api/admin/users/${target.user.id}/block`).set(auth(admin.token)).send({ isBlocked: 'yes' })).status).toBe(400);
    expect(
      (await api().patch('/api/admin/users/00000000-0000-4000-8000-000000000000/block').set(auth(admin.token)).send({ isBlocked: true }))
        .status,
    ).toBe(404);
  });

  it('deleting a user removes their boards, memories and likes', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const bad = await userWithToken();
    const good = await userWithToken();
    const badBoard = await createBoard(bad.token);
    const goodBoard = await createBoard(good.token);
    await joinBoard(bad.token, goodBoard.joinCode);
    const badMemory = await createMemory(bad.token, goodBoard.id);
    const goodMemory = await createMemory(good.token, goodBoard.id);
    await api().post(`/api/memories/${goodMemory.id}/like`).set(auth(bad.token));

    expect((await api().delete(`/api/admin/users/${bad.user.id}`).set(auth(admin.token))).status).toBe(204);

    expect(await prisma.user.findUnique({ where: { id: bad.user.id } })).toBeNull();
    expect(await prisma.board.findUnique({ where: { id: badBoard.id } })).toBeNull();
    expect(await prisma.memory.findUnique({ where: { id: badMemory.id } })).toBeNull();
    const after = await api().get(`/api/memories/${goodMemory.id}`).set(auth(good.token));
    expect(after.body.likesCount).toBe(0);
    expect((await api().get(`/api/boards/${goodBoard.id}`).set(auth(good.token))).body.membersCount).toBe(1);
  });

  it('sees all boards, opens any board, and deletes inappropriate content', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    const owner = await userWithToken();
    const board = await createBoard(owner.token, { name: 'לוח לבדיקה' });
    const memory = await createMemory(owner.token, board.id, { title: 'תוכן לא מתאים' });
    await createBoard(owner.token, { name: 'עוד לוח', eventType: 'CAMP' });

    const all = await api().get('/api/admin/boards').set(auth(admin.token));
    expect(all.body.total).toBe(2);
    expect(all.body.items.every((b: { joinCode: string | null }) => b.joinCode === null)).toBe(true);
    const filtered = await api().get('/api/admin/boards?eventType=CAMP').set(auth(admin.token));
    expect(filtered.body.items.map((b: { name: string }) => b.name)).toEqual(['עוד לוח']);

    expect((await api().get(`/api/boards/${board.id}`).set(auth(admin.token))).status).toBe(200);
    expect((await api().get(`/api/boards/${board.id}/memories`).set(auth(admin.token))).body.total).toBe(1);
    expect((await api().get(`/api/boards/${board.id}/members`).set(auth(admin.token))).status).toBe(200);

    expect((await api().delete(`/api/memories/${memory.id}`).set(auth(admin.token))).status).toBe(204);
    expect((await api().delete(`/api/boards/${board.id}`).set(auth(admin.token))).status).toBe(204);
    expect((await api().get('/api/admin/boards').set(auth(admin.token))).body.total).toBe(1);
  });
});
