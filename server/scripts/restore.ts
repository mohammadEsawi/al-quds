/**
 * Checks or restores a backup made by `npm run backup`.
 *
 *   npm run backup:verify                          checks the newest backup (files, checksums, dump readable) — changes nothing
 *   npm run backup:verify -- backups/lamico-...    checks a specific one
 *   npm run backup:restore -- backups/lamico-... --yes
 *        REPLACES the database in DATABASE_URL and the uploads folder with the backup. Without --yes it only explains.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { env } from '../src/config/env.js';
import { UPLOAD_ROOT } from '../src/lib/files.js';
import { BACKUP_NAME, decryptFile, parseDatabaseUrl, pgRestore, pgRestoreList, sha256, tarExtract, tarList, type Manifest } from './lib/backup-utils.js';

const args = process.argv.slice(2);
const restoring = args.includes('--restore');
const confirmed = args.includes('--yes');
const given = args.find((a) => !a.startsWith('--'));

function findBackup(): string {
  if (given) return path.resolve(given);
  const root = path.resolve(env.BACKUP_DIR);
  const newest = fs.existsSync(root) ? fs.readdirSync(root).filter((n) => BACKUP_NAME.test(n)).sort().at(-1) : undefined;
  if (!newest) throw new Error(`No backups found in ${root}`);
  return path.join(root, newest);
}

async function main() {
  const folder = findBackup();
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
  console.log(`Backup ${path.basename(folder)} — made ${manifest.createdAt}, database "${manifest.database}"${manifest.encrypted ? ', encrypted' : ''}`);

  for (const file of manifest.files) {
    const actual = await sha256(path.join(folder, file.name));
    if (actual !== file.sha256) throw new Error(`${file.name} is damaged (checksum does not match)`);
    console.log(`  ✓ ${file.name} — checksum ok (${(file.size / 1048576).toFixed(1)} MB)`);
  }

  // Open (decrypt) into a temporary folder that is always removed.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-restore-'));
  try {
    const open = async (name: string) => {
      const source = path.join(folder, name);
      if (!name.endsWith('.enc')) return source;
      if (!env.BACKUP_PASSPHRASE) throw new Error('This backup is encrypted: set BACKUP_PASSPHRASE in server/.env');
      const out = path.join(work, name.replace(/\.enc$/, ''));
      await decryptFile(source, out, env.BACKUP_PASSPHRASE);
      return out;
    };

    const dumpName = manifest.files.find((f) => f.name.startsWith('db.dump'))?.name;
    const uploadsName = manifest.files.find((f) => f.name.startsWith('uploads.tar.gz'))?.name;
    const dump = dumpName ? await open(dumpName) : null;
    const uploads = uploadsName ? await open(uploadsName) : null;

    if (dump) console.log(`  ✓ database dump readable (${await pgRestoreList(dump)} objects)`);
    if (uploads) console.log(`  ✓ uploads archive readable (${await tarList(uploads)} entries)`);

    if (!restoring) {
      console.log('\nBackup is healthy. (Nothing was changed.)');
      return;
    }

    const target = parseDatabaseUrl(env.DATABASE_URL);
    if (!confirmed) {
      console.log(`\nThis would REPLACE database "${target.database}" and the folder ${UPLOAD_ROOT} with the backup.\nRun again with --yes to do it.`);
      process.exitCode = 2;
      return;
    }
    if (dump) {
      await pgRestore(target, dump);
      console.log(`  ✓ database "${target.database}" restored`);
    }
    if (uploads) {
      await tarExtract(uploads, UPLOAD_ROOT);
      console.log(`  ✓ uploads restored into ${UPLOAD_ROOT}`);
    }
    console.log('\n✓ Restore complete. Restart the server.');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message.split('\n')[0] : error}`);
  process.exitCode = 1;
});
