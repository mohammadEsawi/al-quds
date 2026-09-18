import multer from 'multer';
import { env } from '../config/env.js';

const memory = (limitMb: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limitMb * 1024 * 1024, files: 1, fields: 30, fieldSize: 20_000 },
  });

/** Media library upload (field `file`). Per-kind limits (image vs video) are enforced in the service. */
export const mediaUpload = memory(Math.max(env.MAX_UPLOAD_MB, env.MAX_VIDEO_MB)).single('file');

/** Job application CV (field `cv`). */
export const cvUpload = memory(env.MAX_CV_MB).single('cv');
