import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import * as imagesService from './images.service';

export async function upload(req: Request, res: Response) {
  res.status(201).json(await imagesService.uploadImage(currentUser(req).id, req.file));
}

export async function get(req: Request, res: Response) {
  const image = await imagesService.getImage(req.params.id);
  res.set({
    'Content-Type': image.mimeType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(image.data));
}
