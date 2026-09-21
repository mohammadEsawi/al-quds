// Tests for the fixes made after the audit. Run right after reset-test.sh (fresh DB, fresh rate limits).
const ORIGIN = process.env.TEST_API_URL ?? 'http://localhost:4001';
const API = `${ORIGIN}/api`;
const OWN = 'http://localhost:5173';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : '  → ' + extra}`); };
const call = async (path, { method = 'GET', body, cookie, headers = {}, form, base = API } = {}) => {
  const h = { origin: OWN, ...headers };
  if (cookie) h.cookie = cookie;
  let b;
  if (form) b = form; else if (body !== undefined) { h['content-type'] = 'application/json'; b = JSON.stringify(body); }
  const r = await fetch(base + path, { method, headers: h, body: b });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, json: j, text: t, headers: r.headers };
};
const ck = (r) => (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).find((c) => c.startsWith('lamico_token='));
const login = (email, password) => call('/auth/login', { method: 'POST', body: { email, password } });

const sa = ck(await login('admin@lamico.test', 'TestPassword-12345'));
ok('admin login', !!sa);
const mk = (email, role) => call('/admin/users', { method: 'POST', cookie: sa, body: { email, name: 'T ' + role, password: 'Correct-Horse-Battery-77', role } });
await mk('editor3@lamico.test', 'EDITOR'); await mk('admin3@lamico.test', 'ADMIN');
const ed = ck(await login('editor3@lamico.test', 'Correct-Horse-Battery-77'));
const ad = ck(await login('admin3@lamico.test', 'Correct-Horse-Battery-77'));

// ── password policy
for (const pw of ['password1234', 'Password123456', 'qwertyuiop1234', 'abcdefghijkl', 'aaaaaaaaaaaa', 'lamico123456!', 'P@ssw0rd12345']) {
  const r = await call('/admin/users', { method: 'POST', cookie: sa, body: { email: `weak${Math.random().toString(36).slice(2, 8)}@lamico.test`, name: 'Weak', password: pw, role: 'EDITOR' } });
  ok(`weak password refused: ${pw}`, r.status === 400, String(r.status));
}
ok('strong password accepted', (await mk('strong@lamico.test', 'EDITOR')).status === 201);

// ── NUL bytes
ok('NUL in JSON field → 400', (await call('/contact', { method: 'POST', body: { name: 'A\u0000B', email: 'n1@example.com', message: 'nul in the name field ok' } })).status === 400);
ok('NUL in URL param → 400', (await call('/products/a%00b')).status === 400);
ok('NUL in query → 400', (await call('/admin/messages?q=a%00b', { cookie: ad })).status === 400);
const f1 = new FormData(); f1.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')], { type: 'image/png' }), 'a\u0000.png');
const nul = await call('/admin/media', { method: 'POST', cookie: ed, form: f1 });
ok('NUL / odd file name is never a 500', nul.status < 500, String(nul.status));
const badPart = await fetch(API + '/admin/media', { method: 'POST', headers: { origin: OWN, cookie: ed, 'content-type': 'multipart/form-data; boundary=xx' }, body: '--xx\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nBADHEADER\r\n\r\n--xx--' });
ok('malformed multipart → 400 (not 500)', badPart.status === 400, String(badPart.status));

// ── https-only URLs
const prod = (image) => call('/admin/products', { method: 'POST', cookie: ed, body: { sector: 'water', name: { ar: 'س', en: 's' }, shortDescription: { ar: 'س', en: 's' }, description: { ar: 'س', en: 's' }, image } });
ok('http:// image URL refused', (await prod('http://example.com/a.png')).status === 400);
ok('https:// image URL accepted', (await prod('https://example.com/a.png')).status === 201);
ok('/uploads path accepted', (await prod('/uploads/media/x.png')).status === 201);

// ── file type strictness
const apply = (email, cv) => { const f = new FormData(); for (const [k, v] of Object.entries({ fullName: 'Tester', phone: '0591234567', email, city: 'Nablus', position: 'QA', education: 'BSc', experience: 'Five years of testing' })) f.append(k, v); f.append('cv', new Blob([cv.buf], { type: cv.type }), cv.name); return call('/jobs/general/apply', { method: 'POST', form: f }); };
const zipHead = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0]);
ok('fake docx (only "word/") refused', (await apply('c1@example.com', { buf: Buffer.concat([zipHead, Buffer.from('word/foo')]), name: 'cv.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).status === 400);
ok('docx with manifest + word/document.xml accepted', (await apply('c2@example.com', { buf: Buffer.concat([zipHead, Buffer.from('[Content_Types].xml'), Buffer.alloc(30), Buffer.from('word/document.xml')]), name: 'cv.docx', type: 'application/msword' })).status === 201);
const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
ok('OLE file that is not Word (xls/msi/ppt) refused', (await apply('c3@example.com', { buf: Buffer.concat([ole, Buffer.from('Workbook', 'utf16le')]), name: 'cv.doc', type: 'application/msword' })).status === 400);
ok('OLE file with WordDocument stream accepted', (await apply('c4@example.com', { buf: Buffer.concat([ole, Buffer.from('WordDocument', 'utf16le')]), name: 'cv.doc', type: 'application/msword' })).status === 201);

// ── EXIF stripping
const seg = (marker, payload) => { const len = Buffer.alloc(2); len.writeUInt16BE(payload.length + 2); return Buffer.concat([Buffer.from([0xff, marker]), len, payload]); };
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')), seg(0xe1, Buffer.from('Exif\0\0GPS-SECRET-31.9N-35.2E')), seg(0xfe, Buffer.from('comment-secret')), seg(0xdb, Buffer.alloc(65, 1)), Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9])]);
const fj = new FormData(); fj.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'photo.jpg');
const up = await call('/admin/media', { method: 'POST', cookie: ed, form: fj });
ok('jpeg upload accepted', up.status === 201, JSON.stringify(up.json).slice(0, 100));
if (up.json?.url) {
  const bytes = Buffer.from(await (await fetch(ORIGIN + up.json.url)).arrayBuffer());
  ok('EXIF/GPS and comment segments removed from the stored JPEG', !bytes.includes('GPS-SECRET') && !bytes.includes('comment-secret') && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9 && bytes.includes('JFIF'), `${bytes.length} bytes`);
}

// ── quotas
const q = [];
for (let i = 0; i < 4; i++) q.push((await apply('same-person@example.com', { buf: Buffer.from('%PDF-1.4\n%%EOF'), name: 'cv.pdf', type: 'application/pdf' })).status);
ok('4th application from one email in a day → 429', q.join() === '201,201,201,429', q.join());
const c = [];
for (let i = 0; i < 6; i++) c.push((await call('/contact', { method: 'POST', body: { name: 'Same', email: 'same-contact@example.com', message: 'message number ' + i + ' to the company' } })).status);
ok('6th contact message from one email in a day → 429', c.join() === '201,201,201,201,201,429', c.join());

// ── logout revocation + audit
const s1 = ck(await login('admin@lamico.test', 'TestPassword-12345'));
ok('session valid before logout', (await call('/auth/me', { cookie: s1 })).status === 200);
await call('/auth/logout', { method: 'POST', cookie: s1 });
ok('token is dead after logout (revoked server-side)', (await call('/auth/me', { cookie: s1 })).status === 401);
ok('a different session of the same user is unaffected', (await call('/auth/me', { cookie: sa })).status === 200);

await login('nobody@lamico.test', 'wrong-password-x');
const appList = await call('/admin/applications', { cookie: ad });
const anId = appList.json?.items?.[0]?.id;
await call(`/admin/applications/${anId}`, { cookie: ad });
await call(`/admin/applications/${anId}/cv`, { cookie: ad });
await call('/admin/settings/x.test', { method: 'PUT', cookie: ad, body: { value: { a: 1 } } });
await new Promise((r) => setTimeout(r, 600));
const audit = await call('/admin/audit?pageSize=100', { cookie: sa });
const actions = (audit.json?.items ?? []).map((e) => `${e.action}|${e.actorEmail ?? ''}`);
ok('audit: ADMIN and EDITOR cannot read the log', (await call('/admin/audit', { cookie: ad })).status === 403 && (await call('/admin/audit', { cookie: ed })).status === 403);
ok('audit: successful login recorded', actions.some((a) => a.startsWith('auth login|admin@lamico.test')), actions.slice(0, 5).join(' ; '));
ok('audit: failed login recorded with the attempted email', actions.some((a) => a === 'auth login failed|nobody@lamico.test'));
ok('audit: logout recorded', actions.some((a) => a.startsWith('auth logout')));
ok('audit: user creation recorded', actions.some((a) => a.startsWith('post users|admin@lamico.test')));
ok('audit: viewing an application recorded', actions.some((a) => a.startsWith('view applications|admin3@lamico.test')));
ok('audit: CV download recorded', actions.some((a) => a.startsWith('view applications/cv|admin3@lamico.test')));
ok('audit: setting change recorded', actions.some((a) => a.startsWith('put settings|admin3@lamico.test')));
ok('audit: no request bodies / passwords stored', !JSON.stringify(audit.json).match(/Correct-Horse|TestPassword|secret|"a":1/i));
ok('audit: search works', ((await call('/admin/audit?q=admin3', { cookie: sa })).json?.items ?? []).every((e) => (e.actorEmail ?? '').includes('admin3')));
ok('audit: pageSize capped', (await call('/admin/audit?pageSize=1000', { cookie: sa })).status === 400);

// ── robots / sitemap
const robots = await (await fetch(ORIGIN + '/robots.txt')).text();
ok('robots.txt blocks /admin and /api, lists the sitemap', /Disallow: \/admin/.test(robots) && /Disallow: \/api\//.test(robots) && /Sitemap: https?:\/\//.test(robots));
await call('/admin/products', { method: 'POST', cookie: ed, body: { sector: 'water', slug: 'sitemap-draft-x', name: { ar: 'س', en: 's' }, shortDescription: { ar: 'س', en: 's' }, description: { ar: 'س', en: 's' }, status: 'draft' } });
const sm = await fetch(ORIGIN + '/sitemap.xml');
const smText = await sm.text();
ok('sitemap.xml is XML with both languages + hreflang', sm.headers.get('content-type')?.includes('xml') && smText.includes('/ar/products/preform-200ml') && smText.includes('/en/products/preform-200ml') && smText.includes('hreflang="ar"'));
ok('sitemap excludes drafts and the dashboard', !smText.includes('sitemap-draft-x') && !smText.includes('/admin'));

// ── headers
const h = (await fetch(API + '/company')).headers;
ok('Permissions-Policy sent by the API', !!h.get('permissions-policy'));

console.log(`\n${fail ? 'FAILED' : 'ALL PASSED'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
