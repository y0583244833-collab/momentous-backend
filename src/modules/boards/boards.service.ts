import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { parseDateOnly } from '../../utils/dates';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError';
import { generateJoinCode } from '../../utils/joinCode';
import { pageResult, paginate } from '../../utils/pagination';
import { toBoard, toPublicUser } from '../../utils/serializers';
import { assertOwnImage, deleteImageIfUnused } from '../images/images.service';
import { inviteEmails } from '../invitations/inviteEmails';
import { getBoardAccess, requireCreator, requireMember, type Viewer } from './boardAccess';
import type { CreateBoardInput, ListBoardsQuery, UpdateBoardInput } from './boards.schemas';

export const boardInclude = {
  creator: { select: { id: true, fullName: true, avatarImageId: true } },
  _count: { select: { members: true, memories: true } },
} satisfies Prisma.BoardInclude;

/** Builds the WHERE for search + filters shared by "my boards" and the admin board list. */
export function boardFilters(query: Partial<ListBoardsQuery>): Prisma.BoardWhereInput[] {
  const and: Prisma.BoardWhereInput[] = [];
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }
  if (query.eventType) and.push({ eventType: query.eventType });
  if (query.from || query.to) {
    and.push({
      eventDate: {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      },
    });
  }
  return and;
}

const sortField = { eventDate: 'eventDate', name: 'name', lastActivity: 'lastActivityAt' } as const;

export async function listMyBoards(viewer: Viewer, query: ListBoardsQuery) {
  if (query.from && query.to && query.from > query.to) {
    throw badRequest('תאריך ההתחלה מאוחר מתאריך הסיום', 'INVALID_DATE_RANGE');
  }
  const and = boardFilters(query);
  and.push({ members: { some: { userId: viewer.id } } });
  if (query.role === 'created') and.push({ creatorId: viewer.id });
  if (query.role === 'joined') and.push({ creatorId: { not: viewer.id } });

  const where: Prisma.BoardWhereInput = { AND: and };
  const [boards, total] = await Promise.all([
    prisma.board.findMany({
      where,
      include: boardInclude,
      orderBy: [{ [sortField[query.sort]]: query.order }, { id: 'asc' }],
      ...paginate(query.page, query.limit),
    }),
    prisma.board.count({ where }),
  ]);
  return pageResult(
    boards.map((b) => toBoard(b, viewer.id)),
    query.page,
    query.limit,
    total,
  );
}

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const taken = await prisma.board.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error('Could not generate a unique join code');
}

export async function createBoard(viewer: Viewer, input: CreateBoardInput) {
  if (input.coverImageId) await assertOwnImage(input.coverImageId, viewer.id);

  const data = {
    name: input.name,
    description: input.description ?? null,
    eventType: input.eventType,
    eventDate: parseDateOnly(input.eventDate),
    coverImageId: input.coverImageId ?? null,
    joinCode: await uniqueJoinCode(),
    creatorId: viewer.id,
    // The creator is automatically a member of the board.
    members: { create: { userId: viewer.id } },
  } satisfies Prisma.BoardUncheckedCreateInput;

  // No emails: exactly the same as before.
  if (!input.emails?.length) {
    const board = await prisma.board.create({ data, include: boardInclude });
    return toBoard(board, viewer.id);
  }

  // With emails: the board and its invitations are saved together, or not at all.
  const emails = input.emails;
  const { board, invitations } = await prisma.$transaction(async (tx) => {
    const created = await tx.board.create({ data, include: boardInclude });
    return { board: created, invitations: await inviteEmails(tx, created, viewer.id, emails) };
  });
  return { ...toBoard(board, viewer.id), invitations };
}

export async function getBoard(boardId: string, viewer: Viewer) {
  await getBoardAccess(boardId, viewer);
  const board = await prisma.board.findUniqueOrThrow({ where: { id: boardId }, include: boardInclude });
  return toBoard(board, viewer.id);
}

export async function updateBoard(boardId: string, viewer: Viewer, input: UpdateBoardInput) {
  const { board: before } = await requireCreator(boardId, viewer);
  if (input.coverImageId) await assertOwnImage(input.coverImageId, viewer.id);

  const board = await prisma.board.update({
    where: { id: boardId },
    data: {
      name: input.name,
      description: input.description,
      eventType: input.eventType,
      eventDate: input.eventDate ? parseDateOnly(input.eventDate) : undefined,
      coverImageId: input.coverImageId,
    },
    include: boardInclude,
  });
  if (input.coverImageId !== undefined && before.coverImageId !== board.coverImageId) {
    await deleteImageIfUnused(before.coverImageId);
  }
  return toBoard(board, viewer.id);
}

/** Deletes a board with all its memories, likes and members. Allowed for the creator and the admin. */
export async function deleteBoard(boardId: string, viewer: Viewer) {
  const { board, isCreator, isAdmin } = await getBoardAccess(boardId, viewer);
  if (!isCreator && !isAdmin) throw forbidden('רק מי שפתח את הלוח או בעל המערכת יכולים למחוק אותו', 'NOT_BOARD_CREATOR');

  const memoryImages = await prisma.memory.findMany({
    where: { boardId, imageId: { not: null } },
    select: { imageId: true },
  });
  await prisma.board.delete({ where: { id: boardId } });
  for (const id of [board.coverImageId, ...memoryImages.map((m) => m.imageId)]) {
    await deleteImageIfUnused(id);
  }
}

export async function joinBoard(viewer: Viewer, code: string) {
  const board = await prisma.board.findUnique({ where: { joinCode: code } });
  if (!board) throw notFound('לא נמצא לוח עם הקוד הזה', 'JOIN_CODE_NOT_FOUND');

  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: board.id, userId: viewer.id } },
  });
  if (existing) throw conflict('את/ה כבר חבר/ה בלוח הזה', 'ALREADY_MEMBER');

  await prisma.boardMember.create({ data: { boardId: board.id, userId: viewer.id } });
  const full = await prisma.board.findUniqueOrThrow({ where: { id: board.id }, include: boardInclude });
  return toBoard(full, viewer.id);
}

export async function regenerateJoinCode(boardId: string, viewer: Viewer) {
  await requireCreator(boardId, viewer);
  const board = await prisma.board.update({
    where: { id: boardId },
    data: { joinCode: await uniqueJoinCode() },
    select: { joinCode: true },
  });
  return { joinCode: board.joinCode };
}

export async function listMembers(boardId: string, viewer: Viewer) {
  const { board } = await getBoardAccess(boardId, viewer);
  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, fullName: true, avatarImageId: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  return members.map((m) => ({
    ...toPublicUser(m.user),
    isCreator: m.userId === board.creatorId,
    joinedAt: m.joinedAt,
  }));
}

export async function removeMember(boardId: string, viewer: Viewer, userId: string) {
  await requireCreator(boardId, viewer);
  if (userId === viewer.id) {
    throw badRequest('פותח הלוח לא יכול להוציא את עצמו. אפשר למחוק את הלוח', 'CANNOT_REMOVE_CREATOR');
  }
  const deleted = await prisma.boardMember.deleteMany({ where: { boardId, userId } });
  if (deleted.count === 0) throw notFound('המשתמש אינו חבר בלוח', 'MEMBER_NOT_FOUND');
}

export async function leaveBoard(boardId: string, viewer: Viewer) {
  const { isCreator } = await requireMember(boardId, viewer);
  if (isCreator) {
    throw badRequest('פותח הלוח לא יכול לעזוב אותו. אפשר למחוק את הלוח', 'CREATOR_CANNOT_LEAVE');
  }
  await prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId: viewer.id } } });
}
