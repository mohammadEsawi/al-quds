import { execFile } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { env } from '../../src/config/env.js';

const run = promisify(execFile);

export interface DbTarget {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/** Splits DATABASE_URL into parts, so the password goes through PGPASSWORD instead of a command line anyone can list. */
export function parseDatabaseUrl(url: string): DbTarget {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

const exe = (name: string) => (env.PG_BIN_DIR ? path.join(env.PG_BIN_DIR, process.platform === 'win32' ? `${name}.exe` : name) : name);

const connectionArgs = (t: DbTarget) => ['-h', t.host, '-p', t.port, '-U', t.user];
const withPassword = (t: DbTarget) => ({ ...process.env, PGPASSWORD: t.password });

export async function pgDump(t: DbTarget, file: string) {
  await run(exe('pg_dump'), [...connectionArgs(t), '--format=custom', '--no-owner', '--file', file, t.database], { env: withPassword(t), maxBuffer: 1 << 24 });
}

export async function pgRestoreList(file: string): Promise<number> {
  const { stdout } = await run(exe('pg_restore'), ['--list', file], { maxBuffer: 1 << 26 });
  return stdout.split('\n').filter((line) => line && !line.startsWith(';')).length;
}

export async function pgRestore(t: DbTarget, file: string) {
  await run(exe('pg_restore'), [...connectionArgs(t), '--clean', '--if-exists', '--no-owner', '-d', t.database, file], { env: withPassword(t), maxBuffer: 1 << 24 });
}

/**
 * tar is part of Linux, macOS and Windows 10+. Arguments are passed as an array (no shell).
 * The archive is always addressed by its bare file name from its own folder: GNU tar reads "C:\..." as
 * "host:file", so an absolute Windows path would be taken for a remote machine.
 */
const inFolderOf = (archive: string) => ({ cwd: path.dirname(archive), maxBuffer: 1 << 26 });

/** GNU tar (Git for Windows) treats backslashes as escapes, so folders are passed with forward slashes. */
const toPosix = (p: string) => p.split(path.sep).join('/');

/** Runs tar and turns a failure into a message that includes what tar itself said. */
async function tar(args: string[], archive: string): Promise<string> {
  try {
    return (await run('tar', args, inFolderOf(archive))).stdout;
  } catch (error) {
    const detail = (error as { stderr?: string }).stderr?.trim() || (error instanceof Error ? error.message : String(error));
    throw new Error(`tar failed: ${detail.split(/\r?\n/)[0]}`);
  }
}

export async function tarCreate(archive: string, parentDir: string, folder: string) {
  await tar(['-czf', path.basename(archive), '-C', toPosix(parentDir), folder], archive);
}
export async function tarList(archive: string): Promise<number> {
  return (await tar(['-tzf', path.basename(archive)], archive)).split(/\r?\n/).filter(Boolean).length;
}
/** Unpacks the archive so its contents land directly inside `destination` (whatever the folder was called when it was archived). */
export async function tarExtract(archive: string, destination: string) {
  fs.mkdirSync(destination, { recursive: true });
  await tar(['-xzf', path.basename(archive), '--strip-components=1', '-C', toPosix(destination)], archive);
}

export async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

// ── optional encryption: LAMBK1 | salt(16) | iv(12) | AES-256-GCM ciphertext | tag(16)
const MAGIC = Buffer.from('LAMBK1');
const key = (passphrase: string, salt: Buffer) => scryptSync(passphrase, salt, 32);

export async function encryptFile(input: string, output: string, passphrase: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(passphrase, salt), iv);
  const out = fs.createWriteStream(output);
  out.write(Buffer.concat([MAGIC, salt, iv]));
  await pipeline(fs.createReadStream(input), cipher, out, { end: false });
  out.end(cipher.getAuthTag());
  await new Promise((resolve, reject) => out.on('finish', resolve).on('error', reject));
}

export async function decryptFile(input: string, output: string, passphrase: string) {
  const size = fs.statSync(input).size;
  const header = Buffer.alloc(MAGIC.length + 28);
  const fd = fs.openSync(input, 'r');
  fs.readSync(fd, header, 0, header.length, 0);
  const tag = Buffer.alloc(16);
  fs.readSync(fd, tag, 0, 16, size - 16);
  fs.closeSync(fd);
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not an encrypted Lamico backup file');
  const salt = header.subarray(MAGIC.length, MAGIC.length + 16);
  const iv = header.subarray(MAGIC.length + 16);
  const decipher = createDecipheriv('aes-256-gcm', key(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  await pipeline(fs.createReadStream(input, { start: header.length, end: size - 17 }), decipher, fs.createWriteStream(output));
}

export interface Manifest {
  createdAt: string;
  database: string;
  encrypted: boolean;
  files: { name: string; size: number; sha256: string }[];
}

export const BACKUP_NAME = /^lamico-\d{8}-\d{6}$/;
