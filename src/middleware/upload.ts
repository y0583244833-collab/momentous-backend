import multer from 'multer';
import { IMAGE_MAX_BYTES } from '../constants/options';

/** Keeps the uploaded file in memory (it is saved to the database afterwards). */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
}).single('file');
