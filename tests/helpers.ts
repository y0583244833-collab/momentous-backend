import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

export const app = createApp();
export const api = () => request(app);
export const PASSWORD = 'Test1234!';

/** Empties all tables so every test starts from a clean database. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "BoardInvitation", "Like", "Memory", "BoardMember", "Board", "User", "Image" RESTART IDENTITY CASCADE',
  );
}

let counter = 0;
export async function createUser(opts: { role?: Role; fullName?: string; isBlocked?: boolean } = {}) {
  counter += 1;
  return prisma.user.create({
    data: {
      fullName: opts.fullName ?? `משתמש ${counter}`,
      email: `user${counter}_${Date.now()}@example.com`,
      role: opts.role ?? 'USER',
      isBlocked: opts.isBlocked ?? false,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    },
  });
}

export async function loginAs(email: string, password = PASSWORD): Promise<string> {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

/** Creates a user and returns it together with a valid token. */
export async function userWithToken(opts: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser(opts);
  return { user, token: await loginAs(user.email) };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** A minimal PNG-signed buffer. Each `variant` has different bytes, so a different content hash. */
export function pngBuffer(variant = 0): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, Buffer.from(`fake-png-body-${variant}`)]);
}

export function uploadPng(token: string, variant = 0, filename = 'photo.png') {
  return api()
    .post('/api/images')
    .set(auth(token))
    .attach('file', pngBuffer(variant), { filename, contentType: 'image/png' });
}

export async function createBoard(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post('/api/boards')
    .set(auth(token))
    .send({ name: 'טיול שנתי', eventType: 'TRIP', eventDate: '2026-04-14', ...overrides });
  if (res.status !== 201) throw new Error(`createBoard failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export function joinBoard(token: string, code: string) {
  return api().post('/api/boards/join').set(auth(token)).send({ code });
}

export async function createMemory(token: string, boardId: string, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post(`/api/boards/${boardId}/memories`)
    .set(auth(token))
    .send({ title: 'זיכרון', content: 'תוכן הזיכרון', type: 'SUMMARY', ...overrides });
  if (res.status !== 201) throw new Error(`createMemory failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export { prisma };
