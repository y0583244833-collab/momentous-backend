import { api, auth, createBoard, joinBoard, resetDb, userWithToken } from './helpers';

beforeEach(resetDb);

describe('creating and joining boards', () => {
  it('creates a board; the creator is a member and sees the join code', async () => {
    const { user, token } = await userWithToken();
    const board = await createBoard(token, { description: 'שלושה ימים בדרום' });
    expect(board).toMatchObject({
      name: 'טיול שנתי',
      eventType: 'TRIP',
      eventTypeLabel: 'טיול',
      eventDate: '2026-04-14',
      isCreator: true,
      membersCount: 1,
      memoriesCount: 0,
    });
    expect(board.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(board.creator.id).toBe(user.id);
  });

  it('joins with a code once; after that the board is in "my boards" and opens without a code', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);

    const joined = await joinBoard(friend.token, board.joinCode.toLowerCase());
    expect(joined.status).toBe(200);
    expect(joined.body).toMatchObject({ id: board.id, isCreator: false, joinCode: null, membersCount: 2 });

    const mine = await api().get('/api/boards').set(auth(friend.token));
    expect(mine.body.items.map((b: { id: string }) => b.id)).toContain(board.id);

    const open = await api().get(`/api/boards/${board.id}`).set(auth(friend.token));
    expect(open.status).toBe(200);
    expect(open.body.joinCode).toBeNull();
  });

  it('returns 409 when joining twice and 404 for an unknown code', async () => {
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    expect((await joinBoard(owner.token, board.joinCode)).status).toBe(409);
    expect((await joinBoard(owner.token, 'ZZZZZZ')).status).toBe(404);
    expect((await joinBoard(owner.token, 'ABC')).status).toBe(400);
  });

  it('validates board fields', async () => {
    const { token } = await userWithToken();
    const res = await api()
      .post('/api/boards')
      .set(auth(token))
      .send({ name: 'א', eventType: 'PARTY', eventDate: '2026-02-30' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'eventType', 'eventDate']));
  });

  it('does not let a client choose the creator', async () => {
    const a = await userWithToken();
    const b = await userWithToken();
    const res = await api()
      .post('/api/boards')
      .set(auth(a.token))
      .send({ name: 'לוח', eventType: 'TRIP', eventDate: '2026-01-01', creatorId: b.user.id });
    expect(res.status).toBe(400);
  });
});

describe('board privacy and permissions', () => {
  it('a non-member cannot see the board, its members or its memories', async () => {
    const owner = await userWithToken();
    const stranger = await userWithToken();
    const board = await createBoard(owner.token);

    for (const path of [`/api/boards/${board.id}`, `/api/boards/${board.id}/members`, `/api/boards/${board.id}/memories`]) {
      const res = await api().get(path).set(auth(stranger.token));
      expect(res.status).toBe(403);
    }
    const mine = await api().get('/api/boards').set(auth(stranger.token));
    expect(mine.body.total).toBe(0);
  });

  it('only the creator can edit the board', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);

    const byFriend = await api().patch(`/api/boards/${board.id}`).set(auth(friend.token)).send({ name: 'שם אחר' });
    expect(byFriend.status).toBe(403);

    const byOwner = await api()
      .patch(`/api/boards/${board.id}`)
      .set(auth(owner.token))
      .send({ name: 'שם חדש', description: null, eventType: 'GRADUATION' });
    expect(byOwner.status).toBe(200);
    expect(byOwner.body).toMatchObject({ name: 'שם חדש', description: null, eventType: 'GRADUATION' });
  });

  it('a new join code replaces the old one; existing members stay', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const late = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);

    expect((await api().post(`/api/boards/${board.id}/join-code`).set(auth(friend.token))).status).toBe(403);
    const res = await api().post(`/api/boards/${board.id}/join-code`).set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.joinCode).not.toBe(board.joinCode);

    expect((await joinBoard(late.token, board.joinCode)).status).toBe(404);
    expect((await joinBoard(late.token, res.body.joinCode)).status).toBe(200);
    expect((await api().get(`/api/boards/${board.id}`).set(auth(friend.token))).status).toBe(200);
  });

  it('members list shows names only, never emails', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);

    const res = await api().get(`/api/boards/${board.id}/members`).set(auth(friend.token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: owner.user.id, isCreator: true });
    expect(JSON.stringify(res.body)).not.toContain('@example.com');
  });

  it('only the creator removes members; a removed member loses access', async () => {
    const owner = await userWithToken();
    const a = await userWithToken();
    const b = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(a.token, board.joinCode);
    await joinBoard(b.token, board.joinCode);

    expect((await api().delete(`/api/boards/${board.id}/members/${b.user.id}`).set(auth(a.token))).status).toBe(403);
    expect((await api().delete(`/api/boards/${board.id}/members/${b.user.id}`).set(auth(owner.token))).status).toBe(204);
    expect((await api().get(`/api/boards/${board.id}`).set(auth(b.token))).status).toBe(403);
    expect((await api().delete(`/api/boards/${board.id}/members/${b.user.id}`).set(auth(owner.token))).status).toBe(404);
    expect((await api().delete(`/api/boards/${board.id}/members/${owner.user.id}`).set(auth(owner.token))).status).toBe(400);
  });

  it('a member can leave; the creator cannot', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);

    expect((await api().post(`/api/boards/${board.id}/leave`).set(auth(owner.token))).status).toBe(400);
    expect((await api().post(`/api/boards/${board.id}/leave`).set(auth(friend.token))).status).toBe(204);
    expect((await api().get(`/api/boards/${board.id}`).set(auth(friend.token))).status).toBe(403);
  });

  it('only the creator can delete the board', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);

    expect((await api().delete(`/api/boards/${board.id}`).set(auth(friend.token))).status).toBe(403);
    expect((await api().delete(`/api/boards/${board.id}`).set(auth(owner.token))).status).toBe(204);
    expect((await api().get(`/api/boards/${board.id}`).set(auth(owner.token))).status).toBe(404);
  });

  it('returns 400 for a bad board id and 404 for a missing board', async () => {
    const { token } = await userWithToken();
    expect((await api().get('/api/boards/123').set(auth(token))).status).toBe(400);
    expect((await api().get('/api/boards/00000000-0000-4000-8000-000000000000').set(auth(token))).status).toBe(404);
  });
});

describe('GET /api/boards search, filter and sort', () => {
  async function setup() {
    const me = await userWithToken();
    const other = await userWithToken();
    await createBoard(me.token, { name: 'טיול שנתי', description: 'מצדה', eventType: 'TRIP', eventDate: '2026-04-14' });
    await createBoard(me.token, { name: 'סיום קייטנה', eventType: 'CAMP', eventDate: '2025-08-10' });
    const joined = await createBoard(other.token, { name: 'אירוע משפחתי', eventType: 'FAMILY', eventDate: '2024-12-01' });
    await joinBoard(me.token, joined.joinCode);
    await createBoard(other.token, { name: 'טיול פרטי של אחר', eventType: 'TRIP', eventDate: '2026-01-01' });
    return me;
  }
  const names = (body: { items: { name: string }[] }) => body.items.map((b) => b.name);

  it('shows only my boards', async () => {
    const me = await setup();
    const res = await api().get('/api/boards').set(auth(me.token));
    expect(res.body.total).toBe(3);
    expect(names(res.body)).not.toContain('טיול פרטי של אחר');
  });

  it('searches by name or description', async () => {
    const me = await setup();
    expect(names((await api().get('/api/boards?q=טיול').set(auth(me.token))).body)).toEqual(['טיול שנתי']);
    expect(names((await api().get('/api/boards?q=מצדה').set(auth(me.token))).body)).toEqual(['טיול שנתי']);
  });

  it('filters by event type, date range and role', async () => {
    const me = await setup();
    expect(names((await api().get('/api/boards?eventType=CAMP').set(auth(me.token))).body)).toEqual(['סיום קייטנה']);
    expect(
      names((await api().get('/api/boards?from=2025-01-01&to=2025-12-31').set(auth(me.token))).body),
    ).toEqual(['סיום קייטנה']);
    expect(names((await api().get('/api/boards?role=joined').set(auth(me.token))).body)).toEqual(['אירוע משפחתי']);
    expect((await api().get('/api/boards?role=created').set(auth(me.token))).body.total).toBe(2);
  });

  it('sorts by event date and by name, and paginates', async () => {
    const me = await setup();
    const asc = await api().get('/api/boards?sort=eventDate&order=asc').set(auth(me.token));
    expect(names(asc.body)).toEqual(['אירוע משפחתי', 'סיום קייטנה', 'טיול שנתי']);
    const byName = await api().get('/api/boards?sort=name&order=asc').set(auth(me.token));
    expect(names(byName.body)).toEqual(['אירוע משפחתי', 'טיול שנתי', 'סיום קייטנה']);
    const paged = await api().get('/api/boards?sort=name&order=asc&limit=2&page=2').set(auth(me.token));
    expect(paged.body).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(names(paged.body)).toEqual(['סיום קייטנה']);
  });

  it('rejects bad query values', async () => {
    const me = await setup();
    expect((await api().get('/api/boards?sort=color').set(auth(me.token))).status).toBe(400);
    expect((await api().get('/api/boards?from=2026-05-01&to=2026-01-01').set(auth(me.token))).status).toBe(400);
    expect((await api().get('/api/boards?limit=500').set(auth(me.token))).status).toBe(400);
  });
});

describe('empty query values', () => {
  it('treats empty parameters as not sent', async () => {
    const { token } = await userWithToken();
    await createBoard(token);
    const res = await api().get('/api/boards?q=&eventType=&from=&to=&role=&sort=&order=&page=&limit=').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
  });
});
