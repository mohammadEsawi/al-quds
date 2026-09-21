// The API started with REQUIRE_2FA=true: admins must set up two-factor login before they can use the dashboard.
import { stepAt, totpForStep } from '../../src/lib/totp.ts';
import { call, check, finish, login, session } from '../lib/client.mjs';

const PASS = 'Correct-Horse-Battery-77';
const sa = await session();
const me = await call('/auth/me', { cookie: sa });
check('a super admin without 2FA is told it is required', me.json?.user?.twoFactorRequired === true && me.json?.user?.twoFactorEnabled === false, JSON.stringify(me.json));
check('login response says the same', (await login()).json?.user?.twoFactorRequired === true);

const blocked = await call('/admin/products', { cookie: sa });
check('every dashboard API is blocked until 2FA is set up (403 TWO_FACTOR_REQUIRED)', blocked.status === 403 && blocked.json?.error?.code === 'TWO_FACTOR_REQUIRED', JSON.stringify(blocked.json));
check('…including users and settings', (await call('/admin/users', { cookie: sa })).status === 403 && (await call('/admin/settings', { cookie: sa })).status === 403);

const setup = await call('/auth/2fa/setup', { method: 'POST', cookie: sa });
check('the setup endpoints stay reachable', setup.status === 200 && !!setup.json?.secret);
const enable = await call('/auth/2fa/enable', { method: 'POST', cookie: sa, body: { code: totpForStep(setup.json.secret, stepAt(Date.now())) } });
check('2FA can be switched on', enable.status === 200);
check('after that the dashboard works', (await call('/admin/products', { cookie: sa })).status === 200 && (await call('/auth/me', { cookie: sa })).json?.user?.twoFactorRequired === false);

check('an EDITOR is not affected by the requirement', (await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'editor7@lamico.test', name: 'Editor', password: PASS, role: 'EDITOR' } })).status === 201);
const ed = await session('editor7@lamico.test', PASS);
check('…and can use the dashboard without 2FA', !!ed && (await call('/admin/products', { cookie: ed })).status === 200);
const admin7 = await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'admin7@lamico.test', name: 'Admin', password: PASS, role: 'ADMIN' } });
const ad = await session('admin7@lamico.test', PASS);
check('a new ADMIN is blocked until they set 2FA up', admin7.status === 201 && (await call('/admin/quotes', { cookie: ad })).json?.error?.code === 'TWO_FACTOR_REQUIRED');
finish();
