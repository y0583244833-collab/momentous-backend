import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { conflict, notFound } from '../../utils/httpError';
import { pageResult, paginate } from '../../utils/pagination';
import { toBoard, toInvitation } from '../../utils/serializers';
import { requireCreator, type Viewer } from '../boards/boardAccess';
import { boardInclude } from '../boards/boards.service';
import type { CreateInvitationsInput, ListInvitationsQuery } from './invitations.schemas';
import { inviteEmails } from './inviteEmails';

export const invitationInclude = {
  board: { select: { id: true, name: true, eventType: true, eventDate: true, coverImageId: true } },
  inviter: { select: { id: true, fullName: true, avatarImageId: true } },
} satisfies Prisma.BoardInvitationInclude;

/** The board creator invites one or more email addresses. Nobody joins the board until they accept. */
export async function createInvitations(boardId: string, viewer: Viewer, input: CreateInvitationsInput) {
  const { board } = await requireCreator(boardId, viewer);
  return { boardId, ...(await inviteEmails(prisma, board, viewer.id, input.emails)) };
}

/** The signed-in user's email. Invitations are always matched by it, never by an address the client sends. */
async function viewerEmail(viewer: Viewer): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { email: true } });
  if (!user) throw notFound('המשתמש לא נמצא');
  return user.email;
}

export async function listMyInvitations(viewer: Viewer, query: ListInvitationsQuery) {
  const where: Prisma.BoardInvitationWhereInput = { inviteeEmail: await viewerEmail(viewer), status: query.status };
  const [invitations, total] = await Promise.all([
    prisma.boardInvitation.findMany({
      where,
      include: invitationInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...paginate(query.page, query.limit),
    }),
    prisma.boardInvitation.count({ where }),
  ]);
  return pageResult(invitations.map(toInvitation), query.page, query.limit, total);
}

export async function pendingCount(viewer: Viewer) {
  const count = await prisma.boardInvitation.count({
    where: { inviteeEmail: await viewerEmail(viewer), status: 'PENDING' },
  });
  return { count };
}

/**
 * Explains why an answer did not change anything.
 * Someone else's invitation is reported as not found, so its existence is not revealed.
 */
async function answerFailure(invitationId: string, email: string) {
  const invitation = await prisma.boardInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.inviteeEmail !== email) {
    return notFound('ההזמנה לא נמצאה', 'INVITATION_NOT_FOUND');
  }
  return conflict('כבר השבת על ההזמנה הזו', 'INVITATION_ALREADY_ANSWERED');
}

/** Accepts: PENDING -> ACCEPTED and the user becomes a member, in one transaction. Returns the board. */
export async function acceptInvitation(invitationId: string, viewer: Viewer) {
  const email = await viewerEmail(viewer);

  const boardId = await prisma.$transaction(async (tx) => {
    // The status condition makes a second (or parallel) accept change nothing.
    const updated = await tx.boardInvitation.updateMany({
      where: { id: invitationId, inviteeEmail: email, status: 'PENDING' },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    if (updated.count === 0) throw await answerFailure(invitationId, email);

    const invitation = await tx.boardInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      select: { boardId: true },
    });
    // If the user already joined with the code, no second membership is created.
    await tx.boardMember.createMany({
      data: [{ boardId: invitation.boardId, userId: viewer.id }],
      skipDuplicates: true,
    });
    return invitation.boardId;
  });

  const board = await prisma.board.findUniqueOrThrow({ where: { id: boardId }, include: boardInclude });
  return toBoard(board, viewer.id);
}

/** Declines: PENDING -> DECLINED. The user does not join the board. */
export async function declineInvitation(invitationId: string, viewer: Viewer) {
  const email = await viewerEmail(viewer);
  const updated = await prisma.boardInvitation.updateMany({
    where: { id: invitationId, inviteeEmail: email, status: 'PENDING' },
    data: { status: 'DECLINED', respondedAt: new Date() },
  });
  if (updated.count === 0) throw await answerFailure(invitationId, email);

  const invitation = await prisma.boardInvitation.findUniqueOrThrow({
    where: { id: invitationId },
    include: invitationInclude,
  });
  return toInvitation(invitation);
}
