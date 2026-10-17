// The dashboard's visits/countries widget: /track records anonymous page views, /admin/analytics
// aggregates them. Runs with TRUST_PROXY=true (see tests/run.mjs) so x-forwarded-for is honoured.
import { call, check, finish, session } from '../lib/client.mjs';

const PASS = 'Correct-Horse-Battery-77';
const sa = await session();
await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'editor9@lamico.test', name: 'Editor', password: PASS, role: 'EDITOR' } });
const ed = await session('editor9@lamico.test', PASS);

// A fixed public IP with a stable, well-known country (Google Public DNS → US) makes the country
// lookup deterministic; the user agent is fixed too, so two calls from the same "visitor" collapse
// into one when counting unique visitors.
const visitor = (path, extra = {}) => call('/track', { method: 'POST', body: { path }, headers: { 'x-forwarded-for': '8.8.8.8', 'user-agent': 'suite-09', ...extra } });

check('needs no login', (await visitor('/ar')).status === 204);
check('records a second page for the same visitor', (await visitor('/ar/about')).status === 204);
check('a repeat of the same page is also counted', (await visitor('/ar')).status === 204);

// A second visitor from the same country (same IP, a different browser) so the country total (2) is
// unambiguously ahead of the next one below (1), regardless of how the geo database places it.
check('a second, distinct visitor from the same IP is accepted', (await visitor('/ar', { 'user-agent': 'suite-09-second' })).status === 204);

// A different visitor from a different address entirely, on the same day.
const other = await call('/track', { method: 'POST', body: { path: '/ar/plastic' }, headers: { 'x-forwarded-for': '1.1.1.1', 'user-agent': 'suite-09-other' } });
check('a visitor from a different address is accepted too', other.status === 204);

check('/admin routes are never counted', (await visitor('/admin/products')).status === 204);
check('"Do Not Track" is respected', (await visitor('/ar/contact', { dnt: '1' })).status === 204);
check('an empty path is rejected', (await call('/track', { method: 'POST', body: { path: '' } })).status === 400);

check('the stats need a login', (await call('/admin/analytics', { cookie: null })).status === 401);
const badDays = await call('/admin/analytics?days=0', { cookie: ed });
check('out-of-range "days" is rejected', badDays.status === 400);

const stats = await call('/admin/analytics?days=30', { cookie: ed });
check(
  'an EDITOR can see it (nothing sensitive in here); 5 page views recorded (not /admin, not DNT)',
  stats.status === 200 && stats.json?.days === 30 && stats.json?.totalViews === 5,
  JSON.stringify(stats.json).slice(0, 300),
);
check('3 distinct visitors, even though there were 5 page views', stats.json?.uniqueVisitors === 3);
check('today shows up in the daily series with the right totals', stats.json?.daily?.at(-1)?.views === 5 && stats.json?.daily?.at(-1)?.visitors === 3);
check(
  'the 2 visitors from 8.8.8.8 (US) outrank the 1 from the other address',
  stats.json?.topCountries?.[0]?.country === 'US' && stats.json?.topCountries?.[0]?.visitors === 2,
  JSON.stringify(stats.json?.topCountries),
);
check('the most-viewed page is /ar (visited 3 times)', stats.json?.topPages?.[0]?.path === '/ar' && stats.json?.topPages?.[0]?.views === 3);
check('the response never carries an IP address or any other visitor identifier', !/\d+\.\d+\.\d+\.\d+|visitorHash|"ip"/i.test(stats.text));

finish();
