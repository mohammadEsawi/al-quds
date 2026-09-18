import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import type { MediaKind } from '../generated/prisma/client.js';

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
export const MEDIA_DIR = path.join(UPLOAD_ROOT, 'media');
/** CVs live here and are never served statically — only through the authenticated download route. */
export const CV_DIR = path.join(UPLOAD_ROOT, 'private', 'cv');

export interface DetectedFile {
  mime: string;
  ext: string;
  kind: MediaKind;
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Buffer, from: number, to: number) => buf.subarray(from, to).toString('latin1');

/**
 * Identifies a file by its content, not its name or the browser-supplied MIME type,
 * so a renamed executable or an HTML file cannot pass as an image. SVG is rejected on purpose (scripts).
 */
export function detectFile(buf: Buffer): DetectedFile | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg', kind: 'IMAGE' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png', kind: 'IMAGE' };
  if (ascii(buf, 0, 4) === 'GIF8') return { mime: 'image/gif', ext: 'gif', kind: 'IMAGE' };
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'IMAGE' };
  if (ascii(buf, 4, 8) === 'ftyp') return { mime: 'video/mp4', ext: 'mp4', kind: 'VIDEO' };
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: 'video/webm', ext: 'webm', kind: 'VIDEO' };
  if (ascii(buf, 0, 5) === '%PDF-') return { mime: 'application/pdf', ext: 'pdf', kind: 'DOCUMENT' };
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return { mime: 'application/msword', ext: 'doc', kind: 'DOCUMENT' };
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // .docx is a zip; require the Word part name to avoid accepting arbitrary archives.
    if (buf.subarray(0, 4096).includes('word/')) {
      return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx', kind: 'DOCUMENT' };
    }
  }
  return null;
}

export const CV_TYPES = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);

/** Writes a buffer to `dir` under a random name and returns the stored file name. */
export async function storeFile(dir: string, buf: Buffer, ext: string): Promise<string> {
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf, { flag: 'wx' });
  return filename;
}

export async function removeFile(dir: string, filename: string): Promise<void> {
  // basename() guards against path traversal if a bad value ever reaches here.
  await fs.rm(path.join(dir, path.basename(filename)), { force: true });
}

export function safeDownloadName(name: string): string {
  return name.replace(/[^\w.\-؀-ۿ ]+/g, '_').slice(0, 120) || 'file';
}
