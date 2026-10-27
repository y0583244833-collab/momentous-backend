import type { Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { forbidden, notFound } from '../../utils/httpError';

export interface Viewer {
  id: string;
  role: Role;
}

/**
 * Loads a board and checks that the viewer may see it:
 * board members can, the admin can (for moderation), anyone else gets 403.
 */
export async function getBoardAccess(boardId: string, viewer: Viewer) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) throw notFound('הלוח לא נמצא', 'BOARD_NOT_FOUND');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: viewer.id } },
  });
  const isMember = Boolean(membership);
  const isCreator = board.creatorId === viewer.id;
  const isAdmin = viewer.role === 'ADMIN';

  if (!isMember && !isAdmin) throw forbidden('אינך חבר בלוח הזה', 'NOT_A_MEMBER');
  return { board, isMember, isCreator, isAdmin };
}

export async function requireMember(boardId: string, viewer: Viewer) {
  const access = await getBoardAccess(boardId, viewer);
  if (!access.isMember) throw forbidden('רק חברי הלוח יכולים לבצע את הפעולה', 'NOT_A_MEMBER');
  return access;
}

export async function requireCreator(boardId: string, viewer: Viewer) {
  const access = await getBoardAccess(boardId, viewer);
  if (!access.isCreator) throw forbidden('רק מי שפתח את הלוח יכול לבצע את הפעולה', 'NOT_BOARD_CREATOR');
  return access;
}
