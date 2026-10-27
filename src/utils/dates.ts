/** Converts a "YYYY-MM-DD" string to a Date at UTC midnight. */
export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

/** Formats a date-only column as "YYYY-MM-DD". */
export const formatDateOnly = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;
