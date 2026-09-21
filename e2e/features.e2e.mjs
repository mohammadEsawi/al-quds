// Real-browser tests for: "request a quote" (public), the quote inbox + alert settings + site checklist (dashboard),
// and two-factor login through the actual screens.
import { stepAt, totpForStep } from '../server/src/lib/totp.ts';
import { finish, ok, sleep, withPage } from './lib/browser.mjs';

const SITE = process.env.E2E_SITE ?? 'http://localhost:4173';
const API = process.env.E2E_API ?? 'http://localhost:4001';
const ADMIN = { email: 'admin@lamico.test', password: 'TestPassword-12345' };

const login = async (h) => {
  await h.send('Network.clearBrowserCookies');
  await h.goto('/admin/login', 1500);
  await h.fill('البريد الإلكتروني', ADMIN.email);
  await h.fill('كلمة السر', ADMIN.password);
  await h.clickText('دخول', 'button[type=submit]');
};

console.log('── Public: request a quote');
await withPage(SITE, async (h) => {
  await h.goto('/en/products/preform-200ml', 2500);
  ok('the product page has a "Request a quote" button', (await h.text()).includes('Request a quote'));
  await h.clickText('Request a quote', 'a');
  ok('it opens the quote page with the product in the address', await h.waitFor(`location.pathname === '/en/quote' && location.search.includes('product=preform-200ml')`), await h.path());
  ok('the form is there and the product is preselected', await h.waitFor(`document.getElementById('quote-productSlug')?.value === 'preform-200ml'`), await h.ev(`document.getElementById('quote-productSlug')?.value`));
  await h.clickText('Send quote request', 'button[type=submit]');
  await sleep(600);
  const t = await h.text();
  ok('empty submit shows validation errors instead of sending', t.includes('This field is required'), t.slice(-300));
  await h.fill('Company name', 'E2E Company Ltd');
  await h.fill('Contact person', 'Rana Khalil');
  await h.fill('Email', 'rana@e2e-company.test');
  await h.fill('Phone number', '0591112233');
  await h.fill('Quantity needed', '100,000 pieces a month');
  await h.fill('Additional notes', 'Need delivery to Nablus every two weeks.');
  await h.clickText('Send quote request', 'button[type=submit]');
  ok('sending shows the thank-you message', await h.waitFor(`document.body.innerText.includes('We received your request')`, 8000), (await h.text()).slice(-300));
}).then((errors) => ok('quote page: no console errors', errors.length === 0, errors.join(' | ')));

await withPage(SITE, async (h) => {
  await h.goto('/ar/quote', 2500);
  const t = await h.text();
  ok('the Arabic quote page renders right-to-left with Arabic labels', t.includes('اطلب عرض سعر') && t.includes('اسم الشركة') && (await h.ev('document.documentElement.dir')) === 'rtl');
}).then((errors) => ok('Arabic quote page: no console errors', errors.length === 0, errors.join(' | ')));

await withPage(SITE, async (h) => {
  await h.goto('/ar/preforms', 2500);
  ok('the preforms page offers a quote button', (await h.text()).includes('اطلب عرض سعر'));
  await h.goto('/ar/plastic', 2500);
  ok('the plastic page offers a quote button', (await h.text()).includes('اطلب عرض سعر'));
});

console.log('── Dashboard: quotes, alerts, checklist');
await withPage(SITE, async (h) => {
  await login(h);
  ok('dashboard opens after login', await h.waitFor(`location.pathname === '/admin' && document.body.innerText.includes('إجمالي المنتجات')`, 10000));
  ok('dashboard counts the new quote request', (await h.text()).includes('طلبات عروض أسعار جديدة'));
  ok('the site checklist loads', await h.waitFor(`document.body.innerText.includes('التحقق بخطوتين لحسابك')`, 8000));
  const t = await h.text();
  ok('the checklist has its groups', t.includes('جاهزية الموقع') && t.includes('المحتوى') && t.includes('الأمان') && t.includes('التشغيل'));
  ok('the checklist says what is missing (2FA, backups, sample products)', t.includes('التحقق بخطوتين لحسابك') && t.includes('النسخ الاحتياطي') && t.includes('منتجات تجريبية'));

  await h.goto('/admin/quotes', 2500);
  const q = await h.text();
  ok('the quote inbox lists the company, product and quantity', q.includes('E2E Company Ltd') && q.includes('100,000 pieces a month'), q.slice(0, 300));
  await h.clickText('E2E Company Ltd', 'button');
  ok('opening a quote shows its details', await h.waitFor(`document.body.innerText.includes('rana@e2e-company.test') && document.body.innerText.includes('Need delivery to Nablus')`));
  await h.select('#quote-status', 'quoted');
  ok('changing the status is saved', await h.waitFor(`document.body.innerText.includes('أُرسل عرض السعر')`));
  const listed = await (await fetch(`${API}/api/products`)).json();
  ok('(sanity) the catalogue behind the quote form is intact', Array.isArray(listed) && listed.some((p) => p.slug === 'preform-200ml'));

  await h.goto('/admin/notification-settings', 2500);
  const n = await h.text();
  ok('the alert settings page shows email and WhatsApp with their state', n.includes('البريد الإلكتروني') && n.includes('واتساب') && n.includes('غير مُعدّة في .env'));
  await h.fill('المستلمون', 'sales@lamico.test');
  await h.clickText('حفظ', 'button');
  ok('recipients can be saved', await h.waitFor(`document.body.innerText.includes('تم حفظ الإعدادات')`));
}).then((errors) => ok('dashboard pages: no console errors', errors.length === 0, errors.join(' | ')));

console.log('── Two-factor login through the screens');
let secret = '';
let step = 0;
await withPage(SITE, async (h) => {
  await login(h);
  await h.waitFor(`location.pathname === '/admin'`, 10000);
  await h.goto('/admin/account', 2000);
  ok('the account page offers to switch two-factor on', (await h.text()).includes('التحقق بخطوتين') && (await h.text()).includes('غير مفعّل'));
  await h.clickText('تفعيل التحقق بخطوتين', 'button');
  ok('a QR code and the manual key appear', await h.waitFor(`!!document.querySelector('img[alt^="رمز QR"]') && !!document.querySelector('p.font-mono')`));
  secret = await h.ev(`document.querySelector('p.font-mono').textContent.trim()`);
  step = stepAt(Date.now());
  await h.fill('الرمز من التطبيق', totpForStep(secret, step));
  await h.clickText('تأكيد وتفعيل', 'button');
  ok('a correct code turns it on and shows 10 recovery codes once', await h.waitFor(`document.querySelectorAll('ul.font-mono li').length === 10`, 8000), (await h.text()).slice(0, 300));
  await h.clickText('حفظتها', 'button');
  ok('the account now shows "enabled"', await h.waitFor(`document.body.innerText.includes('مفعّل')`));
}).then((errors) => ok('account page: no console errors', errors.length === 0, errors.join(' | ')));

await withPage(SITE, async (h) => {
  await login(h);
  ok('after enabling, the password alone shows the code screen (no session yet)', await h.waitFor(`document.body.innerText.includes('أدخل الرمز المكوّن من 6 أرقام') && location.pathname === '/admin/login'`, 8000));
  await h.fill('رمز التحقق', '000000');
  await h.clickText('تأكيد', 'button[type=submit]');
  ok('a wrong code shows an Arabic error and stays on the login page', await h.waitFor(`document.body.innerText.includes('الرمز غير صحيح')`) && (await h.path()).startsWith('/admin/login'));
  await h.fill('رمز التحقق', totpForStep(secret, step + 1));
  await h.clickText('تأكيد', 'button[type=submit]');
  ok('the next code signs in to the dashboard', await h.waitFor(`location.pathname === '/admin' && document.body.innerText.includes('إجمالي المنتجات')`, 10000));
  const t = await h.text();
  ok('the checklist now counts two-factor as done', !t.includes('فعّله من صفحة «حسابي»'));
}).then((errors) => ok('two-factor login: no console errors', errors.length === 0, errors.join(' | ')));

finish();
