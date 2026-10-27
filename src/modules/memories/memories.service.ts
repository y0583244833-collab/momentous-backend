import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { parseDateOnly } from '../../utils/dates';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError';
import { pageResult, paginate } from '../../utils/pagination';
import { toMemory } from '../../utils/serializers';
import { getBoardAccess, requireMember, type Viewer } from '../boards/boardAccess';
import { assertOwnImage, deleteImageIfUnused } from '../images/images.service';
import type { CreateMemoryInput, ListMemoriesQuery, UpdateMemoryInput } from './memories.schemas';

const memoryInclude = (viewerId: string) =>
  ({
    author: { select: { id: true, fullName: true, avatarImageId: true } },
    _count: { select: { likes: true } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
  }) satisfies Prisma.MemoryInclude;

const orderBy: Record<ListMemoriesQuery['sort'], Prisma.MemoryOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  mostLiked: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'asc' }],
  // Timeline: the story of the event from start to end. Memories without a date come last.
  happenedAt: [{ happenedAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }],
};

export async function listMemories(boardId: string, viewer: Viewer, query: ListMemoriesQuery) {
  await getBoardAccess(boardId, viewer);

  const and: Prisma.MemoryWhereInput[] = [{ boardId }];
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }
  if (query.type) and.push({ type: query.type });
  if (query.authorId) and.push({ authorId: query.authorId });
  if (query.mine) and.push({ authorId: viewer.id });

  const where: Prisma.MemoryWhereInput = { AND: and };
  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      include: memoryInclude(viewer.id),
      orderBy: orderBy[query.sort],
      ...paginate(query.page, query.limit),
    }),
    prisma.memory.count({ where }),
  ]);
  return pageResult(
    memories.map((m) => toMemory(m, viewer.id)),
    query.page,
    query.limit,
    total,
  );
}

/** Rejects an image whose content already appears in another memory of the same board. */
async function assertImageNotInBoard(boardId: string, contentHash: string, exceptMemoryId?: string) {
  const duplicate = await prisma.memory.findFirst({
    where: {
      boardId,
      image: { contentHash },
      ...(exceptMemoryId ? { id: { not: exceptMemoryId } } : {}),
    },
    select: { id: true, title: true },
  });
  if (duplicate) {
    throw conflict(`התמונה הזו כבר קיימת בלוח, בזיכרון "${duplicate.title}"`, 'DUPLICATE_IMAGE');
  }
}

export async function createMemory(boardId: string, viewer: Viewer, input: CreateMemoryInput) {
  await requireMember(boardId, viewer);

  if (input.imageId) {
    const image = await assertOwnImage(input.imageId, viewer.id);
    await assertImageNotInBoard(boardId, image.contentHash);
  }

  const [memory] = await prisma.$transaction([
    prisma.memory.create({
      data: {
        boardId,
        // The author always comes from the token, never from the request body.
        authorId: viewer.id,
        type: input.type,
        title: input.title,
        content: input.content,
        imageId: input.imageId ?? null,
        placeUrl: input.placeUrl ?? null,
        happenedAt: input.happenedAt ? parseDateOnly(input.happenedAt) : null,
      },
      include: memoryInclude(viewer.id),
    }),
    prisma.board.update({ where: { id: boardId }, data: { lastActivityAt: new Date() } }),
  ]);
  return toMemory(memory, viewer.id);
}

async function loadMemory(memoryId: string) {
  const memory = await prisma.memory.findUnique({ where: { id: memoryId } });
  if (!memory) throw notFound('הזיכרון לא נמצא', 'MEMORY_NOT_FOUND');
  return memory;
}

export async function getMemory(memoryId: string, viewer: Viewer) {
  const { boardId } = await loadMemory(memoryId);
  await getBoardAccess(boardId, viewer);
  const memory = await prisma.memory.findUniqueOrThrow({ where: { id: memoryId }, include: memoryInclude(viewer.id) });
  return toMemory(memory, viewer.id);
}

export async function updateMemory(memoryId: string, viewer: Viewer, input: UpdateMemoryInput) {
  const before = await loadMemory(memoryId);
  await requireMember(before.boardId, viewer);
  if (before.authorId !== viewer.id) throw forbidden('אפשר לערוך רק זיכרון שכתבת בעצמך', 'NOT_MEMORY_AUTHOR');

  const finalType = input.type ?? before.type;
  const finalImageId = input.imageId !== undefined ? input.imageId : before.imageId;
  if (finalType === 'PHOTO' && !finalImageId) {
    throw badRequest('בזיכרון מסוג תמונה חובה לצרף תמונה', 'VALIDATION_ERROR', [
      { location: 'body', field: 'imageId', message: 'בזיכרון מסוג תמונה חובה לצרף תמונה' },
    ]);
  }
  if (input.imageId && input.imageId !== before.imageId) {
    const image = await assertOwnImage(input.imageId, viewer.id);
    await assertImageNotInBoard(before.boardId, image.contentHash, memoryId);
  }

  const memory = await prisma.memory.update({
    where: { id: memoryId },
    data: {
      title: input.title,
      content: input.content,
      type: input.type,
      imageId: input.imageId,
      placeUrl: input.placeUrl,
      happenedAt:
        input.happenedAt === undefined ? undefined : input.happenedAt ? parseDateOnly(input.happenedAt) : null,
    },
    include: memoryInclude(viewer.id),
  });
  if (input.imageId !== undefined && before.imageId !== memory.imageId) {
    await deleteImageIfUnused(before.imageId);
  }
  return toMemory(memory, viewer.id);
}

/** The author can delete their own memory; the admin can delete any memory. */
export async function deleteMemory(memoryId: string, viewer: Viewer) {
  const memory = await loadMemory(memoryId);
  const { isMember, isAdmin } = await getBoardAccess(memory.boardId, viewer);
  const isAuthor = isMember && memory.authorId === viewer.id;
  if (!isAuthor && !isAdmin) throw forbidden('אפשר למחוק רק זיכרון שכתבת בעצמך', 'NOT_MEMORY_AUTHOR');

  await prisma.memory.delete({ where: { id: memoryId } });
  await deleteImageIfUnused(memory.imageId);
}

async function likeSummary(memoryId: string, viewerId: string) {
  const [likesCount, mine] = await Promise.all([
    prisma.like.count({ where: { memoryId } }),
    prisma.like.findUnique({ where: { memoryId_userId: { memoryId, userId: viewerId } } }),
  ]);
  return { memoryId, likesCount, likedByMe: Boolean(mine) };
}

export async function like(memoryId: string, viewer: Viewer) {
  const memory = await loadMemory(memoryId);
  await requireMember(memory.boardId, viewer);
  // Liking twice is harmless: there is at most one like per user per memory.
  await prisma.like.upsert({
    where: { memoryId_userId: { memoryId, userId: viewer.id } },
    create: { memoryId, userId: viewer.id },
    update: {},
  });
  return likeSummary(memoryId, viewer.id);
}

export async function unlike(memoryId: string, viewer: Viewer) {
  const memory = await loadMemory(memoryId);
  await requireMember(memory.boardId, viewer);
  await prisma.like.deleteMany({ where: { memoryId, userId: viewer.id } });
  return likeSummary(memoryId, viewer.id);
}
