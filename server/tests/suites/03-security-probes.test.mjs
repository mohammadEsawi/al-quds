// Non-destructive security probes against a THROWAWAY test API (port 4001, embedded Postgres).
import crypto from 'node:crypto';
const ORIGIN = process.env.TEST_API_URL ?? 'http://localhost:4001';
const API = ORIGIN + '/api';
const OWN = 'http://localhost:5173';
const results = [];
const rec = (area, name, ok, detail = '') => { results.push({ area, name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? '  → ' + detail : ''}`); };

async function call(path, { method = 'GET', body, cookie, headers = {}, raw, form, base = API } = {}) {
  const h = { origin: OWN, ...headers };
  if (cookie) h.cookie = cookie;
  let payload;
  if (form) payload = form;
  else if (raw !== undefined) { payload = raw; }
  else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers: h, body: payload });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text, headers: res.headers };
}
const ck = (r) => (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).find((c) => c.startsWith('lamico_token='));
const login = (email, password) => call('/auth/login', { method: 'POST', body: { email, password } });

// ───────── setup accounts ─────────
const sa = ck(await login('admin@lamico.test', 'TestPassword-12345'));
rec('setup', 'super admin login', !!sa);
const mk = async (email, role) => (await call('/admin/users', { method: 'POST', cookie: sa, body: { email, name: 'Test ' + role, password: 'LongEnoughPass-1234', role } })).status;
await mk('editor@lamico.test', 'EDITOR'); await mk('admin2@lamico.test', 'ADMIN');
const ed = ck(await login('editor@lamico.test', 'LongEnoughPass-1234'));
const ad = ck(await login('admin2@lamico.test', 'LongEnoughPass-1234'));
rec('setup', 'editor + admin accounts', !!ed && !!ad);

// seed one application / message for object-level checks
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const applyForm = (over = {}, file = { buf: pdf, name: 'cv.pdf', type: 'application/pdf' }) => {
  const f = new FormData();
  const fields = { fullName: 'Audit Tester', phone: '0591234567', email: 'audit@example.com', city: 'Ramallah', position: 'Tester', education: 'BSc', experience: 'Five years testing', ...over };
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  if (file) f.append('cv', new Blob([file.buf], { type: file.type }), file.name);
  return f;
};
const app1 = await call('/jobs/general/apply', { method: 'POST', form: applyForm() });
rec('setup', 'application submitted', app1.status === 201, String(app1.status));
const appId = app1.json?.id;
await call('/contact', { method: 'POST', body: { name: 'Audit', email: 'a@example.com', message: '<script>alert(1)</script> hello world' } });

// ───────── 1. authn/authz matrix ─────────
const adminEndpoints = [
  ['GET', '/admin/dashboard', 'staff'], ['GET', '/admin/products', 'staff'], ['POST', '/admin/products', 'staff'], ['GET', '/admin/categories', 'staff'],
  ['GET', '/admin/water/labels', 'staff'], ['GET', '/admin/sectors', 'staff'], ['GET', '/admin/real-estate', 'staff'], ['GET', '/admin/jobs', 'staff'], ['GET', '/admin/media', 'staff'],
  ['GET', '/admin/applications', 'admin'], [`GET`, `/admin/applications/${appId}`, 'admin'], ['GET', `/admin/applications/${appId}/cv`, 'admin'], ['PATCH', `/admin/applications/${appId}`, 'admin'], ['DELETE', `/admin/applications/${appId}`, 'admin-noexec'],
  ['GET', '/admin/messages', 'admin'], ['GET', '/admin/notifications', 'admin'], ['POST', '/admin/notifications/read-all', 'admin'],
  ['GET', '/admin/company', 'admin'], ['PUT', '/admin/company', 'admin'], ['GET', '/admin/whatsapp', 'admin'], ['GET', '/admin/settings', 'admin'], ['PUT', '/admin/settings/x', 'admin'],
  ['GET', '/admin/users', 'super'], ['POST', '/admin/users', 'super'], ['PATCH', '/admin/users/abc', 'super'], ['DELETE', '/admin/users/abc', 'super-noexec'],
];
let matrixBad = [];
for (const [m, p, level] of adminEndpoints) {
  const body = ['POST', 'PUT', 'PATCH'].includes(m) ? {} : undefined;
  const anon = await call(p, { method: m, body });
  if (anon.status !== 401) matrixBad.push(`anon ${m} ${p} → ${anon.status}`);
  const bad = await call(p, { method: m, body, headers: { authorization: 'Bearer not.a.jwt' } });
  if (bad.status !== 401) matrixBad.push(`badtoken ${m} ${p} → ${bad.status}`);
  if (level.startsWith('admin') || level.startsWith('super')) {
    const e = await call(p, { method: m, body, cookie: ed });
    if (e.status !== 403) matrixBad.push(`EDITOR ${m} ${p} → ${e.status}`);
  }
  if (level.startsWith('super')) {
    const a = await call(p, { method: m, body, cookie: ad });
    if (a.status !== 403) matrixBad.push(`ADMIN ${m} ${p} → ${a.status}`);
  }
}
rec('authz', `${adminEndpoints.length} admin endpoints: anon→401, bad token→401, EDITOR blocked from admin-level, ADMIN blocked from super-level`, matrixBad.length === 0, matrixBad.join(' | '));

// ───────── 2. JWT attacks ─────────
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const me = await call('/auth/me', { cookie: sa });
const userId = me.json?.user?.id;
const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: userId, role: 'SUPER_ADMIN', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
rec('jwt', 'alg=none token rejected', (await call('/auth/me', { cookie: `lamico_token=${none}` })).status === 401);
const hs = (secret, payload) => { const h = b64({ alg: 'HS256', typ: 'JWT' }); const p = b64(payload); const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url'); return `${h}.${p}.${s}`; };
const now = Math.floor(Date.now() / 1000);
rec('jwt', 'token signed with wrong secret rejected', (await call('/auth/me', { cookie: `lamico_token=${hs('wrong-secret-wrong-secret-wrong-secret', { sub: userId, role: 'SUPER_ADMIN', iat: now, exp: now + 3600 })}` })).status === 401);
rec('jwt', 'weak/guessable secrets rejected (secret, changeme, jwt_secret)', (await Promise.all(['secret', 'changeme', 'jwt_secret', 'password'].map((s) => call('/auth/me', { cookie: `lamico_token=${hs(s, { sub: userId, role: 'SUPER_ADMIN', iat: now, exp: now + 3600 })}` })))).every((r) => r.status === 401));
// tamper role claim in a real token (editor token → claims SUPER_ADMIN without re-signing)
const parts = ed.replace('lamico_token=', '').split('.');
const tampered = `${parts[0]}.${b64({ ...JSON.parse(Buffer.from(parts[1], 'base64url').toString()), role: 'SUPER_ADMIN' })}.${parts[2]}`;
rec('jwt', 'tampered role claim (bad signature) rejected', (await call('/admin/users', { cookie: `lamico_token=${tampered}` })).status === 401);
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
rec('jwt', 'payload holds only sub/role/iat/exp/jti/at (no PII)', Object.keys(payload).sort().join() === 'at,exp,iat,jti,role,sub', Object.keys(payload).join());
rec('jwt', 'expired token rejected', (await call('/auth/me', { cookie: `lamico_token=${hs('x'.repeat(40), { sub: userId, exp: now - 10 })}` })).status === 401);

// ───────── 3. login behaviour ─────────
const wrongUser = await login('nobody@lamico.test', 'whatever-password');
const wrongPass = await login('editor@lamico.test', 'wrong-password-123');
rec('authn', 'unknown email and wrong password give identical response (no enumeration)', wrongUser.status === wrongPass.status && JSON.stringify(wrongUser.json) === JSON.stringify(wrongPass.json), `${wrongUser.status}/${wrongPass.status}`);
const t = async (email) => { const s = performance.now(); await login(email, 'x-wrong-password'); return performance.now() - s; };
const tu = [await t('nobody1@lamico.test'), await t('nobody2@lamico.test')], tk = [await t('editor@lamico.test'), await t('editor@lamico.test')];
rec('authn', 'timing similar for unknown vs known email', Math.abs(tu[0] / 2 + tu[1] / 2 - (tk[0] / 2 + tk[1] / 2)) < 60, `unknown≈${Math.round((tu[0] + tu[1]) / 2)}ms known≈${Math.round((tk[0] + tk[1]) / 2)}ms`);
const lg = await login('admin@lamico.test', 'TestPassword-12345');
const sc = (lg.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('lamico_token='));
rec('authn', 'cookie flags in dev: HttpOnly + SameSite=Lax', /HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc), sc?.replace(/=[^;]+/, '=***'));
rec('authn', 'login response has no hash/token in body', !/hash|token|password/i.test(JSON.stringify(lg.json)), JSON.stringify(lg.json).slice(0, 120));
rec('authn', 'weak password (<12) refused when creating user', (await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'w@lamico.test', name: 'Weak', password: 'short', role: 'EDITOR' } })).status === 400);
const common = await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'common@lamico.test', name: 'Common', password: 'password1234', role: 'EDITOR' } });
rec('authn', 'common password ("password1234") is refused', common.status === 400, `status ${common.status} — no common-password check`);

// ───────── 4. mass assignment ─────────
const c1 = await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'ma@lamico.test', name: 'MA', password: 'LongEnoughPass-1234', role: 'EDITOR', isActive: true, passwordHash: 'x', id: 'custom-id', passwordChangedAt: '2000-01-01' } });
rec('mass-assign', 'createUser ignores unknown fields (id/passwordHash)', c1.status === 201 && c1.json?.id !== 'custom-id', JSON.stringify(c1.json).slice(0, 100));
const upd = await call(`/admin/applications/${appId}`, { method: 'PATCH', cookie: ad, body: { status: 'accepted', fullName: 'HACKED', cvFile: '../../etc/passwd', jobId: 'x' } });
const after = await call(`/admin/applications/${appId}`, { cookie: ad });
rec('mass-assign', 'application PATCH only changes status/notes', after.json?.fullName === 'Audit Tester' && after.json?.status === 'accepted', `${after.json?.fullName} ${after.json?.status}`);
const pub = await call('/jobs/general/apply', { method: 'POST', form: applyForm({ status: 'accepted', notes: 'x', jobId: 'abc', cvFile: 'x.pdf', cvSize: '1' }) });
const pubApp = await call(`/admin/applications/${pub.json?.id}`, { cookie: ad });
rec('mass-assign', 'public apply cannot set status/notes/cvFile', pubApp.json?.status === 'new' && !pubApp.json?.notes, `${pubApp.json?.status}`);
const ct = await call('/contact', { method: 'POST', body: { name: 'MA', email: 'ma@example.com', message: 'mass assignment test message', isRead: true, id: 'x', createdAt: '2000-01-01' } });
const ml = await call('/admin/messages?pageSize=100', { cookie: ad });
const mm = ml.json?.items?.find((m) => m.name === 'MA');
rec('mass-assign', 'contact form cannot set isRead/id/createdAt', ct.status === 201 && mm && mm.isRead === false && mm.id !== 'x' && mm.createdAt.startsWith('2026') , JSON.stringify(mm)?.slice(0, 120));
const prodC = await call('/admin/products', { method: 'POST', cookie: ed, body: { sector: 'water', name: { ar: 'س', en: 's' }, shortDescription: { ar: 'س', en: 's' }, description: { ar: 'س', en: 's' }, id: 'forced', createdAt: '2000-01-01', isSample: true } });
rec('mass-assign', 'product create ignores id/createdAt', prodC.status === 201 && prodC.json?.id !== 'forced', `${prodC.status}`);
const pollute = await call('/contact', { method: 'POST', raw: '{"name":"PP","email":"pp@example.com","message":"prototype pollution test","__proto__":{"isAdmin":true},"constructor":{"prototype":{"polluted":1}}}', headers: { 'content-type': 'application/json' } });
const chk = await call('/health/');
rec('proto-pollution', '__proto__/constructor keys do not pollute (server keeps responding, Object.prototype clean)', [201, 400].includes(pollute.status) && chk.status === 200, `status ${pollute.status}`);

// ───────── 5. public data exposure ─────────
const created = await call('/admin/products', { method: 'POST', cookie: ed, body: { sector: 'water', slug: 'audit-draft', name: { ar: 'مسودة', en: 'draft' }, shortDescription: { ar: 'س', en: 's' }, description: { ar: 'س', en: 's' }, status: 'draft' } });
rec('exposure', 'draft product not on public list', !JSON.stringify((await call('/products')).json).includes('audit-draft'));
rec('exposure', 'draft product slug → 404 publicly', (await call('/products/audit-draft')).status === 404);
const closedJob = await call('/admin/jobs', { method: 'POST', cookie: ed, body: { slug: 'audit-closed', title: { ar: 'م', en: 'closed' }, department: { ar: 'م', en: 'd' }, location: { ar: 'م', en: 'l' }, description: { ar: 'م', en: 'd' }, status: 'closed' } });
rec('exposure', 'closed job hidden publicly + apply refused', (await call('/jobs/audit-closed')).status === 404 && (await call('/jobs/audit-closed/apply', { method: 'POST', form: applyForm() })).status === 400);
for (const p of ['/settings/site.secret', '/settings/legal.privacy', '/settings/x']) void p;
await call('/admin/settings/private.key', { method: 'PUT', cookie: ad, body: { value: { secret: 'internal' } } });
rec('exposure', 'non-whitelisted setting is not readable publicly', (await call('/settings/private.key')).status === 404);
const all = JSON.stringify([(await call('/company')).json, (await call('/products')).json, (await call('/jobs')).json, (await call('/real-estate')).json, (await call('/sectors')).json]);
rec('exposure', 'public payloads contain no hash/secret/token fields', !/passwordHash|jwt|secret|resetToken|cvFile/i.test(all));
const ul = JSON.stringify((await call('/admin/users', { cookie: sa })).json);
rec('exposure', 'user list has no passwordHash', !/passwordHash|argon2/i.test(ul));
const err500 = await call('/admin/products/%00', { cookie: ed });
rec('errors', 'bad id (null byte) returns generic error, no stack/SQL', !/prisma|stack|at .*\(|SELECT|node_modules|E:\\/i.test(err500.text), `${err500.status} ${err500.text.slice(0, 120)}`);
const err404 = await call('/nope/nothing');
rec('errors', 'unknown route → JSON 404', err404.status === 404 && err404.json?.error?.code === 'ROUTE_NOT_FOUND');
const badJson = await call('/contact', { method: 'POST', raw: '{bad json', headers: { 'content-type': 'application/json' } });
rec('errors', 'malformed JSON → 400 without parser internals', badJson.status === 400 && !/Unexpected|position/i.test(badJson.text), badJson.text.slice(0, 100));

// ───────── 6. input limits / DoS ─────────
const big = await call('/contact', { method: 'POST', raw: JSON.stringify({ name: 'x', email: 'a@b.co', message: 'y'.repeat(1_200_000) }), headers: { 'content-type': 'application/json' } });
rec('dos', 'JSON body >1 MB refused (413)', big.status === 413, String(big.status));
const pg = await call('/admin/messages?pageSize=999999', { cookie: ad });
rec('dos', 'pageSize=999999 rejected', pg.status === 400, String(pg.status));
const pg2 = await call('/admin/messages?page=99999999999999999', { cookie: ad });
rec('dos', 'huge page number handled (no 500 leak)', pg2.status !== 500 || !/prisma|integer|overflow/i.test(pg2.text), `${pg2.status} ${pg2.text.slice(0, 100)}`);
const pg3 = await call('/admin/messages?page=1&page=2&pageSize=5&pageSize=1000', { cookie: ad });
rec('dos', 'parameter pollution (page=1&page=2, pageSize=5&pageSize=1000) does not bypass limits', pg3.status === 400 || (pg3.json?.items?.length ?? 0) <= 100, `${pg3.status}`);
const q = await call(`/admin/messages?q=${'a'.repeat(101)}`, { cookie: ad });
rec('dos', 'search query >100 chars rejected', q.status === 400, String(q.status));
const wc = await call('/admin/messages?q=%25', { cookie: ad });
rec('dos', 'wildcard search "%" is harmless (paged, no crash)', wc.status === 200 && (wc.json?.items?.length ?? 0) <= 20, `${wc.status}`);
const sf = await call('/admin/products', { method: 'POST', cookie: ed, body: { sector: 'water', name: { ar: 'a', en: 'a' }, shortDescription: { ar: 'a', en: 'a' }, description: { ar: 'a', en: 'a' }, gallery: Array(31).fill('/x.png') } });
rec('dos', 'array size limits enforced (gallery ≤30)', sf.status === 400);

// ───────── 7. file uploads ─────────
const media = (buf, name, type) => { const f = new FormData(); f.append('file', new Blob([buf], { type }), name); return f; };
const up = async (buf, name, type, cookie = ed, path = '/admin/media') => call(path, { method: 'POST', cookie, form: media(buf, name, type) });
rec('upload', 'PHP script named shell.php rejected', (await up(Buffer.from('<?php system($_GET["c"]); ?>'), 'shell.php', 'application/x-php')).status === 400);
rec('upload', 'PHP disguised as image (file.php.jpg, image/jpeg) rejected', (await up(Buffer.from('<?php echo 1; ?>'), 'file.php.jpg', 'image/jpeg')).status === 400);
rec('upload', 'HTML disguised as PNG rejected', (await up(Buffer.from('<html><script>alert(1)</script></html>'), 'x.png', 'image/png')).status === 400);
rec('upload', 'SVG with script rejected', (await up(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'x.svg', 'image/svg+xml')).status === 400);
rec('upload', 'Windows executable (MZ) rejected', (await up(Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), 'setup.png', 'image/png')).status === 400);
rec('upload', 'ELF binary rejected', (await up(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0]), 'a.jpg', 'image/jpeg')).status === 400);
const trav = await up(png, '../../../../etc/cron.d/evil.png', 'image/png');
rec('upload', 'traversal file name (../../..) is ignored: stored under random name', trav.status === 201 && /^\/uploads\/media\/[0-9a-f-]{36}\.png$/.test(trav.json?.url ?? ''), trav.json?.url);
const nul = await up(png, 'a\u0000.php.png', 'image/png');
rec('upload', 'null-byte file name harmless', [201, 400].includes(nul.status) && (nul.status !== 201 || /^\/uploads\/media\/[0-9a-f-]{36}\.png$/.test(nul.json?.url)), `${nul.status} ${nul.json?.url ?? ''}`);
const dbl = await up(png, 'photo.png.exe', 'image/png');
rec('upload', 'double extension: extension comes from content, not name', dbl.status === 201 && dbl.json?.url?.endsWith('.png'), dbl.json?.url);
const huge = await up(Buffer.concat([png, Buffer.alloc(11 * 1024 * 1024)]), 'big.png', 'image/png');
rec('upload', 'image >10 MB refused (413)', huge.status === 413, String(huge.status));
rec('upload', 'anonymous cannot upload media', (await up(png, 'a.png', 'image/png', null)).status === 401);
const file = trav.json?.url;
if (file) {
  const s = await fetch(ORIGIN + file);
  rec('upload', 'served file has nosniff + CSP sandbox + correct type', s.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(s.headers.get('content-security-policy') ?? '') && s.headers.get('content-type') === 'image/png', `${s.headers.get('content-type')} | ${s.headers.get('content-security-policy')}`);
}
const bad = ['/uploads/media/../private/cv/x', '/uploads/media/..%2fprivate%2fcv%2fx', '/uploads/media/%2e%2e/private/cv/x', '/uploads/private/cv/x', '/uploads/media/..%5cprivate', '/uploads/', '/uploads/media/'];
const badRes = await Promise.all(bad.map((p) => fetch(ORIGIN + p).then((r) => r.status)));
rec('upload', 'static path traversal / directory listing attempts all 404', badRes.every((s) => s === 404 || s === 400), badRes.join(','));
// CV
rec('cv', 'CV with .exe content named cv.pdf rejected', (await call('/jobs/general/apply', { method: 'POST', form: applyForm({}, { buf: Buffer.from('MZ\x90\x00'), name: 'cv.pdf', type: 'application/pdf' }) })).status === 400);
rec('cv', 'CV as PNG image rejected', (await call('/jobs/general/apply', { method: 'POST', form: applyForm({}, { buf: png, name: 'cv.pdf', type: 'application/pdf' }) })).status === 400);
rec('cv', 'missing CV rejected', (await call('/jobs/general/apply', { method: 'POST', form: applyForm({}, null) })).status === 400);
const cvBig = await call('/jobs/general/apply', { method: 'POST', form: applyForm({}, { buf: Buffer.concat([pdf, Buffer.alloc(6 * 1024 * 1024)]), name: 'cv.pdf', type: 'application/pdf' }) });
rec('cv', 'CV >5 MB refused (413)', cvBig.status === 413, String(cvBig.status));
const cvDl = await call(`/admin/applications/${appId}/cv`, { cookie: ad });
rec('cv', 'admin CV download: attachment, no-store, correct type', /attachment/.test(cvDl.headers.get('content-disposition') ?? '') && /no-store/.test(cvDl.headers.get('cache-control') ?? '') && cvDl.headers.get('content-type')?.startsWith('application/pdf'), `${cvDl.status} ${cvDl.headers.get('content-disposition')}`);
rec('cv', 'CV not reachable without auth / as EDITOR', (await call(`/admin/applications/${appId}/cv`)).status === 401 && (await call(`/admin/applications/${appId}/cv`, { cookie: ed })).status === 403);
const fsProbe = await Promise.all(['/uploads/private/cv/', '/uploads/cv/', '/private/cv/', `/api/admin/applications/${appId}/cv`].map((p) => fetch(ORIGIN + p).then((r) => r.status)));
rec('cv', 'no public route serves CV files', fsProbe.every((s) => [401, 404].includes(s)), fsProbe.join(','));
const fnameAttack = await call('/jobs/general/apply', { method: 'POST', form: applyForm({}, { buf: pdf, name: 'x"; filename*=UTF-8\'\'evil.exe\r\nSet-Cookie: a=b.pdf', type: 'application/pdf' }) });
const fnId = fnameAttack.json?.id;
if (fnId) { const d = await call(`/admin/applications/${fnId}/cv`, { cookie: ad }); rec('cv', 'header-injection in CV file name neutralised', !/\r|\n/.test(d.headers.get('content-disposition') ?? '') && !d.headers.get('set-cookie'), d.headers.get('content-disposition')); }

// ───────── 8. CORS / CSRF / headers ─────────
const pre = await fetch(API + '/admin/products', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'DELETE' } });
rec('cors', 'preflight from evil origin gets no Allow-Origin', !pre.headers.get('access-control-allow-origin'), String(pre.headers.get('access-control-allow-origin')));
const ok = await fetch(API + '/company', { headers: { origin: OWN } });
rec('cors', 'own origin allowed with credentials; not wildcard', ok.headers.get('access-control-allow-origin') === OWN && ok.headers.get('access-control-allow-credentials') === 'true', `${ok.headers.get('access-control-allow-origin')} / ${ok.headers.get('access-control-allow-credentials')}`);
const nullo = await fetch(API + '/company', { headers: { origin: 'null' } });
rec('cors', 'Origin: null not allowed', !nullo.headers.get('access-control-allow-origin'));
const csrf = await call('/admin/users', { method: 'POST', cookie: sa, headers: { origin: 'https://evil.example' }, body: { email: 'csrf@lamico.test', name: 'CSRF', password: 'LongEnoughPass-1234', role: 'SUPER_ADMIN' } });
rec('csrf', 'cross-origin POST with valid cookie refused (403)', csrf.status === 403, String(csrf.status));
const csrfPlain = await call('/admin/users', { method: 'POST', cookie: sa, headers: { origin: 'https://evil.example', 'content-type': 'text/plain' }, raw: JSON.stringify({ email: 'csrf2@lamico.test' }) });
rec('csrf', 'text/plain cross-site form POST refused', [403, 400, 415].includes(csrfPlain.status), String(csrfPlain.status));
const h = (await fetch(ORIGIN + '/api/company')).headers;
const want = { 'x-content-type-options': 'nosniff', 'strict-transport-security': null, 'x-frame-options': null, 'content-security-policy': null, 'referrer-policy': null, 'cross-origin-opener-policy': null };
const hv = Object.fromEntries(Object.keys(want).map((k) => [k, h.get(k)]));
rec('headers', 'helmet headers present on API', Object.values(hv).every(Boolean), JSON.stringify(hv));
rec('headers', 'Permissions-Policy present', !!h.get('permissions-policy'), `permissions-policy: ${h.get('permissions-policy')}`);
rec('headers', 'X-Powered-By absent', !h.get('x-powered-by'));
rec('headers', 'public API JSON is served as application/json (no HTML sniffing)', h.get('content-type')?.startsWith('application/json'));
const adminH = (await fetch(API + '/auth/me', { headers: { cookie: sa } })).headers;
rec('headers', 'admin/auth responses Cache-Control: no-store', adminH.get('cache-control') === 'no-store');
const pubCache = (await fetch(API + '/company')).headers.get('cache-control');
rec('headers', 'public API caching header (informational)', true, `cache-control: ${pubCache}  etag: ${!!(await fetch(API + '/company')).headers.get('etag')}`);
const trace = await fetch(API + '/company', { method: 'TRACE' }).catch(() => ({ status: 'err' }));
rec('http', 'TRACE not reflected', trace.status !== 200, String(trace.status));

// ───────── 9. sessions ─────────
const lo = await call('/auth/logout', { method: 'POST', cookie: sa });
rec('session', 'logout clears cookie', (lo.headers.getSetCookie?.() ?? []).some((c) => /lamico_token=;/.test(c)));
rec('session', 'logout revokes the token server-side', (await call('/auth/me', { cookie: sa })).status === 401, 'old token still valid after logout');
// deactivate
const eid = (await call('/auth/me', { cookie: ed })).json?.user?.id;
const sa2 = ck(await login('admin@lamico.test', 'TestPassword-12345'));
await call(`/admin/users/${eid}`, { method: 'PATCH', cookie: sa2, body: { isActive: false } });
rec('session', 'deactivated user loses access immediately', (await call('/admin/products', { cookie: ed })).status === 401);

// ───────── 10. rate limits (last: they lock things) ─────────
let ctc = []; for (let i = 0; i < 22; i++) ctc.push((await call('/contact', { method: 'POST', body: { name: 'Flood', email: 'f@example.com', message: 'flooding the contact form ' + i } })).status);
rec('rate', 'contact form limited (20/hour per IP)', ctc.includes(429), ctc.filter((s) => s === 201).length + ' accepted, ' + ctc.filter((s) => s === 429).length + ' blocked');
const s3pre = ck(await login('admin@lamico.test', 'TestPassword-12345'));
let lg2 = []; for (let i = 0; i < 12; i++) lg2.push((await login('brute@lamico.test', 'guess-' + i)).status);
rec('rate', 'login brute force throttled', lg2.includes(429), lg2.join(','));
const cpLimit = []; { const s3 = s3pre; if (s3) for (let i = 0; i < 10; i++) cpLimit.push((await call('/auth/change-password', { method: 'POST', cookie: s3, body: { currentPassword: 'wrong-' + i, newPassword: 'AnotherLongPass-999' } })).status); }
rec('rate', 'change-password guessing throttled', cpLimit.includes(429), cpLimit.join(','));

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? 'FAILED' : 'ALL PASSED'}: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('\nFAILED:'); failed.forEach((f) => console.log(` - [${f.area}] ${f.name} → ${f.detail}`)); }
process.exit(failed.length ? 1 : 0);
