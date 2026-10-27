import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../utils/httpError';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Validates and replaces req.body / req.query / req.params with the parsed (typed, trimmed) values. */
export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const details: { location: string; field: string; message: string }[] = [];

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        (req as unknown as Record<string, unknown>)[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ location, field: issue.path.join('.') || location, message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(badRequest('הנתונים שנשלחו לא תקינים', 'VALIDATION_ERROR', details));
    }
    next();
  };
