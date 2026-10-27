import type { Prisma } from '@prisma/client';

/**
 * What happened to each address when inviting:
 * INVITED          - a pending invitation was saved (registered or not yet registered)
 * ALREADY_INVITED  - a pending invitation for this board and address already exists
 * ALREADY_MEMBER   - the address belongs to a member of the board
 * SELF             - the board creator's own address
 * NOT_ALLOWED      - the address cannot be invited (the reason is not exposed)
 */
export type InviteResult = 'INVITED' | 'ALREADY_INVITED' | 'ALREADY_MEMBER' | 'SELF' | 'NOT_ALLOWED';

export interface InviteEmailsResult {
  invitedCount: number;
  results: { email: string; result: InviteResult; invitationId: string | null }[];
}

/**
 * Saves one pending invitation without throwing on duplicates, so it also works inside a transaction.
 * Relies on the unique (boardId, inviteeEmail) index: one row per board + email.
 */
async function savePending(db: Prisma.TransactionClient, boardId: string, inviterId: string, inviteeEmail: string) {
  const created = await db.boardInvitation.createMany({
    data: [{ boardId, inviterId, inviteeEmail }],
    skipDuplicates: true,
  });
  let invited = created.count === 1;
  if (!invited) {
    // A row for this board + email exists. If it was already answered, invite again by reopening it.
    const reopened = await db.boardInvitation.updateMany({
      where: { boardId, inviteeEmail, status: { not: 'PENDING' } },
      data: { status: 'PENDING', inviterId, respondedAt: null, createdAt: new Date() },
    });
    invited = reopened.count === 1;
  }
  const row = await db.boardInvitation.findUniqueOrThrow({
    where: { boardId_inviteeEmail: { boardId, inviteeEmail } },
    select: { id: true },
  });
  return { result: invited ? ('INVITED' as const) : ('ALREADY_INVITED' as const), invitationId: row.id };
}

/**
 * The single place that creates invitations. Used by "send invitations" and by "create board with emails".
 * Permissions are checked by the caller. `emails` must already be normalized and without duplicates
 * (the Zod schemas do that). Nobody joins the board here: only accepting an invitation adds a member.
 */
export async function inviteEmails(
  db: Prisma.TransactionClient,
  board: { id: string; creatorId: string },
  inviterId: string,
  emails: string[],
): Promise<InviteEmailsResult> {
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, role: true, isBlocked: true },
  });
  const userByEmail = new Map(users.map((u) => [u.email, u]));
  const members = await db.boardMember.findMany({
    where: { boardId: board.id, userId: { in: users.map((u) => u.id) } },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));

  const results: InviteEmailsResult['results'] = [];
  for (const email of emails) {
    const user = userByEmail.get(email);
    let result: InviteResult | null = null;
    if (user?.id === board.creatorId) result = 'SELF';
    else if (user && memberIds.has(user.id)) result = 'ALREADY_MEMBER';
    else if (user && (user.isBlocked || user.role === 'ADMIN')) result = 'NOT_ALLOWED';

    if (result) results.push({ email, result, invitationId: null });
    else results.push({ email, ...(await savePending(db, board.id, inviterId, email)) });
  }

  return { invitedCount: results.filter((r) => r.result === 'INVITED').length, results };
}
