import { api, auth, pngBuffer, resetDb, uploadPng, userWithToken } from './helpers';

beforeEach(resetDb);

describe('images', () => {
  it('uploads an image and serves it back', async () => {
    const { token } = await userWithToken();
    const upload = await uploadPng(token, 1);
    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({ mimeType: 'image/png', url: `/api/images/${upload.body.id}` });
    expect(upload.body.contentHash).toMatch(/^[a-f0-9]{64}$/);

    const res = await api().get(upload.body.url).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(res.body as Buffer, pngBuffer(1))).toBe(0);
  });

  it('gives identical files the same fingerprint, whatever their names', async () => {
    const { token } = await userWithToken();
    const a = await uploadPng(token, 7, 'a.png');
    const b = await uploadPng(token, 7, 'completely-different-name.png');
    const c = await uploadPng(token, 8, 'a.png');
    expect(a.body.contentHash).toBe(b.body.contentHash);
    expect(c.body.contentHash).not.toBe(a.body.contentHash);
  });

  it('rejects a file that is not really an image, even if it is named .png', async () => {
    const { token } = await userWithToken();
    const res = await api()
      .post('/api/images')
      .set(auth(token))
      .attach('file', Buffer.from('hello, I am text'), { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects files larger than 2MB', async () => {
    const { token } = await userWithToken();
    const big = Buffer.concat([pngBuffer(), Buffer.alloc(2 * 1024 * 1024 + 10)]);
    const res = await api()
      .post('/api/images')
      .set(auth(token))
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('requires a file', async () => {
    const { token } = await userWithToken();
    const res = await api().post('/api/images').set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_MISSING');
  });

  it('requires a token to upload, and the admin cannot upload', async () => {
    expect((await api().post('/api/images').attach('file', pngBuffer(), 'a.png')).status).toBe(401);
    const admin = await userWithToken({ role: 'ADMIN' });
    expect((await uploadPng(admin.token)).status).toBe(403);
  });

  it('returns 404 for a missing image and 400 for a bad id', async () => {
    expect((await api().get('/api/images/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await api().get('/api/images/not-a-uuid')).status).toBe(400);
  });
});
