// The API started with NODE_ENV=production and CLIENT_URL=https://lamico.test (see tests/run.mjs).
import { ADMIN, BASE, ORIGIN, call, check, finish, login } from '../lib/client.mjs';

const res = await login();
const setCookie = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('lamico_token='));
check('login works from the production origin', res.status === 200 && !!setCookie, res.text);
check('session cookie is HttpOnly + Secure + SameSite=Lax', /HttpOnly/i.test(setCookie) && /; Secure/i.test(setCookie) && /SameSite=Lax/i.test(setCookie), setCookie?.replace(/=[^;]+/, '=***'));

const cookie = setCookie?.split(';')[0];
check('the development origin is NOT trusted in production', (await call('/auth/logout', { method: 'POST', headers: { origin: 'http://localhost:5173' } })).status === 403);
check('a foreign origin gets no CORS permission', !(await fetch(`${BASE}/api/company`, { headers: { origin: 'https://evil.example' } })).headers.get('access-control-allow-origin'));
check('the production origin gets CORS with credentials', (await fetch(`${BASE}/api/company`, { headers: { origin: ORIGIN } })).headers.get('access-control-allow-credentials') === 'true');
const headers = (await fetch(`${BASE}/api/company`)).headers;
check('security headers are present', !!headers.get('strict-transport-security') && headers.get('x-content-type-options') === 'nosniff' && !!headers.get('permissions-policy') && !headers.get('x-powered-by'));
const missing = await call('/nope/nothing');
check('errors are generic JSON without stack traces or paths', missing.status === 404 && !/at .*\(|node_modules|E:\\|\/home\//.test(missing.text));
check('admin API is reachable with the secure cookie', (await call('/admin/dashboard', { cookie })).status === 200);
check('robots.txt and sitemap use the production address', (await (await fetch(`${BASE}/robots.txt`)).text()).includes('https://lamico.test/sitemap.xml') && (await (await fetch(`${BASE}/sitemap.xml`)).text()).includes('https://lamico.test/ar'));
void ADMIN;
finish();
