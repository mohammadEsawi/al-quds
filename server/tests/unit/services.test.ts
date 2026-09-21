import './setup.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { scanBuffer } from '../../src/lib/antivirus.ts';
import { decryptFile, encryptFile, parseDatabaseUrl, sha256 } from '../../scripts/lib/backup-utils.ts';
import { fakeClamd } from '../lib/fakes.mjs';

const clam = await fakeClamd(3399);
after(() => clam.close());
const target = { host: '127.0.0.1', port: 3399 };

describe('antivirus client (ClamAV INSTREAM protocol)', () => {
  it('reports a clean file', async () => {
    assert.deepEqual(await scanBuffer(Buffer.from('hello world'), target), { status: 'clean' });
  });

  it('reports the signature of an infected file', async () => {
    const result = await scanBuffer(Buffer.from('xx EICAR-STANDARD-ANTIVIRUS-TEST-FILE xx'), target);
    assert.deepEqual(result, { status: 'infected', signature: 'Eicar-Test-Signature' });
  });

  it('streams a large file in chunks without losing a byte', async () => {
    const before = clam.stats.streams;
    const big = Buffer.alloc(1_000_003, 7);
    assert.equal((await scanBuffer(big, target)).status, 'clean');
    assert.equal(clam.stats.lastSize, big.length);
    assert.equal(clam.stats.streams, before + 1);
  });

  it('handles an empty file', async () => {
    assert.equal((await scanBuffer(Buffer.alloc(0), target)).status, 'clean');
  });

  it('reports an error (not a crash) when the scanner is down', async () => {
    const result = await scanBuffer(Buffer.from('x'), { host: '127.0.0.1', port: 1 });
    assert.equal(result.status, 'error');
  });

  it('reports an error when the server answers with something unexpected', async () => {
    const odd = net.createServer((socket) => socket.on('data', () => socket.end('garbage reply\0')));
    await new Promise<void>((resolve) => odd.listen(3398, '127.0.0.1', () => resolve()));
    const result = await scanBuffer(Buffer.from('x'), { host: '127.0.0.1', port: 3398 });
    odd.close();
    assert.equal(result.status, 'error');
  });
});

describe('backup encryption', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-unit-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plain = path.join(dir, 'data.bin');
  const payload = Buffer.concat([Buffer.from('LAMICO backup test '), Buffer.alloc(300_000, 42)]);
  fs.writeFileSync(plain, payload);

  it('encrypts, then decrypts to exactly the same bytes', async () => {
    await encryptFile(plain, `${plain}.enc`, 'correct horse battery staple');
    assert.equal(fs.readFileSync(`${plain}.enc`).includes('LAMICO backup test'), false);
    await decryptFile(`${plain}.enc`, path.join(dir, 'out.bin'), 'correct horse battery staple');
    assert.ok(fs.readFileSync(path.join(dir, 'out.bin')).equals(payload));
  });

  it('refuses the wrong passphrase', async () => {
    await assert.rejects(decryptFile(`${plain}.enc`, path.join(dir, 'wrong.bin'), 'wrong'));
  });

  it('refuses a file that was changed after it was written', async () => {
    const tampered = path.join(dir, 'tampered.enc');
    const bytes = fs.readFileSync(`${plain}.enc`);
    bytes[bytes.length - 40] ^= 0xff;
    fs.writeFileSync(tampered, bytes);
    await assert.rejects(decryptFile(tampered, path.join(dir, 'tampered.bin'), 'correct horse battery staple'));
  });

  it('refuses a file that is not a Lamico backup', async () => {
    await assert.rejects(decryptFile(plain, path.join(dir, 'x.bin'), 'x'), /Not an encrypted Lamico backup/);
  });

  it('checksums files', async () => {
    assert.match(await sha256(plain), /^[0-9a-f]{64}$/);
  });
});

describe('database URL parsing for pg_dump', () => {
  it('splits the parts and decodes the password', () => {
    assert.deepEqual(parseDatabaseUrl('postgresql://lamico_app:p%40ss%3Aword@db.example.com:5433/lamico?schema=public'), {
      host: 'db.example.com',
      port: '5433',
      user: 'lamico_app',
      password: 'p@ss:word',
      database: 'lamico',
    });
    assert.equal(parseDatabaseUrl('postgresql://u:p@localhost/db').port, '5432');
  });
});
