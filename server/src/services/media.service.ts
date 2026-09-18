import { env } from '../config/env.js';
import type { MediaKind, Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { detectFile, MEDIA_DIR, MEDIA_TYPES, removeFile, storeFile } from '../lib/files.js';
import { splitOpt } from '../lib/localized.js';
import { pageArgs } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import type { Media } from '../generated/prisma/client.js';

export const MEDIA_URL_PREFIX = '/uploads/media';

const toDto = (m: Media) => ({
  id: m.id,
  kind: m.kind.toLowerCase(),
  url: m.url,
  filename: m.filename,
  originalName: m.originalName,
  mimeType: m.mimeType,
  size: m.size,
  alt: { ar: m.altAr ?? '', en: m.altEn ?? '' },
  createdAt: m.createdAt,
});

function fixFilename(name: string): string {
  return /[\u0080-ÿ]/.test(name) && !/[^\u0000-ÿ]/.test(name) ? Buffer.from(name, 'latin1').toString('utf8') : name;
}

/** Validates content, type and size for the media library. */
function inspect(file: Express.Multer.File | undefined) {
  if (!file) throw AppError.badRequest('No file was uploaded (field name: "file")', 'FILE_REQUIRED');
  const detected = detectFile(file.buffer);
  if (!detected || !MEDIA_TYPES.has(detected.mime)) {
    throw AppError.badRequest('Only JPG, PNG, WebP, GIF, MP4 and WebM files are allowed', 'INVALID_FILE_TYPE');
  }
  const limitMb = detected.kind === 'VIDEO' ? env.MAX_VIDEO_MB : env.MAX_UPLOAD_MB;
  if (file.size > limitMb * 1024 * 1024) throw new AppError(413, 'FILE_TOO_LARGE', `The file exceeds ${limitMb} MB`);
  return detected;
}

export async function uploadMedia(file: Express.Multer.File | undefined) {
  const detected = inspect(file);
  const filename = await storeFile(MEDIA_DIR, file!.buffer, detected.ext);
  try {
    const row = await prisma.media.create({
      data: {
        kind: detected.kind,
        filename,
        originalName: fixFilename(file!.originalname).slice(0, 200),
        url: `${MEDIA_URL_PREFIX}/${filename}`,
        mimeType: detected.mime,
        size: file!.size,
      },
    });
    return toDto(row);
  } catch (error) {
    await removeFile(MEDIA_DIR, filename);
    throw error;
  }
}

/**
 * Replaces the bytes of an existing item. The type must stay the same so the public URL
 * (already used by products, logos, ...) keeps working.
 */
export async function replaceMedia(id: string, file: Express.Multer.File | undefined) {
  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Media not found', 'MEDIA_NOT_FOUND');
  const detected = inspect(file);
  if (detected.mime !== existing.mimeType) {
    throw AppError.badRequest('The replacement must be the same file type as the original', 'TYPE_MISMATCH');
  }
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  await fs.writeFile(path.join(MEDIA_DIR, path.basename(existing.filename)), file!.buffer);
  const row = await prisma.media.update({
    where: { id },
    data: { size: file!.size, originalName: fixFilename(file!.originalname).slice(0, 200) },
  });
  return toDto(row);
}

export async function listMedia(query: { page: number; pageSize: number; kind?: string; q?: string }) {
  const where: Prisma.MediaWhereInput = {
    ...(query.kind && { kind: query.kind.toUpperCase() as MediaKind }),
    ...(query.q && { originalName: { contains: query.q, mode: 'insensitive' } }),
  };
  const [rows, total] = await Promise.all([
    prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.media.count({ where }),
  ]);
  return { items: rows.map(toDto), total, page: query.page, pageSize: query.pageSize };
}

export async function updateMedia(id: string, input: { alt?: { ar: string; en: string } }) {
  const alt = input.alt && splitOpt(input.alt);
  const row = await prisma.media.update({ where: { id }, data: alt ? { altAr: alt.ar, altEn: alt.en } : {} });
  return toDto(row);
}

export async function deleteMedia(id: string) {
  const row = await prisma.media.delete({ where: { id } });
  await removeFile(MEDIA_DIR, row.filename);
}
