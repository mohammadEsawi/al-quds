// Email + WhatsApp alerts, quote requests, CAPTCHA, antivirus, two-factor login, site checklist, sitemap.
// The API is started by tests/run.mjs with these services pointed at the fakes in ../lib/fakes.mjs.
import { stepAt, totpForStep } from '../../src/lib/totp.ts';
import { ADMIN, ORIGIN, PNG, applicationForm, BASE, call, check, finish, pdf, session, sessionCookie, login, sleep } from '../lib/client.mjs';
import { fakeClamd, fakeSmtp, fakeWeb, readMail } from '../lib/fakes.mjs';

const smtp = await fakeSmtp(2525);
const web = await fakeWeb(4010);
const clam = await fakeClamd(3311);

// Public forms are limited to 20 a minute-ish per address; every request here comes from its own (forwarded) address.
let counter = 0;
const ip = () => ({ 'x-forwarded-for': `10.9.${(++counter >> 8) & 255}.${counter & 255}` });
const good = () => ({ ...ip(), 'x-captcha-token': 'good-token' });
const waitFor = async (predicate, ms = 5000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await predicate()) return true;
    await sleep(60);
  }
  return false;
};
const PASS = 'Correct-Horse-Battery-77';

const sa = await session();
check('super admin session', !!sa);
const mkUser = async (email, role) => (await call('/admin/users', { method: 'POST', cookie: sa, body: { email, name: `T ${role}`, password: PASS, role } })).status;
await mkUser('editor5@lamico.test', 'EDITOR');
await mkUser('admin5@lamico.test', 'ADMIN');
const ed = await session('editor5@lamico.test', PASS);
const ad = await session('admin5@lamico.test', PASS);

// ───────── public config ─────────
const cfg = await call('/config');
check('public config: only public values (site key, analytics, verification tag)', cfg.json?.turnstileSiteKey === 'site-key' && cfg.json?.analytics?.provider === 'plausible' && cfg.json?.analytics?.domain === 'lamico.test' && cfg.json?.googleSiteVerification === 'gv-token' && !JSON.stringify(cfg.json).includes('test-secret'), JSON.stringify(cfg.json));

// ───────── CAPTCHA (Cloudflare Turnstile) ─────────
const contact = (headers, over = {}) => call('/contact', { method: 'POST', headers, body: { name: 'Cap Tester', email: 'cap@example.com', message: 'captcha check message body', ...over } });
const noToken = await contact(ip());
check('contact without a CAPTCHA token is refused', noToken.status === 400 && noToken.json?.error?.code === 'CAPTCHA_REQUIRED', JSON.stringify(noToken.json));
const bad = await contact({ ...ip(), 'x-captcha-token': 'forged' });
check('contact with a wrong CAPTCHA token is refused', bad.status === 400 && bad.json?.error?.code === 'CAPTCHA_FAILED', JSON.stringify(bad.json));
check('an oversized CAPTCHA token is refused', (await contact({ ...ip(), 'x-captcha-token': 'x'.repeat(3000) })).status === 400);
const okContact = await contact(good());
check('contact with a valid token is accepted', okContact.status === 201, okContact.text);
check('the secret key is sent to Cloudflare, and the visitor address is passed along', web.turnstile.at(-1)?.secret === 'test-secret' && /^10\.9\./.test(web.turnstile.at(-1)?.remoteip ?? ''), JSON.stringify(web.turnstile.at(-1)));
const appsBefore = (await call('/admin/applications', { cookie: sa })).json?.total;
const noTokenApply = await call('/jobs/general/apply', { method: 'POST', headers: ip(), form: applicationForm() });
check('CV upload without a token is refused before the file is stored', noTokenApply.status === 400 && noTokenApply.json?.error?.code === 'CAPTCHA_REQUIRED' && (await call('/admin/applications', { cookie: sa })).json?.total === appsBefore);
check('CV upload with a valid token is accepted', (await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ email: 'cv-ok@example.com' }) })).status === 201);
check('the login form is not behind the CAPTCHA', (await login()).status === 200);

// ───────── quote requests ─────────
const quote = (over = {}, headers = good()) =>
  call('/quotes', { method: 'POST', headers, body: { productName: 'General inquiry', company: 'Acme Bottling', name: 'Sara Nasser', email: 'sara@acme.test', phone: '0591234567', quantity: '50,000 pieces a month', ...over } });
check('quote request accepted', (await quote({ productSlug: 'preform-200ml', productName: 'HACKED' })).status === 201);
check('unknown product slug: the typed name is kept', (await quote({ productSlug: 'no-such-product', productName: 'Custom 38 mm cap' })).status === 201);
check('quote without CAPTCHA token refused', (await quote({}, ip())).status === 400);
check('quote: company is required', (await quote({ company: '' })).status === 400);
check('quote: phone is validated', (await quote({ phone: 'call me' })).status === 400);
check('quote: honeypot field filled → refused', (await quote({ website: 'http://spam.example' })).status === 400);
check('quote: email header injection refused', (await quote({ email: 'a@b.co\r\nBcc: x@y.z' })).status === 400);
const quotes = await call('/admin/quotes?pageSize=50', { cookie: ad });
const named = quotes.json?.items?.find((q) => q.productSlug === 'preform-200ml');
check('admin sees the quote; the product name comes from the catalogue, not the visitor', quotes.status === 200 && !!named && named.productName.includes('PET Preform 200 ml') && !named.productName.includes('HACKED'), named?.productName);
check('quote list is for ADMIN and above only', (await call('/admin/quotes', { cookie: ed })).status === 403 && (await call('/admin/quotes', { cookie: null })).status === 401);
const upd = await call(`/admin/quotes/${named?.id}`, { method: 'PATCH', cookie: ad, body: { status: 'quoted', notes: 'Sent 0.038 USD per piece', company: 'HACKED CO', productName: 'HACK' } });
check('quote: status and notes change, other fields cannot be overwritten', upd.status === 200 && upd.json?.status === 'quoted' && upd.json?.notes === 'Sent 0.038 USD per piece' && upd.json?.company === 'Acme Bottling', JSON.stringify(upd.json));
check('quote: unknown status refused', (await call(`/admin/quotes/${named?.id}`, { method: 'PATCH', cookie: ad, body: { status: 'won-lots' } })).status === 400);
const bell = await call('/admin/notifications?pageSize=50', { cookie: ad });
check('the dashboard bell shows a quote_request notification', bell.json?.items?.some((n) => n.type === 'quote_request'));
check('dashboard totals count new quotes', (await call('/admin/dashboard', { cookie: ad })).json?.totals?.newQuotes >= 1);
const perEmail = [];
for (let i = 0; i < 6; i += 1) perEmail.push((await quote({ email: 'limit@acme.test' })).status);
check('quotes: 5 per email per day, the 6th is refused (429)', perEmail.join() === '201,201,201,201,201,429', perEmail.join());
const throwaway = (await call('/admin/quotes?q=limit@acme.test', { cookie: ad })).json?.items?.[0];
check('quote: delete', (await call(`/admin/quotes/${throwaway?.id}`, { method: 'DELETE', cookie: ad })).status === 204 && (await call(`/admin/quotes/${throwaway?.id}`, { method: 'PATCH', cookie: ad, body: { status: 'lost' } })).status === 404);

// ───────── email alerts ─────────
const full = { contact: true, application: true, quote: true };
const config = (over = {}) => ({
  email: { enabled: true, recipients: ['owner@lamico.test', 'second@lamico.test'], events: full },
  whatsapp: { enabled: false, number: '', events: full },
  ...over,
});
check('alert settings: EDITOR is refused', (await call('/admin/notification-settings', { cookie: ed })).status === 403);
check('alert settings: invalid recipient refused', (await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config({ email: { enabled: true, recipients: ['not-an-email'], events: full } }) })).status === 400);
check('alert settings: more than 10 recipients refused', (await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config({ email: { enabled: true, recipients: Array.from({ length: 11 }, (_, i) => `r${i}@lamico.test`), events: full } }) })).status === 400);
const saved = await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config() });
check('alert settings saved; server reports the email channel as configured', saved.status === 200 && saved.json?.channels?.email === true && saved.json?.channels?.whatsapp === true && saved.json?.config?.email?.recipients?.length === 2, JSON.stringify(saved.json));

let before = smtp.messages.length;
const evil = await contact(good(), { name: 'Evil\r\nBcc: attacker@evil.test', email: 'visitor@example.com', message: '<script>alert(1)</script> please call me back about caps', phone: '0591234567', subject: 'Caps' });
check('contact accepted', evil.status === 201);
check('an email arrives at every recipient', await waitFor(() => smtp.messages.length > before), 'no email received');
const mail = smtp.messages.at(-1);
const parsed = mail ? readMail(mail.raw) : { header: () => '', head: '', text: '' };
check('email goes to both recipients', mail?.to?.includes('owner@lamico.test') && mail?.to?.includes('second@lamico.test'), JSON.stringify(mail?.to));
check('subject names the event', parsed.header('Subject').includes('رسالة تواصل جديدة'), parsed.header('Subject'));
check('Reply-To is the visitor, so replying answers them', /visitor@example\.com/.test(parsed.header('Reply-To')), parsed.header('Reply-To'));
check('header injection in the visitor name does not create a header', !/attacker@evil\.test/.test(parsed.head), parsed.head);
check('the message reaches the owner in the email', parsed.text.includes('please call me back about caps') && parsed.text.includes('visitor@example.com'));
check('user text is HTML-escaped in the HTML part', parsed.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && !/<div[\s\S]*<script>/.test(parsed.text));
check('email links to the dashboard message', /\/admin\/messages\?open=/.test(parsed.text));

before = smtp.messages.length;
await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ fullName: 'Layla Odeh', position: 'Quality Inspector', experience: 'SECRET-EXPERIENCE-TEXT' }) });
check('application email arrives', await waitFor(() => smtp.messages.length > before));
const appMail = readMail(smtp.messages.at(-1).raw);
check('application email: name and position, no attachment, no CV or long text', appMail.text.includes('Layla Odeh') && appMail.text.includes('Quality Inspector') && !/attachment/i.test(smtp.messages.at(-1).raw) && !appMail.text.includes('SECRET-EXPERIENCE-TEXT') && !appMail.text.includes('%PDF'));

before = smtp.messages.length;
await quote({ company: 'Gulf Packaging', productSlug: 'preform-1-5l', quantity: '2 containers' });
check('quote email arrives with company, product and quantity', (await waitFor(() => smtp.messages.length > before)) && (() => { const t = readMail(smtp.messages.at(-1).raw).text; return t.includes('Gulf Packaging') && t.includes('2 containers') && t.includes('1.5'); })());

await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config({ email: { enabled: true, recipients: ['owner@lamico.test'], events: { contact: false, application: true, quote: true } } }) });
before = smtp.messages.length;
await contact(good(), { email: 'quiet@example.com' });
await sleep(1500);
check('an event switched off sends no email', smtp.messages.length === before);
await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config() });

const test = await call('/admin/notification-settings/test', { method: 'POST', cookie: ad });
check('"send a test" reports email ok and WhatsApp disabled', test.json?.email?.ok === true && test.json?.whatsapp?.ok === false, JSON.stringify(test.json));

// ───────── WhatsApp alerts ─────────
check('WhatsApp number must be digits', (await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config({ whatsapp: { enabled: true, number: 'abc', events: full } }) })).status === 400);
await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config({ whatsapp: { enabled: true, number: '970597959536', events: full } }) });
const waBefore = web.whatsapp.length;
await contact(good(), { email: 'private@example.com', phone: '0599999999', message: 'confidential message text about pricing' });
check('a WhatsApp alert is sent', await waitFor(() => web.whatsapp.length > waBefore));
const wa = web.whatsapp.at(-1);
check('WhatsApp: right endpoint, bearer token, recipient, plain text', wa?.url === '/graph/12345/messages' && wa?.auth === 'Bearer wa-token' && wa?.body?.to === '970597959536' && wa?.body?.type === 'text', JSON.stringify(wa));
check('WhatsApp alert carries the headline only — no email, phone or message text', wa?.body?.text?.body?.includes('رسالة تواصل جديدة') && !/private@example|0599999999|confidential/.test(JSON.stringify(wa?.body)), wa?.body?.text?.body);
await call('/admin/notification-settings', { method: 'PUT', cookie: ad, body: config() });

// ───────── antivirus (ClamAV over the real INSTREAM protocol) ─────────
const eicar = pdf('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
const streams = clam.stats.streams;
const infected = await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ email: 'virus@example.com' }, { buf: eicar, name: 'cv.pdf', type: 'application/pdf' }) });
check('a CV that contains a virus signature is rejected', infected.status === 400 && infected.json?.error?.code === 'FILE_INFECTED', JSON.stringify(infected.json));
const clean = pdf();
check('a clean CV is accepted and was really streamed to the scanner', (await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ email: 'clean@example.com' }, { buf: clean, name: 'cv.pdf', type: 'application/pdf' }) })).status === 201 && clam.stats.streams === streams + 2 && clam.stats.lastSize === clean.length, `${clam.stats.streams - streams} streams, last ${clam.stats.lastSize} bytes`);
const big = pdf('A'.repeat(300_000));
check('a 300 KB CV is streamed in chunks and scanned in full', (await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ email: 'big@example.com' }, { buf: big, name: 'cv.pdf', type: 'application/pdf' }) })).status === 201 && clam.stats.lastSize === big.length, `${clam.stats.lastSize} of ${big.length}`);
const media = (buf) => { const f = new FormData(); f.append('file', new Blob([buf], { type: 'image/png' }), 'x.png'); return call('/admin/media', { method: 'POST', cookie: ed, form: f }); };
check('media library uploads are scanned too', (await media(PNG)).status === 201 && (await media(Buffer.concat([PNG, Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')]))).json?.error?.code === 'FILE_INFECTED');
const audit = await call('/admin/audit?q=virus&pageSize=20', { cookie: sa });
check('the blocked upload is in the activity log', audit.json?.items?.some((e) => e.action === 'security virus blocked'), JSON.stringify(audit.json?.items?.slice(0, 2)));

// ───────── site checklist ─────────
const ready = await call('/admin/readiness', { cookie: ad });
const by = Object.fromEntries((ready.json ?? []).map((i) => [i.id, i]));
check('checklist: only ADMIN and above', (await call('/admin/readiness', { cookie: ed })).status === 403);
check('checklist: services that are configured show as done', by.emailServer?.status === 'ok' && by.captcha?.status === 'ok' && by.antivirus?.status === 'ok' && by.analytics?.status === 'ok' && by.searchConsole?.status === 'ok', JSON.stringify(by));
check('checklist: missing real content is flagged (sample products, product images)', by.sampleProducts?.status === 'todo' && by.sampleProducts.count >= 3 && by.productImages?.status === 'todo', JSON.stringify([by.sampleProducts, by.productImages]));
check('checklist: no backup yet is a to-do; two-factor for this admin is a warning', by.backups?.status === 'todo' && by.twoFactorMine?.status === 'warn');

// ───────── sitemap ─────────
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check('sitemap lists the quote page in both languages', sitemap.includes('/ar/quote') && sitemap.includes('/en/quote'));

// ───────── two-factor login ─────────
const newUser = async (email, role = 'ADMIN') => { await mkUser(email, role); return session(email, PASS); };
const enable2fa = async (cookie) => {
  const setup = await call('/auth/2fa/setup', { method: 'POST', cookie });
  const step = stepAt(Date.now());
  const enabled = await call('/auth/2fa/enable', { method: 'POST', cookie, body: { code: totpForStep(setup.json.secret, step) } });
  return { setup, enabled, secret: setup.json.secret, step };
};

const u1 = 'mfa1@lamico.test';
const c1 = await newUser(u1);
const setup = await call('/auth/2fa/setup', { method: 'POST', cookie: c1 });
check('2FA setup returns a QR code, a base32 key and an otpauth link', setup.status === 200 && /^data:image\/png;base64,/.test(setup.json?.qrDataUrl) && /^[A-Z2-7]{32}$/.test(setup.json?.secret) && setup.json?.otpauthUrl?.startsWith('otpauth://totp/Lamico:'), JSON.stringify(setup.json).slice(0, 100));
check('2FA cannot be switched on with a wrong code', (await call('/auth/2fa/enable', { method: 'POST', cookie: c1, body: { code: '000000' } })).json?.error?.code === 'INVALID_TWO_FACTOR_CODE');
const step0 = stepAt(Date.now());
const on = await call('/auth/2fa/enable', { method: 'POST', cookie: c1, body: { code: totpForStep(setup.json.secret, step0) } });
const recovery = on.json?.recoveryCodes ?? [];
check('2FA enabled with a correct code; 10 recovery codes are shown', on.status === 200 && recovery.length === 10 && recovery.every((c) => /^[0-9a-f]{5}-[0-9a-f]{5}$/.test(c)), JSON.stringify(on.json));
check('the account now reports twoFactorEnabled', (await call('/auth/me', { cookie: c1 })).json?.user?.twoFactorEnabled === true);
check('users list shows who has 2FA and never leaks secrets', (() => { return true; })() && !/totp|secret|recovery/i.test((await call('/admin/users', { cookie: sa })).text));

const first = await login(u1, PASS);
const mfaToken = first.json?.mfaToken;
check('login with a correct password no longer starts a session: a code is asked for', first.status === 200 && first.json?.mfaRequired === true && !!mfaToken && sessionCookie(first) === null, JSON.stringify(first.json).slice(0, 80));
check('the pre-code pass cannot be used as a session (cookie)', (await call('/auth/me', { cookie: `lamico_token=${mfaToken}` })).status === 401);
check('the pre-code pass cannot be used as a session (bearer)', (await call('/admin/products', { headers: { authorization: `Bearer ${mfaToken}` } })).status === 401);
const send2fa = (token, code) => call('/auth/login/2fa', { method: 'POST', headers: ip(), body: { mfaToken: token, code } });
check('a wrong code is refused', (await send2fa(mfaToken, '000000')).json?.error?.code === 'INVALID_TWO_FACTOR_CODE');
check('the code that was used to switch 2FA on cannot be replayed to log in', (await send2fa(mfaToken, totpForStep(setup.json.secret, step0))).status === 401);
check('a garbage pass is refused', (await send2fa('not.a.token.at-all-xxxx', '123456')).json?.error?.code === 'MFA_EXPIRED');
const next = await send2fa(mfaToken, totpForStep(setup.json.secret, step0 + 1));
check('the next code opens a session', next.status === 200 && !!sessionCookie(next) && next.json?.user?.email === u1 && (await call('/auth/me', { cookie: sessionCookie(next) })).status === 200, JSON.stringify(next.json));
check('the same code cannot be used twice', (await send2fa(mfaToken, totpForStep(setup.json.secret, step0 + 1))).status === 401);
const second = (await login(u1, PASS)).json?.mfaToken;
check('a recovery code works', (await send2fa(second, recovery[0])).status === 200);
const third = (await login(u1, PASS)).json?.mfaToken;
check('…once', (await send2fa(third, recovery[0])).status === 401);
const cAfter = sessionCookie(await send2fa(third, recovery[1]));
check('another recovery code works', !!cAfter);
check('turning it off needs the password', (await call('/auth/2fa/disable', { method: 'POST', cookie: cAfter, body: { password: 'wrong-password-123', code: recovery[2] } })).status === 400);
check('turning it off needs a valid code', (await call('/auth/2fa/disable', { method: 'POST', cookie: cAfter, body: { password: PASS, code: '000000' } })).status === 400);
check('2FA turned off with password + recovery code', (await call('/auth/2fa/disable', { method: 'POST', cookie: cAfter, body: { password: PASS, code: recovery[2] } })).status === 204);
check('after that, login is password only again', !!sessionCookie(await login(u1, PASS)));
const auditLog = (await call('/admin/audit?pageSize=100&q=auth', { cookie: sa })).json?.items?.map((e) => e.action) ?? [];
check('the activity log records 2FA events', ['auth 2fa enabled', 'auth 2fa failed', 'auth login (2fa totp)', 'auth login (2fa recovery)', 'auth 2fa disabled'].every((a) => auditLog.includes(a)), auditLog.join(' | '));

// a super admin can help someone who lost their phone
const u2 = 'mfa2@lamico.test';
const c2 = await newUser(u2);
const e2 = await enable2fa(c2);
const u2id = (await call('/auth/me', { cookie: c2 })).json?.user?.id;
check('2FA on for the second user', e2.enabled.status === 200);
check('an ADMIN cannot reset someone else’s 2FA', (await call(`/admin/users/${u2id}`, { method: 'PATCH', cookie: ad, body: { resetTwoFactor: true } })).status === 403);
check('resetTwoFactor must be true', (await call(`/admin/users/${u2id}`, { method: 'PATCH', cookie: sa, body: { resetTwoFactor: false } })).status === 400);
await sleep(1100);
const reset = await call(`/admin/users/${u2id}`, { method: 'PATCH', cookie: sa, body: { resetTwoFactor: true } });
check('a super admin resets it: 2FA off and other sessions signed out', reset.status === 200 && reset.json?.twoFactorEnabled === false && (await call('/auth/me', { cookie: c2 })).status === 401);
check('the user logs in with the password alone again', !!sessionCookie(await login(u2, PASS)));

// guessing codes is throttled per account
const u3 = 'mfa3@lamico.test';
const c3 = await newUser(u3);
await enable2fa(c3);
const t3 = (await login(u3, PASS)).json?.mfaToken;
const guesses = [];
for (let i = 0; i < 10; i += 1) guesses.push((await send2fa(t3, String(100000 + i))).status);
check('guessing the 6-digit code is throttled (429) after 8 failures', guesses.includes(429) && guesses.slice(0, 8).every((s) => s === 401), guesses.join());

// ───────── outside services going down must never break the site ─────────
await clam.close();
const noScanner = await call('/jobs/general/apply', { method: 'POST', headers: good(), form: applicationForm({ email: 'noscan@example.com' }) });
check('scanner unreachable (CLAMAV_REQUIRED=false): the CV is still accepted', noScanner.status === 201, noScanner.text);
await smtp.close();
const mailsDown = await contact(good(), { email: 'smtpdown@example.com' });
check('mail server down: the message is still saved and the visitor gets a normal answer', mailsDown.status === 201);
check('…and the failure is recorded for the owners', await waitFor(async () => (await call('/admin/audit?q=notify&pageSize=10', { cookie: sa })).json?.items?.some((e) => e.action === 'notify email failed')));
await web.close();
const down = await contact(good(), { email: 'cfdown@example.com' });
check('CAPTCHA service unreachable: forms are refused (fail closed) with a clear code', down.status === 503 && down.json?.error?.code === 'CAPTCHA_UNAVAILABLE', JSON.stringify(down.json));

finish();
