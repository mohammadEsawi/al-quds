// Stand-ins for the outside services, so email, WhatsApp, CAPTCHA and antivirus code can be tested for real
// (real sockets, real protocols) without any account or credentials.
import http from 'node:http';
import net from 'node:net';

const listen = (server, port) => new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', () => resolve(server)));
export const close = (server) => new Promise((resolve) => server.close(() => resolve()));

/** A minimal SMTP server: accepts everything and records the messages (headers + body). */
export async function fakeSmtp(port) {
  const messages = [];
  const server = net.createServer((socket) => {
    let mode = 'command';
    let buffer = '';
    const meta = { from: '', to: [] };
    const send = (line) => socket.write(`${line}\r\n`);
    send('220 fake.smtp ESMTP');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      for (;;) {
        if (mode === 'data') {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          messages.push({ ...meta, raw: buffer.slice(0, end) });
          buffer = buffer.slice(end + 5);
          send('250 OK queued');
          mode = 'command';
          continue;
        }
        const eol = buffer.indexOf('\r\n');
        if (eol < 0) return;
        const line = buffer.slice(0, eol);
        buffer = buffer.slice(eol + 2);
        const cmd = line.toUpperCase();
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) socket.write('250-fake.smtp\r\n250 8BITMIME\r\n');
        else if (cmd.startsWith('MAIL FROM')) { meta.from = line.slice(10); meta.to = []; send('250 OK'); }
        else if (cmd.startsWith('RCPT TO')) { meta.to.push(line.slice(8).replace(/[<>]/g, '')); send('250 OK'); }
        else if (cmd === 'DATA') { mode = 'data'; send('354 go ahead'); }
        else if (cmd === 'QUIT') { send('221 bye'); socket.end(); return; }
        else send('250 OK');
      }
    });
    socket.on('error', () => {});
  });
  await listen(server, port);
  return { messages, close: () => close(server) };
}

const CRLF2 = String.fromCharCode(13, 10, 13, 10);
const FOLD = new RegExp(String.fromCharCode(13, 10) + '[ \\t]+', 'g');

function decodeBody(headers, body) {
  const encoding = /content-transfer-encoding:\s*(\S+)/i.exec(headers)?.[1]?.toLowerCase();
  if (encoding === 'base64') return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  if (encoding === 'quoted-printable') {
    const soft = body.replace(new RegExp('=\\r?\\n', 'g'), '');
    const bytes = [];
    for (let i = 0; i < soft.length; i += 1) {
      if (soft[i] === '=' && /^[0-9A-F]{2}$/i.test(soft.slice(i + 1, i + 3))) {
        bytes.push(parseInt(soft.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(...Buffer.from(soft[i], 'utf8'));
    }
    return Buffer.from(bytes).toString('utf8');
  }
  return body;
}

/** Decodes RFC 2047 encoded words (=?UTF-8?B?...?=) in a header value. */
function decodeWords(value) {
  const joined = value.replace(/\?=\s+=\?UTF-8\?[BQ]\?/gi, '');
  return joined.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (_, kind, text) =>
    kind.toUpperCase() === 'B' ? Buffer.from(text, 'base64').toString('utf8') : decodeBody('content-transfer-encoding: quoted-printable', text.replace(/_/g, ' ')),
  );
}

/** Reads a raw email: unfolded `head`, `header(name)` with encoded words decoded, and `text` — every MIME part decoded. */
export function readMail(raw) {
  const split = raw.indexOf(CRLF2);
  const head = raw.slice(0, split).replace(FOLD, ' ');
  const rest = raw.slice(split + 4);
  const boundary = /boundary="?([^";\r\n]+)/i.exec(head)?.[1];
  const segments = boundary ? rest.split(`--${boundary}`).slice(1, -1) : [rest];
  const text = segments
    .map((segment) => {
      if (!boundary) return decodeBody(head, segment);
      const at = segment.indexOf(CRLF2);
      return decodeBody(segment.slice(0, at), segment.slice(at + 4));
    })
    .join('\n');
  const header = (name) => decodeWords(new RegExp(`^${name}:\\s*(.*)$`, 'im').exec(head)?.[1] ?? '');
  return { head, header, text };
}

/** Fake Cloudflare Turnstile (token "good-token" passes) and fake WhatsApp Cloud API (records what it is sent). */
export async function fakeWeb(port) {
  const whatsapp = [];
  const turnstile = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (status, json) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(json)); };
      if (req.url === '/turnstile') {
        const p = new URLSearchParams(body);
        turnstile.push(Object.fromEntries(p));
        return send(200, { success: p.get('response') === 'good-token' && p.get('secret') === 'test-secret' });
      }
      if (req.url?.startsWith('/graph/')) {
        whatsapp.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') });
        return send(req.headers.authorization === 'Bearer wa-token' ? 200 : 401, { messages: [{ id: 'wamid.test' }] });
      }
      send(404, {});
    });
  });
  await listen(server, port);
  return { whatsapp, turnstile, close: () => close(server) };
}

/**
 * A fake clamd: speaks the real INSTREAM protocol. A stream that contains the EICAR test signature is
 * reported as "Eicar-Test-Signature FOUND", anything else as OK. `stats.streams` counts how many were scanned.
 */
export async function fakeClamd(port) {
  const stats = { streams: 0, lastSize: 0 };
  const EICAR = 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE';
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    let started = false;
    const parts = [];
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!started) {
        const marker = Buffer.from('zINSTREAM\0');
        if (buf.length < marker.length) return;
        if (!buf.subarray(0, marker.length).equals(marker)) { socket.end('UNKNOWN COMMAND\0'); return; }
        buf = buf.subarray(marker.length);
        started = true;
      }
      for (;;) {
        if (buf.length < 4) return;
        const size = buf.readUInt32BE(0);
        if (size === 0) {
          const stream = Buffer.concat(parts);
          stats.streams += 1;
          stats.lastSize = stream.length;
          socket.end(stream.includes(EICAR) ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
          return;
        }
        if (buf.length < 4 + size) return;
        parts.push(buf.subarray(4, 4 + size));
        buf = buf.subarray(4 + size);
      }
    });
    socket.on('error', () => {});
  });
  await listen(server, port);
  return { stats, close: () => close(server) };
}
