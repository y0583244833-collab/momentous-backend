import { api, auth, createBoard, createUser, joinBoard, PASSWORD, prisma, resetDb, userWithToken } from './helpers';

beforeEach(resetDb);

const invite = (token: string, boardId: string, emails: unknown) =>
  api().post(`/api/boards/${boardId}/invitations`).set(auth(token)).send({ emails });
const myInvitations = (token: string, query = '') => api().get(`/api/invitations${query}`).set(auth(token));
const pendingCount = (token: string) => api().get('/api/invitations/pending-count').set(auth(token));
const accept = (token: string, id: string) => api().post(`/api/invitations/${id}/accept`).set(auth(token));
const decline = (token: string, id: string) => api().post(`/api/invitations/${id}/decline`).set(auth(token));

async function boardWithInvite() {
  const owner = await userWithToken({ fullName: 'נועה לוי' });
  const friend = await userWithToken();
  const board = await createBoard(owner.token);
  const sent = await invite(owner.token, board.id, [friend.user.email]);
  return { owner, friend, board, invitationId: sent.body.results[0].invitationId as string };
}

describe('POST /api/boards/:id/invitations', () => {
  it('invites a registered user; nobody joins the board yet', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);

    const res = await invite(owner.token, board.id, [`  ${friend.user.email.toUpperCase()} `]);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      boardId: board.id,
      invitedCount: 1,
      results: [{ email: friend.user.email, result: 'INVITED', invitationId: expect.any(String) }],
    });
    const members = await api().get(`/api/boards/${board.id}/members`).set(auth(owner.token));
    expect(members.body).toHaveLength(1);
  });

  it('invites several addresses at once, removes duplicates and reports each one', async () => {
    const owner = await userWithToken();
    const member = await userWithToken();
    const blocked = await userWithToken({ isBlocked: false });
    const admin = await userWithToken({ role: 'ADMIN' });
    const board = await createBoard(owner.token);
    await joinBoard(member.token, board.joinCode);
    await prisma.user.update({ where: { id: blocked.user.id }, data: { isBlocked: true } });
    await invite(owner.token, board.id, ['pending@example.com']);

    const res = await invite(owner.token, board.id, [
      'new@example.com',
      'NEW@example.com',
      'pending@example.com',
      member.user.email,
      owner.user.email,
      blocked.user.email,
      admin.user.email,
    ]);
    expect(res.status).toBe(200);
    expect(res.body.invitedCount).toBe(1);
    const byEmail = Object.fromEntries(res.body.results.map((r: { email: string; result: string }) => [r.email, r.result]));
    expect(byEmail).toEqual({
      'new@example.com': 'INVITED',
      'pending@example.com': 'ALREADY_INVITED',
      [member.user.email]: 'ALREADY_MEMBER',
      [owner.user.email]: 'SELF',
      [blocked.user.email]: 'NOT_ALLOWED',
      [admin.user.email]: 'NOT_ALLOWED',
    });
    expect(await prisma.boardInvitation.count({ where: { boardId: board.id } })).toBe(2);
  });

  it('only the board creator can invite (not a member, not a stranger, not the admin)', async () => {
    const owner = await userWithToken();
    const member = await userWithToken();
    const stranger = await userWithToken();
    const admin = await userWithToken({ role: 'ADMIN' });
    const board = await createBoard(owner.token);
    await joinBoard(member.token, board.joinCode);

    const byMember = await invite(member.token, board.id, ['x@example.com']);
    expect(byMember.status).toBe(403);
    expect(byMember.body.error.code).toBe('NOT_BOARD_CREATOR');
    expect((await invite(stranger.token, board.id, ['x@example.com'])).body.error.code).toBe('NOT_A_MEMBER');
    expect((await invite(admin.token, board.id, ['x@example.com'])).body.error.code).toBe('ROLE_FORBIDDEN');
    expect((await api().post(`/api/boards/${board.id}/invitations`).send({ emails: ['x@example.com'] })).status).toBe(401);
    expect(await prisma.boardInvitation.count()).toBe(0);
  });

  it('validates the body with the existing error format', async () => {
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    const bad = await invite(owner.token, board.id, ['ok@example.com', 'not-an-email']);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(bad.body.error.details[0].field).toBe('emails.1');
    expect((await invite(owner.token, board.id, [])).status).toBe(400);
    expect((await invite(owner.token, board.id, 'a@example.com')).status).toBe(400);
    const tooMany = Array.from({ length: 21 }, (_, i) => `u${i}@example.com`);
    expect((await invite(owner.token, board.id, tooMany)).status).toBe(400);
    const missing = await invite(owner.token, '00000000-0000-4000-8000-000000000000', ['x@example.com']);
    expect(missing.status).toBe(404);
  });

  it('parallel requests for the same address create only one pending invitation', async () => {
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => invite(owner.token, board.id, ['race@example.com'])),
    );
    expect(responses.every((r) => r.status === 200)).toBe(true);
    const invited = responses.filter((r) => r.body.results[0].result === 'INVITED');
    expect(invited).toHaveLength(1);
    expect(await prisma.boardInvitation.count({ where: { inviteeEmail: 'race@example.com' } })).toBe(1);
  });

  it('after a decline the same address can be invited again', async () => {
    const { owner, friend, board, invitationId } = await boardWithInvite();
    await decline(friend.token, invitationId);
    const again = await invite(owner.token, board.id, [friend.user.email]);
    expect(again.body.results[0]).toMatchObject({ result: 'INVITED', invitationId });
    expect((await pendingCount(friend.token)).body).toEqual({ count: 1 });
  });
});

describe('GET /api/invitations and /pending-count', () => {
  it('returns only my invitations, paged, with board and inviter details and no emails', async () => {
    const ownerA = await userWithToken({ fullName: 'נועה לוי' });
    const ownerB = await userWithToken();
    const friend = await userWithToken();
    const other = await userWithToken();
    const boardA = await createBoard(ownerA.token, { name: 'לוח א' });
    const boardB = await createBoard(ownerB.token, { name: 'לוח ב' });
    await invite(ownerA.token, boardA.id, [friend.user.email]);
    await invite(ownerB.token, boardB.id, [friend.user.email, other.user.email]);

    const res = await myInvitations(friend.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
    const fromA = res.body.items.find((i: { board: { id: string } }) => i.board.id === boardA.id);
    expect(fromA).toMatchObject({
      status: 'PENDING',
      respondedAt: null,
      board: { id: boardA.id, name: 'לוח א', eventType: 'TRIP', eventTypeLabel: 'טיול', eventDate: '2026-04-14', coverImageUrl: null },
      inviter: { id: ownerA.user.id, fullName: 'נועה לוי', avatarUrl: null },
    });
    expect(JSON.stringify(res.body)).not.toContain('@');

    expect((await pendingCount(friend.token)).body).toEqual({ count: 2 });
    expect((await pendingCount(other.token)).body).toEqual({ count: 1 });

    const paged = await myInvitations(friend.token, '?page=2&limit=1');
    expect(paged.body).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(paged.body.items).toHaveLength(1);
  });

  it('filters by status and ignores any email the client tries to send', async () => {
    const { friend, invitationId } = await boardWithInvite();
    await decline(friend.token, invitationId);
    expect((await myInvitations(friend.token)).body.total).toBe(0);
    expect((await myInvitations(friend.token, '?status=DECLINED')).body.total).toBe(1);
    expect((await myInvitations(friend.token, '?status=WRONG')).status).toBe(400);

    const other = await userWithToken();
    const sneaky = await myInvitations(other.token, `?status=DECLINED&email=${friend.user.email}`);
    expect(sneaky.body.total).toBe(0);
  });

  it('an address invited before signing up sees the invitation right after registering', async () => {
    const owner = await userWithToken();
    const board = await createBoard(owner.token);
    await invite(owner.token, board.id, ['later@example.com']);

    const reg = await api()
      .post('/api/auth/register')
      .send({ fullName: 'מצטרפת חדשה', email: 'Later@Example.com', password: PASSWORD });
    expect(reg.status).toBe(201);
    expect((await pendingCount(reg.body.token)).body).toEqual({ count: 1 });
    expect((await myInvitations(reg.body.token)).body.items[0].board.id).toBe(board.id);
  });

  it('"/pending-count" is not treated as an invitation id', async () => {
    const { friend } = await boardWithInvite();
    const res = await pendingCount(friend.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 1 });
  });

  it('the admin and blocked users cannot use invitations', async () => {
    const admin = await userWithToken({ role: 'ADMIN' });
    expect((await myInvitations(admin.token)).body.error.code).toBe('ROLE_FORBIDDEN');
    expect((await pendingCount(admin.token)).status).toBe(403);

    const { friend, invitationId } = await boardWithInvite();
    await prisma.user.update({ where: { id: friend.user.id }, data: { isBlocked: true } });
    expect((await myInvitations(friend.token)).body.error.code).toBe('USER_BLOCKED');
    expect((await accept(friend.token, invitationId)).body.error.code).toBe('USER_BLOCKED');
  });
});

describe('accepting and declining', () => {
  it('accepting makes me a member, marks ACCEPTED and returns the board', async () => {
    const { friend, board, invitationId } = await boardWithInvite();
    const res = await accept(friend.token, invitationId);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: board.id, isCreator: false, joinCode: null, membersCount: 2 });

    const saved = await prisma.boardInvitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(saved.status).toBe('ACCEPTED');
    expect(saved.respondedAt).not.toBeNull();
    expect((await api().get(`/api/boards/${board.id}`).set(auth(friend.token))).status).toBe(200);
    expect((await pendingCount(friend.token)).body).toEqual({ count: 0 });
  });

  it('declining does not add me and marks DECLINED', async () => {
    const { friend, board, invitationId } = await boardWithInvite();
    const res = await decline(friend.token, invitationId);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: invitationId, status: 'DECLINED', board: { id: board.id } });
    expect(res.body.respondedAt).toBeTruthy();
    expect((await api().get(`/api/boards/${board.id}`).set(auth(friend.token))).status).toBe(403);
  });

  it('an answered invitation cannot be answered again', async () => {
    const { friend, invitationId } = await boardWithInvite();
    await accept(friend.token, invitationId);
    const again = await accept(friend.token, invitationId);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVITATION_ALREADY_ANSWERED');
    expect((await decline(friend.token, invitationId)).status).toBe(409);
    expect((await prisma.boardInvitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe('ACCEPTED');
  });

  it('two parallel accepts: one succeeds, one gets 409, one membership', async () => {
    const { friend, board, invitationId } = await boardWithInvite();
    const [a, b] = await Promise.all([accept(friend.token, invitationId), accept(friend.token, invitationId)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await prisma.boardMember.count({ where: { boardId: board.id, userId: friend.user.id } })).toBe(1);
  });

  it("someone else's invitation is reported as not found", async () => {
    const { owner, friend, invitationId } = await boardWithInvite();
    const other = await userWithToken();
    for (const token of [other.token, owner.token]) {
      const res = await accept(token, invitationId);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INVITATION_NOT_FOUND');
    }
    expect((await decline(other.token, invitationId)).status).toBe(404);
    expect((await pendingCount(friend.token)).body).toEqual({ count: 1 });
  });

  it('returns 404 for an unknown id and 400 for a malformed id', async () => {
    const { friend } = await boardWithInvite();
    expect((await accept(friend.token, '00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await accept(friend.token, 'abc')).status).toBe(400);
  });

  it('accepting after joining with the code does not create a second membership', async () => {
    const { friend, board, invitationId } = await boardWithInvite();
    expect((await joinBoard(friend.token, board.joinCode)).status).toBe(200);
    const res = await accept(friend.token, invitationId);
    expect(res.status).toBe(200);
    expect(res.body.membersCount).toBe(2);
    expect(await prisma.boardMember.count({ where: { boardId: board.id, userId: friend.user.id } })).toBe(1);
  });

  it('inviting someone who already joined with the code reports ALREADY_MEMBER', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const board = await createBoard(owner.token);
    await joinBoard(friend.token, board.joinCode);
    expect((await invite(owner.token, board.id, [friend.user.email])).body.results[0].result).toBe('ALREADY_MEMBER');
  });

  it('joining with a code works exactly as before while an invitation is pending', async () => {
    const { owner, friend, board } = await boardWithInvite();
    const joined = await joinBoard(friend.token, board.joinCode);
    expect(joined.status).toBe(200);
    expect(joined.body).toMatchObject({ id: board.id, isCreator: false, joinCode: null, membersCount: 2 });
    expect((await joinBoard(friend.token, board.joinCode)).status).toBe(409);
    expect((await joinBoard(owner.token, 'ZZZZZZ')).status).toBe(404);
  });

  it('deleting the board removes its invitations, so nothing unusable is shown', async () => {
    const { owner, friend, board, invitationId } = await boardWithInvite();
    expect((await api().delete(`/api/boards/${board.id}`).set(auth(owner.token))).status).toBe(204);
    expect((await pendingCount(friend.token)).body).toEqual({ count: 0 });
    expect((await myInvitations(friend.token)).body.items).toEqual([]);
    expect((await accept(friend.token, invitationId)).status).toBe(404);
  });

  it('deleting the inviting user removes the invitations they sent', async () => {
    const { owner, friend } = await boardWithInvite();
    const admin = await userWithToken({ role: 'ADMIN' });
    expect((await api().delete(`/api/admin/users/${owner.user.id}`).set(auth(admin.token))).status).toBe(204);
    expect((await pendingCount(friend.token)).body).toEqual({ count: 0 });
  });
});

describe('POST /api/boards with emails', () => {
  const newBoard = (token: string, extra: Record<string, unknown>) =>
    api()
      .post('/api/boards')
      .set(auth(token))
      .send({ name: 'הטיול השנתי', eventType: 'TRIP', eventDate: '2026-10-27', ...extra });

  it('without emails, or with an empty list, the board is created exactly as before', async () => {
    const { token } = await userWithToken();
    for (const extra of [{}, { emails: [] }]) {
      const res = await newBoard(token, extra);
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('invitations');
      expect(res.body).toMatchObject({ name: 'הטיול השנתי', isCreator: true, membersCount: 1 });
    }
    expect(await prisma.boardInvitation.count()).toBe(0);
  });

  it('creates the board and invites registered and not-yet-registered addresses; nobody joins yet', async () => {
    const owner = await userWithToken();
    const friend = await userWithToken();
    const res = await newBoard(owner.token, {
      description: 'הזיכרונות של הכיתה',
      coverImageId: null,
      emails: [` ${friend.user.email.toUpperCase()} `, 'user2@gmail.com', 'USER2@gmail.com'],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'הטיול השנתי', isCreator: true, membersCount: 1 });
    expect(res.body.creator.id).toBe(owner.user.id);
    expect(res.body.invitations).toMatchObject({
      invitedCount: 2,
      results: [
        { email: friend.user.email, result: 'INVITED', invitationId: expect.any(String) },
        { email: 'user2@gmail.com', result: 'INVITED', invitationId: expect.any(String) },
      ],
    });

    // The registered user sees it in the bell and the list.
    expect((await pendingCount(friend.token)).body).toEqual({ count: 1 });
    // The new address sees it right after registering.
    const reg = await api()
      .post('/api/auth/register')
      .send({ fullName: 'משתמשת חדשה', email: 'user2@gmail.com', password: PASSWORD });
    const list = await myInvitations(reg.body.token);
    expect(list.body.items[0].board.id).toBe(res.body.id);

    // Accepting works through the same flow as before.
    const accepted = await accept(friend.token, res.body.invitations.results[0].invitationId);
    expect(accepted.status).toBe(200);
    expect(accepted.body.membersCount).toBe(2);
  });

  it("the creator's own address is not invited, the same as in the separate API", async () => {
    const owner = await userWithToken();
    const res = await newBoard(owner.token, { emails: [owner.user.email, 'a@example.com'] });
    expect(res.status).toBe(201);
    expect(res.body.invitations.results).toEqual([
      { email: owner.user.email, result: 'SELF', invitationId: null },
      { email: 'a@example.com', result: 'INVITED', invitationId: expect.any(String) },
    ]);
    expect(res.body.membersCount).toBe(1);
  });

  it('blocked users and the admin are NOT_ALLOWED, the same as in the separate API', async () => {
    const owner = await userWithToken();
    const admin = await userWithToken({ role: 'ADMIN' });
    const blocked = await createUser({ isBlocked: true });
    const res = await newBoard(owner.token, { emails: [admin.user.email, blocked.email] });
    expect(res.body.invitations).toMatchObject({ invitedCount: 0 });
    expect(res.body.invitations.results.map((r: { result: string }) => r.result)).toEqual(['NOT_ALLOWED', 'NOT_ALLOWED']);
  });

  it('invalid emails reject the whole request and no board is created', async () => {
    const owner = await userWithToken();
    const bad = await newBoard(owner.token, { emails: ['ok@example.com', 'not-an-email'] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0].field).toBe('emails.1');
    const tooMany = Array.from({ length: 21 }, (_, i) => `u${i}@example.com`);
    expect((await newBoard(owner.token, { emails: tooMany })).status).toBe(400);
    expect((await newBoard(owner.token, { emails: 'a@example.com' })).status).toBe(400);
    expect(await prisma.board.count()).toBe(0);
  });

  it('the separate invitations API keeps working on a board created with emails', async () => {
    const owner = await userWithToken();
    const res = await newBoard(owner.token, { emails: ['a@example.com'] });
    const more = await invite(owner.token, res.body.id, ['a@example.com', 'b@example.com']);
    expect(more.body.results.map((r: { result: string }) => r.result)).toEqual(['ALREADY_INVITED', 'INVITED']);
  });
});
