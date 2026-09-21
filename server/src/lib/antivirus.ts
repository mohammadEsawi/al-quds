import net from 'node:net';
import { env } from '../config/env.js';

export type ScanResult = { status: 'clean' } | { status: 'infected'; signature: string } | { status: 'error'; message: string };

export const antivirusEnabled = () => Boolean(env.CLAMAV_HOST);

const CHUNK = 64 * 1024;
const TIMEOUT_MS = 20_000;

/**
 * Scans a file with a ClamAV daemon over its INSTREAM protocol: the bytes are streamed as
 * length-prefixed chunks, a zero-length chunk ends the stream, and clamd answers "stream: OK" or
 * "stream: <signature> FOUND". Nothing is written to disk.
 */
export function scanBuffer(buf: Buffer, target = { host: env.CLAMAV_HOST ?? '', port: env.CLAMAV_PORT }): Promise<ScanResult> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: target.host, port: target.port });
    let reply = '';
    let settled = false;

    const finish = (result: ScanResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS, () => finish({ status: 'error', message: 'The scanner did not answer in time' }));
    socket.on('error', (error) => finish({ status: 'error', message: error.message }));
    socket.on('close', () => finish({ status: 'error', message: reply ? `Unexpected scanner reply: ${reply.slice(0, 120)}` : 'The scanner closed the connection' }));

    socket.on('data', (data) => {
      reply += data.toString('utf8');
      if (!reply.includes('\0') && !reply.includes('\n')) return;
      const line = reply.split(/[\0\n]/)[0]!.trim();
      if (/\bOK$/.test(line)) return finish({ status: 'clean' });
      const found = /^stream:\s*(.+?)\s+FOUND$/.exec(line);
      if (found) return finish({ status: 'infected', signature: found[1]! });
      finish({ status: 'error', message: line.slice(0, 160) });
    });

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buf.length; offset += CHUNK) {
        const chunk = buf.subarray(offset, offset + CHUNK);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4)); // end of stream
    });
  });
}
