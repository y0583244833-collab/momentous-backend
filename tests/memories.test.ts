import { api, auth, createBoard, createMemory, joinBoard, resetDb, uploadPng, userWithToken } from './helpers';

beforeEach(resetDb);

async function boardWithTwoMembers() {
  const owner = await userWithToken();
  const friend = await userWithToken();
  const board = await createBoard(owner.token);
  await joinBoard(friend.token, board.joinCode);
  return { owner, friend, board };
}

describe('memories CRUD', () => {
  it('a member adds a memory; the author comes from the token', async () => {
    const { friend, board } = await boardWithTwoMembers();
    const memory = await createMemory(friend.token, board.id, {
      title: 'הזריחה במצדה',
      content: 'קמנו בארבע',
      type: 'SUMMARY',
      placeUrl: 'https://maps.google.com/?q=Masada',
      happenedAt: '2026-04-15',
    });
    expect(memory).toMatchObject({
      title: 'הזריחה במצדה',
      typeLabel: 'סיכום',
      happenedAt: '2026-04-15',
      isMine: true,
      likesCount: 0,
      likedByMe: false,
    });
    expect(memory.author.id).toBe(friend.user.id);
  });

  it('rejects an authorId sent by the client', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const res = await api()
      .post(`/api/boards/${board.id}/memories`)
      .set(auth(friend.token))
      .send({ title: 'כותרת', content: 'תוכן', type: 'JOKE', authorId: owner.user.id });
    expect(res.status).toBe(400);
  });

  it('validates the memory fields', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const res = await api()
      .post(`/api/boards/${board.id}/memories`)
      .set(auth(owner.token))
      .send({ title: '', content: '', type: 'VIDEO', placeUrl: 'javascript:alert(1)', happenedAt: '15/04/2026' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'content', 'type', 'placeUrl', 'happenedAt']));
  });

  it('a PHOTO memory needs an image', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const res = await api()
      .post(`/api/boards/${board.id}/memories`)
      .set(auth(owner.token))
      .send({ title: 'תמונה', content: 'בלי תמונה', type: 'PHOTO' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('imageId');

    const image = await uploadPng(owner.token, 1);
    const memory = await createMemory(owner.token, board.id, { type: 'PHOTO', imageId: image.body.id });
    expect(memory.imageUrl).toBe(`/api/images/${image.body.id}`);
  });

  it('only the author edits; others get 403', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const memory = await createMemory(friend.token, board.id);

    const byOwner = await api().patch(`/api/memories/${memory.id}`).set(auth(owner.token)).send({ title: 'שינוי' });
    expect(byOwner.status).toBe(403);

    const byAuthor = await api()
      .patch(`/api/memories/${memory.id}`)
      .set(auth(friend.token))
      .send({ title: 'כותרת חדשה', happenedAt: null });
    expect(byAuthor.status).toBe(200);
    expect(byAuthor.body.title).toBe('כותרת חדשה');
  });

  it('only the author deletes (the board creator cannot delete others\' memories)', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const memory = await createMemory(friend.token, board.id);
    expect((await api().delete(`/api/memories/${memory.id}`).set(auth(owner.token))).status).toBe(403);
    expect((await api().delete(`/api/memories/${memory.id}`).set(auth(friend.token))).status).toBe(204);
    expect((await api().get(`/api/memories/${memory.id}`).set(auth(friend.token))).status).toBe(404);
  });

  it('a non-member cannot read, add, edit or like', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const stranger = await userWithToken();
    const memory = await createMemory(owner.token, board.id);

    expect((await api().get(`/api/memories/${memory.id}`).set(auth(stranger.token))).status).toBe(403);
    expect(
      (await api().post(`/api/boards/${board.id}/memories`).set(auth(stranger.token)).send({ title: 'אאא', content: 'ב', type: 'JOKE' }))
        .status,
    ).toBe(403);
    expect((await api().patch(`/api/memories/${memory.id}`).set(auth(stranger.token)).send({ title: 'אאא' })).status).toBe(403);
    expect((await api().post(`/api/memories/${memory.id}/like`).set(auth(stranger.token))).status).toBe(403);
  });

  it('requires a token', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const memory = await createMemory(owner.token, board.id);
    expect((await api().get(`/api/boards/${board.id}/memories`)).status).toBe(401);
    expect((await api().get(`/api/memories/${memory.id}`)).status).toBe(401);
  });
});

describe('duplicate images', () => {
  it('rejects the same picture twice in one board, even under a different file name', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const first = await uploadPng(owner.token, 5, 'IMG_001.jpg.png');
    await createMemory(owner.token, board.id, { type: 'PHOTO', imageId: first.body.id, title: 'המקורית' });

    const again = await uploadPng(friend.token, 5, 'another-name.png');
    const res = await api()
      .post(`/api/boards/${board.id}/memories`)
      .set(auth(friend.token))
      .send({ title: 'שוב', content: 'אותה תמונה', type: 'PHOTO', imageId: again.body.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_IMAGE');
    expect(res.body.error.message).toContain('המקורית');
  });

  it('allows different pictures with the same file name', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const a = await uploadPng(owner.token, 1, 'IMG_001.png');
    const b = await uploadPng(owner.token, 2, 'IMG_001.png');
    await createMemory(owner.token, board.id, { type: 'PHOTO', imageId: a.body.id });
    await createMemory(owner.token, board.id, { type: 'PHOTO', imageId: b.body.id });
  });

  it('allows the same picture in a different board', async () => {
    const { owner, board } = await boardWithTwoMembers();
    const otherBoard = await createBoard(owner.token, { name: 'לוח שני' });
    const a = await uploadPng(owner.token, 3);
    const b = await uploadPng(owner.token, 3);
    await createMemory(owner.token, board.id, { type: 'PHOTO', imageId: a.body.id });
    await createMemory(owner.token, otherBoard.id, { type: 'PHOTO', imageId: b.body.id });
  });

  it('cannot attach an image uploaded by someone else', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const image = await uploadPng(owner.token, 9);
    const res = await api()
      .post(`/api/boards/${board.id}/memories`)
      .set(auth(friend.token))
      .send({ title: 'גניבה', content: 'תמונה של אחר', type: 'PHOTO', imageId: image.body.id });
    expect(res.status).toBe(403);
  });
});

describe('likes', () => {
  it('likes once, counts once, and unlikes', async () => {
    const { owner, friend, board } = await boardWithTwoMembers();
    const memory = await createMemory(owner.token, board.id);

    const first = await api().post(`/api/memories/${memory.id}/like`).set(auth(friend.token));
    expect(first.body).toEqual({ memoryId: memory.id, likesCount: 1, likedByMe: true });
    const twice = await api().post(`/api/memories/${memory.id}/like`).set(auth(friend.token));
    expect(twice.body.likesCount).toBe(1);

    const seenByOwner = await api().get(`/api/memories/${memory.id}`).set(auth(owner.token));
    expect(seenByOwner.body).toMatchObject({ likesCount: 1, likedByMe: false });

    const un = await api().delete(`/api/memories/${memory.id}/like`).set(auth(friend.token));
    expect(un.body).toEqual({ memoryId: memory.id, likesCount: 0, likedByMe: false });
  });
});

describe('GET /api/boards/:id/memories search, filter and sort', () => {
  async function setup() {
    const { owner, friend, board } = await boardWithTwoMembers();
    const sunrise = await createMemory(owner.token, board.id, {
      title: 'הזריחה',
      content: 'במצדה',
      type: 'SUMMARY',
      happenedAt: '2026-04-15',
    });
    const joke = await createMemory(friend.token, board.id, {
      title: 'האוטובוס',
      content: 'בדיחה על הזריחה',
      type: 'JOKE',
      happenedAt: '2026-04-14',
    });
    const quote = await createMemory(friend.token, board.id, { title: 'ציטוט', content: 'משפט', type: 'QUOTE' });
    await api().post(`/api/memories/${joke.id}/like`).set(auth(owner.token));
    await api().post(`/api/memories/${joke.id}/like`).set(auth(friend.token));
    await api().post(`/api/memories/${quote.id}/like`).set(auth(owner.token));
    return { owner, friend, board, sunrise, joke, quote };
  }
  const titles = (body: { items: { title: string }[] }) => body.items.map((m) => m.title);
  const list = (token: string, boardId: string, qs = '') =>
    api().get(`/api/boards/${boardId}/memories${qs}`).set(auth(token));

  it('searches in title and content', async () => {
    const { owner, board } = await setup();
    expect(titles((await list(owner.token, board.id, '?q=זריחה')).body).sort()).toEqual(['האוטובוס', 'הזריחה'].sort());
  });

  it('filters by type, author and "mine"', async () => {
    const { owner, friend, board } = await setup();
    expect(titles((await list(owner.token, board.id, '?type=JOKE')).body)).toEqual(['האוטובוס']);
    expect((await list(owner.token, board.id, `?authorId=${friend.user.id}`)).body.total).toBe(2);
    expect(titles((await list(owner.token, board.id, '?mine=true')).body)).toEqual(['הזריחה']);
  });

  it('sorts by most liked and by the event timeline (no date last)', async () => {
    const { owner, board } = await setup();
    expect(titles((await list(owner.token, board.id, '?sort=mostLiked')).body)).toEqual(['האוטובוס', 'ציטוט', 'הזריחה']);
    expect(titles((await list(owner.token, board.id, '?sort=happenedAt')).body)).toEqual(['האוטובוס', 'הזריחה', 'ציטוט']);
    expect(titles((await list(owner.token, board.id, '?sort=newest')).body)).toEqual(['ציטוט', 'האוטובוס', 'הזריחה']);
  });

  it('marks which memories are mine and which I liked', async () => {
    const { owner, board } = await setup();
    const items = (await list(owner.token, board.id, '?sort=happenedAt')).body.items;
    expect(items.map((m: { isMine: boolean }) => m.isMine)).toEqual([false, true, false]);
    expect(items.map((m: { likedByMe: boolean }) => m.likedByMe)).toEqual([true, false, true]);
  });

  it('rejects bad filters', async () => {
    const { owner, board } = await setup();
    expect((await list(owner.token, board.id, '?type=VIDEO')).status).toBe(400);
    expect((await list(owner.token, board.id, '?sort=random')).status).toBe(400);
  });

  it('updates the board\'s last activity when a memory is added', async () => {
    const { owner, board } = await setup();
    const res = await api().get(`/api/boards/${board.id}`).set(auth(owner.token));
    expect(new Date(res.body.lastActivityAt).getTime()).toBeGreaterThan(new Date(board.lastActivityAt).getTime());
    expect(res.body.memoriesCount).toBe(3);
  });
});
