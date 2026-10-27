import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { uploadImage } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParams } from '../../utils/zod';
import * as controller from './images.controller';

export const imagesRouter = Router();

imagesRouter.post('/', requireAuth, requireRole('USER'), uploadImage, asyncHandler(controller.upload));
// Public on purpose: <img src> cannot send a token. Image ids are random UUIDs that cannot be guessed.
imagesRouter.get('/:id', validate({ params: idParams }), asyncHandler(controller.get));
