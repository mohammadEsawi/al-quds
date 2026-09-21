/**
 * Backs up the database and the uploaded files:  npm run backup
 *
 *   backups/lamico-20260920-021500/  db.dump  uploads.tar.gz  manifest.json
 *
 * - the database goes through pg_dump (custom format) and is checked to be readable before it is kept
 * - uploads (media library + private CVs) are archived with tar
 * - with BACKUP_PASSPHRASE set, both files are encrypted (AES-256-GCM); CVs are personal data
 * - only the newest BACKUP_KEEP backups are kept
 *
 * Schedule it (see README "Backups"), and copy the folder somewhere that is NOT this server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env.js';
import { UPLOAD_ROOT } from '../src/lib/files.js';
import { BACKUP_NAME, encryptFile, parseDatabaseUrl, pgDump, pgRestoreList, sha256, tarCreate, type Manifest } from './lib/backup-utils.js';

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

async function main() {
  const root = path.resolve(env.BACKUP_DIR);
  const target = parseDatabaseUrl(env.DATABASE_URL);
  const folder = path.join(root, `lamico-${stamp()}`);
  fs.mkdirSync(folder, { recursive: true });

  console.log(`Backing up database "${target.database}" and ${UPLOAD_ROOT}`);
  const dump = path.join(folder, 'db.dump');
  await pgDump(target, dump);
  const entries = await pgRestoreList(dump);
  if (entries < 10) throw new Error(`The database dump looks empty (${entries} entries)`);
  console.log(`  ✓ database dumped (${entries} objects, readable)`);

  const uploads = path.join(folder, 'uploads.tar.gz');
  if (fs.existsSync(UPLOAD_ROOT)) {
    await tarCreate(uploads, path.dirname(UPLOAD_ROOT), path.basename(UPLOAD_ROOT));
    console.log('  ✓ uploads archived');
  } else {
    console.log('  • no uploads folder yet, skipped');
  }

  const files = [dump, uploads].filter((f) => fs.existsSync(f));
  if (env.BACKUP_PASSPHRASE) {
    for (const file of files) {
      await encryptFile(file, `${file}.enc`, env.BACKUP_PASSPHRASE);
      fs.rmSync(file);
    }
    console.log('  ✓ encrypted');
  }

  const finalFiles = fs.readdirSync(folder).filter((f) => f !== 'manifest.json');
  const manifest: Manifest = {
    createdAt: new Date().toISOString(),
    database: target.database,
    encrypted: Boolean(env.BACKUP_PASSPHRASE),
    files: await Promise.all(finalFiles.map(async (name) => ({ name, size: fs.statSync(path.join(folder, name)).size, sha256: await sha256(path.join(folder, name)) }))),
  };
  fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // keep the newest N (only folders that this script created)
  const old = fs.readdirSync(root).filter((n) => BACKUP_NAME.test(n)).sort().reverse().slice(env.BACKUP_KEEP);
  for (const name of old) fs.rmSync(path.join(root, name), { recursive: true, force: true });

  const mb = (manifest.files.reduce((sum, f) => sum + f.size, 0) / 1048576).toFixed(1);
  console.log(`✓ Backup complete: ${folder} (${mb} MB${old.length ? `, removed ${old.length} old` : ''})`);
}

main().catch((error) => {
  console.error(`\n✗ Backup failed: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
  process.exitCode = 1;
});
