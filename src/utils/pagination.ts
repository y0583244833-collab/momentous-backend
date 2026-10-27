export const paginate = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });

export const pageResult = <T>(items: T[], page: number, limit: number, total: number) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
