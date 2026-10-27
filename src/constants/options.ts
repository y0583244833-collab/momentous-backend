import type { EventType, MemoryType } from '@prisma/client';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TRIP: 'טיול',
  GRADUATION: 'מסיבת סיום',
  CAMP: 'קייטנה',
  FAMILY: 'שבת או אירוע משפחתי',
  OTHER: 'אחר',
};

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  PHOTO: 'תמונה',
  PLACE: 'מקום',
  SUMMARY: 'סיכום',
  JOKE: 'בדיחה קבוצתית',
  QUOTE: 'ציטוט',
};

export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as [EventType, ...EventType[]];
export const MEMORY_TYPES = Object.keys(MEMORY_TYPE_LABELS) as [MemoryType, ...MemoryType[]];

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
