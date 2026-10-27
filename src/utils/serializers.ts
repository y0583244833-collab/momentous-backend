import type {
  Board,
  BoardInvitation,
  EventType,
  InvitationStatus,
  Memory,
  MemoryType,
  Role,
  User,
} from '@prisma/client';
import { EVENT_TYPE_LABELS, MEMORY_TYPE_LABELS } from '../constants/options';
import { formatDateOnly } from './dates';

export const imageUrl = (imageId: string | null | undefined): string | null =>
  imageId ? `/api/images/${imageId}` : null;

/** Full profile: only for the user themself or for the admin. Never includes the password hash. */
export const toUserProfile = (user: User) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role as Role,
  avatarImageId: user.avatarImageId,
  avatarUrl: imageUrl(user.avatarImageId),
  isBlocked: user.isBlocked,
  createdAt: user.createdAt,
});

/** What other members may see about a user. */
export const toPublicUser = (user: Pick<User, 'id' | 'fullName' | 'avatarImageId'>) => ({
  id: user.id,
  fullName: user.fullName,
  avatarUrl: imageUrl(user.avatarImageId),
});

type BoardWithExtras = Board & {
  creator: Pick<User, 'id' | 'fullName' | 'avatarImageId'>;
  _count: { members: number; memories: number };
};

export const toBoard = (board: BoardWithExtras, viewerId: string) => {
  const isCreator = board.creatorId === viewerId;
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    eventType: board.eventType as EventType,
    eventTypeLabel: EVENT_TYPE_LABELS[board.eventType],
    eventDate: formatDateOnly(board.eventDate),
    coverImageId: board.coverImageId,
    coverImageUrl: imageUrl(board.coverImageId),
    creator: toPublicUser(board.creator),
    isCreator,
    // The join code is shown only to the board creator.
    joinCode: isCreator ? board.joinCode : null,
    membersCount: board._count.members,
    memoriesCount: board._count.memories,
    lastActivityAt: board.lastActivityAt,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
};

type MemoryWithExtras = Memory & {
  author: Pick<User, 'id' | 'fullName' | 'avatarImageId'>;
  _count: { likes: number };
  likes: { userId: string }[];
};

export const toMemory = (memory: MemoryWithExtras, viewerId: string) => ({
  id: memory.id,
  boardId: memory.boardId,
  type: memory.type as MemoryType,
  typeLabel: MEMORY_TYPE_LABELS[memory.type],
  title: memory.title,
  content: memory.content,
  imageId: memory.imageId,
  imageUrl: imageUrl(memory.imageId),
  placeUrl: memory.placeUrl,
  happenedAt: formatDateOnly(memory.happenedAt),
  author: toPublicUser(memory.author),
  isMine: memory.authorId === viewerId,
  likesCount: memory._count.likes,
  likedByMe: memory.likes.some((l) => l.userId === viewerId),
  createdAt: memory.createdAt,
  updatedAt: memory.updatedAt,
});

type InvitationWithExtras = BoardInvitation & {
  board: Pick<Board, 'id' | 'name' | 'eventType' | 'eventDate' | 'coverImageId'>;
  inviter: Pick<User, 'id' | 'fullName' | 'avatarImageId'>;
};

/** An invitation as the invited user sees it. No emails of other users. */
export const toInvitation = (invitation: InvitationWithExtras) => ({
  id: invitation.id,
  status: invitation.status as InvitationStatus,
  createdAt: invitation.createdAt,
  respondedAt: invitation.respondedAt,
  board: {
    id: invitation.board.id,
    name: invitation.board.name,
    eventType: invitation.board.eventType as EventType,
    eventTypeLabel: EVENT_TYPE_LABELS[invitation.board.eventType],
    eventDate: formatDateOnly(invitation.board.eventDate),
    coverImageUrl: imageUrl(invitation.board.coverImageId),
  },
  inviter: toPublicUser(invitation.inviter),
});
