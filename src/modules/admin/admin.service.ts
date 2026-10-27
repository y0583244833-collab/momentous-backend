import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../utils/httpError';
import { pageResult, paginate } from '../../utils/pagination';
import { toUserProfile } from '../../utils/serializers';
import { boardFilters, boardInclude } from '../boards/boards.service';
import { toBoard } from '../../utils/serializers';
import type { ListAllBoardsQuery, ListUsersQuery } from './admin.schemas';

export async function listUsers(query: ListUsersQuery) {
  const and: Prisma.UserWhereInput[] = [];
  if (query.q) {
    and.push({
      OR: [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }
  if (query.blocked) and.push({ isBlocked: query.blocked === 'true' });

  const where: Prisma.UserWhereInput = { AND: and };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { createdBoards: true, memberships: true, memories: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...paginate(query.page, query.limit),
    }),
    prisma.user.count({ where }),
  ]);
  return pageResult(
    users.map((u) => ({
      ...toUserProfile(u),
      boardsCreated: u._count.createdBoards,
      boardsJoined: u._count.memberships,
      memoriesCount: u._count.memories,
    })),
    query.page,
    query.limit,
    total,
  );
}

export async function setBlocked(adminId: string, userId: string, isBlocked: boolean) {
  if (userId === adminId) throw badRequest('אי אפשר לחסום את עצמך', 'CANNOT_BLOCK_SELF');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא', 'USER_NOT_FOUND');
  if (user.role === 'ADMIN') throw badRequest('אי אפשר לחסום מנהל', 'CANNOT_BLOCK_ADMIN');
  const updated = await prisma.user.update({ where: { id: userId }, data: { isBlocked } });
  return toUserProfile(updated);
}

/** Deletes a user and everything they own (boards they opened, memories, likes, memberships, images). */
export async function deleteUser(adminId: string, userId: string) {
  if (userId === adminId) throw badRequest('אי אפשר למחוק את עצמך', 'CANNOT_DELETE_SELF');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא', 'USER_NOT_FOUND');
  if (user.role === 'ADMIN') throw badRequest('אי אפשר למחוק מנהל', 'CANNOT_DELETE_ADMIN');
  await prisma.user.delete({ where: { id: userId } });
}

export async function listAllBoards(adminId: string, query: ListAllBoardsQuery) {
  const where: Prisma.BoardWhereInput = { AND: boardFilters(query) };
  const [boards, total] = await Promise.all([
    prisma.board.findMany({
      where,
      include: boardInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...paginate(query.page, query.limit),
    }),
    prisma.board.count({ where }),
  ]);
  return pageResult(
    boards.map((b) => toBoard(b, adminId)),
    query.page,
    query.limit,
    total,
  );
}
