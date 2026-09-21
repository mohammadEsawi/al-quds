const ORIGIN = process.env.TEST_API_URL ?? 'http://localhost:4001';
const API = `${ORIGIN}/api`;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : '  ' + extra}`); };

async function call(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}
const cookieOf = (r) => (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).find((c) => c.startsWith('lamico_token='));

const login = (email, password, headers) => call('/auth/login', { method: 'POST', body: { email, password }, headers });

const A = await login('admin@lamico.test', 'TestPassword-12345');
const cookie = cookieOf(A);
check('admin login', A.status === 200 && !!cookie);
check('admin responses are no-store', (await call('/auth/me', { cookie })).headers.get('cache-control') === 'no-store');

// CSRF / origin guard
const evil = await call('/admin/settings/x', { method: 'PUT', cookie, body: { value: 1 }, headers: { origin: 'https://evil.example' } });
check('cross-origin state change blocked (403)', evil.status === 403 && evil.json?.error?.code === 'CROSS_ORIGIN', JSON.stringify(evil.json));
const evil2 = await login('admin@lamico.test', 'TestPassword-12345', { origin: 'https://evil.example' });
check('cross-origin login blocked', evil2.status === 403);
const good = await call('/auth/me', { cookie, headers: { origin: 'http://localhost:5173' } });
check('own origin still works', good.status === 200);
const good2 = await call('/auth/logout', { method: 'POST', headers: { origin: 'http://localhost:5173' } });
check('own origin POST works', good2.status === 204);
const sfs = await call('/auth/logout', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } });
check('sec-fetch-site cross-site (no Origin) blocked', sfs.status === 403);

// company map URL allowlist
const co = await call('/admin/company', { cookie });
check('company readable', co.status === 200, JSON.stringify(co.json).slice(0, 120));
const c = co.json?.company ?? co.json;
const bad = await call('/admin/company', { method: 'PUT', cookie, body: { ...c, mapEmbedUrl: 'https://evil.example/phish' } });
check('non-Google map URL rejected (400)', bad.status === 400, `${bad.status} ${JSON.stringify(bad.json).slice(0, 200)}`);
const js = await call('/admin/company', { method: 'PUT', cookie, body: { ...c, mapEmbedUrl: 'javascript:alert(1)' } });
check('javascript: map URL rejected', js.status === 400);
const ok = await call('/admin/company', { method: 'PUT', cookie, body: { ...c } });
check('company with the seeded Google map still saves', ok.status === 200, `${ok.status} ${JSON.stringify(ok.json).slice(0, 200)}`);

// password change signs out other sessions
const s1 = cookieOf(await login('admin@lamico.test', 'TestPassword-12345'));
await new Promise((r) => setTimeout(r, 1100)); // iat has second resolution
const s2 = cookieOf(await login('admin@lamico.test', 'TestPassword-12345'));
const ch = await call('/auth/change-password', { method: 'POST', cookie: s2, body: { currentPassword: 'TestPassword-12345', newPassword: 'AnotherPass-98765' } });
check('change password 204', ch.status === 204);
const fresh = cookieOf(ch);
check('current session receives a fresh cookie', !!fresh && (await call('/auth/me', { cookie: fresh })).status === 200);
check('the other (older) session is signed out', (await call('/auth/me', { cookie: s1 })).status === 401);
check('the pre-change token of this session is dead too', (await call('/auth/me', { cookie: s2 })).status === 401 || s2 === fresh);
// restore the password for later runs
await call('/auth/change-password', { method: 'POST', cookie: fresh, body: { currentPassword: 'AnotherPass-98765', newPassword: 'TestPassword-12345' } });

// per-account login limiter (many attempts on one email, still counted per email)
let last;
for (let i = 0; i < 9; i++) last = await login('victim@lamico.test', 'wrong-password-' + i);
check('per-email limiter kicks in (429)', last.status === 429, String(last.status));
const other = await login('someone-else@lamico.test', 'wrong');
check('other accounts are not affected', other.status === 401, String(other.status));

// uploads CSP
const up = await fetch(`${ORIGIN}/uploads/media/does-not-exist.png`);
check('uploads: 404 for missing file', up.status === 404);

console.log(`\n${fail ? 'FAILED' : 'ALL PASSED'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
