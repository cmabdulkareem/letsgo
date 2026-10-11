import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/gif', '.gif'],
]);

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxMb * 1024 * 1024, files: 1 },
});

/**
 * Validates content by magic bytes (never the declared extension/MIME) and
 * persists under uploads/. Returns the public path.
 */
export async function saveImage(buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw ApiError.badRequest('Unsupported file type. Upload a JPEG, PNG, WebP, AVIF or GIF image.');
  }
  const now = new Date();
  const relDir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const absDir = path.join(UPLOAD_ROOT, relDir);
  await fs.mkdir(absDir, { recursive: true });

  const filename = `${crypto.randomBytes(16).toString('hex')}${ALLOWED_MIME.get(detected.mime)}`;
  await fs.writeFile(path.join(absDir, filename), buffer);
  return `/uploads/${relDir.split(path.sep).join('/')}/${filename}`;
}

export async function deleteImage(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const abs = path.join(UPLOAD_ROOT, publicPath.replace('/uploads/', ''));
  await fs.unlink(abs).catch(() => {});
}
