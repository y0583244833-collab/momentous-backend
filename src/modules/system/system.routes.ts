import { Router } from 'express';
import { EVENT_TYPE_LABELS, MEMORY_TYPE_LABELS } from '../../constants/options';
import { prisma } from '../../db/prisma';
import { asyncHandler } from '../../utils/asyncHandler';

export const systemRouter = Router();

systemRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable', time: new Date().toISOString() });
    }
  }),
);

systemRouter.get('/options', (_req, res) => {
  const toList = (labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label }));
  res.json({ memoryTypes: toList(MEMORY_TYPE_LABELS), eventTypes: toList(EVENT_TYPE_LABELS) });
});
