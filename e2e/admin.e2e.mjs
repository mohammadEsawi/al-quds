import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import os from 'node:os';
const HERE = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-e2e-'));
const SITE = process.env.E2E_SITE ?? 'http://localhost:4173';
const API = process.env.E2E_API ?? 'http://localhost:4001';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✓' : '✗'} ${name}${!cond && extra ? '  → ' + String(extra).slice(0, 220) : ''}`); };

// small valid PNGs (different colours) to upload
const png = (r, g, b) => {
  const zlib = require_zlib();
  const crc = (buf) => { let c, crcT = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } let x = 0xffffffff; for (const b of buf) x = crcT[(x ^ b) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(64, 0); ihdr.writeUInt32BE(64, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: 64 }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: 64 }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
import { createRequire } from 'node:module';
const require_zlib = () => createRequire(import.meta.url)('node:zlib');
const files = { blue: path.join(HERE, 'e2e-blue.png'), red: path.join(HERE, 'e2e-red.png'), green: path.join(HERE, 'e2e-green.png') };
fs.writeFileSync(files.blue, png(20, 120, 220)); fs.writeFileSync(files.red, png(200, 30, 80)); fs.writeFileSync(files.green, png(30, 160, 90));
fs.writeFileSync(path.join(HERE, 'test-cv.pdf'), '%PDF-1.4\n1 0 obj<<>>endobj\n% test cv\n');

async function page(url, fn, { width = 1440, height = 900 } = {}) {
  const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('ERR ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed'); return r.result.result.value; };
  await send('Page.enable'); await send('DOM.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });

  const helpers = {
    ev, send, errors,
    goto: async (u, wait = 1800) => { await send('Page.navigate', { url: SITE + u }); await sleep(wait); },
    text: () => ev('document.body.innerText'),
    click: (selector) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('missing ' + ${JSON.stringify(selector)}); el.click(); return true })()`),
    // click the first button/link whose visible text matches
    clickText: (text, scope = 'button, a, [role=button]') => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(scope)})].find(e => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) throw new Error('no button: ' + ${JSON.stringify(text)}); el.click(); return true })()`),
    // set the value of the input labelled `label` (including the sr-only "(العربية)" / "(English)" labels)
    fill: (label, value) => ev(`(() => { const l = [...document.querySelectorAll('label')].find(x => x.textContent.trim().replace(/\\s*\\*$/, '').startsWith(${JSON.stringify(label)})); if (!l) throw new Error('no label ' + ${JSON.stringify(label)}); const el = document.getElementById(l.htmlFor); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement; Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true })()`),
    upload: async (selector, file, index = 0) => {
      const doc = await send('DOM.getDocument', { depth: -1 });
      const all = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector });
      await send('DOM.setFileInputFiles', { nodeId: all.result.nodeIds[index], files: [file] });
    },
    shot: async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(HERE, name), Buffer.from(r.result.data, 'base64')); },
  };
  await fn(helpers);
  if (errors.length) console.log('   console errors:', errors.slice(0, 3));
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`); ws.close();
  return errors;
}

const A = 'admin@lamico.test', PW = 'TestPassword-12345';
const cookieOf = async (email, pw) => { const r = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) }); return (r.headers.getSetCookie()[0] ?? '').split(';')[0]; };
const adminCookie = await cookieOf(A, PW);
const api = async (method, p, json) => { const r = await fetch(API + p, { method, headers: { Cookie: adminCookie, 'Content-Type': 'application/json' }, body: json ? JSON.stringify(json) : undefined }); return r.status === 204 ? null : r.json(); };
const login = async (h, email = A, pw = PW) => { await h.send('Network.enable'); await h.send('Network.clearBrowserCookies'); await h.goto('/admin/login', 1500); await h.fill('البريد الإلكتروني', email); await h.fill('كلمة السر', pw); await h.clickText('دخول', 'button[type=submit]'); await sleep(1800); };

console.log('── Login & guards');
await page('about:blank', async (h) => {
  await h.goto('/admin', 1800);
  ok('/admin without a session redirects to the login page', (await h.ev('location.pathname')) === '/admin/login');
  await h.fill('البريد الإلكتروني', A); await h.fill('كلمة السر', 'wrong-password-999');
  await h.clickText('دخول', 'button[type=submit]'); await sleep(1200);
  ok('wrong password shows an Arabic error (no raw backend text)', (await h.text()).includes('غير صحيحة'));
  await h.fill('كلمة السر', PW); await h.clickText('دخول', 'button[type=submit]'); await sleep(2200);
  ok('correct login lands on the dashboard', (await h.ev('location.pathname')) === '/admin' && (await h.text()).includes('إجمالي المنتجات'));
  const t = await h.text();
  ok('dashboard shows real totals (17 products, 3 water)', /17/.test(t) && t.includes('منتجات المياه'), t.slice(0, 200));
  ok('sidebar has the sector shortcuts + admin sections', ['كل المنتجات', 'ملصقات المياه', 'طلبات التوظيف', 'المستخدمون', 'مكتبة الوسائط'].every((x) => t.includes(x)));
  await h.shot('adm-dashboard.png');
});

console.log('── Products list');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/products?sector=water', 2000);
  let t = await h.text();
  ok('water filter lists the 3 sizes', t.includes('مياه القدس 1.5 لتر') && t.includes('مياه القدس 500 مل') && t.includes('مياه القدس 250 مل'));
  ok('reorder controls are shown for a full sector list', t.includes('اسحب الصفوف'));
  const before = (await api('GET', '/api/products?sector=water')).map((p) => p.slug);
  // move the first row down with the arrow button
  await h.ev(`document.querySelector('button[aria-label="نقل للأسفل"]').click()`); await sleep(1200);
  const after = (await api('GET', '/api/products?sector=water')).map((p) => p.slug);
  ok('the arrow button re-orders products on the public API', before[0] === after[1] && before[1] === after[0], JSON.stringify({ before, after }));
  await h.ev(`document.querySelector('button[aria-label="نقل للأعلى"]:not([disabled])').click()`); await sleep(1000);
  await h.goto('/admin/products?sector=food', 1800);
  t = await h.text();
  ok('food filter lists food products only', t.includes('خليط الزعتر الفلسطيني') && !t.includes('مياه القدس 250'));
  await h.shot('adm-products.png');
});

console.log('── Add a NEW water size (the main request)');
let newProduct;
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/products/new?sector=water', 2200);
  let t = await h.text();
  ok('water form pre-fills the category text and shows the labels section', t.includes('الملصقات') || t.includes('ملصقات هذا المنتج'));
  await h.clickText('إضافة المنتج');
  await sleep(500);
  ok('saving an empty form is blocked with a clear message', (await h.text()).includes('الاسم مطلوب'));
  await h.fill('اسم المنتج (العربية)', 'مياه القدس 2 لتر');
  await h.fill('اسم المنتج (English)', 'Al-Quds Water 2 L');
  await h.fill('الحجم (العربية)', '2 لتر'); await h.fill('الحجم (English)', '2 L');
  await h.fill('وصف مختصر (العربية)', 'حجم عائلي كبير للمنزل والمكتب'); await h.fill('وصف مختصر (English)', 'A large family size for home and office');
  await h.fill('الوصف الكامل (العربية)', 'مياه شرب معبأة نقية بحجم 2 لتر مناسبة للعائلات.'); await h.fill('الوصف الكامل (English)', 'Pure bottled drinking water in a 2 L bottle, ideal for families.');
  // upload the main image straight from the form
  await h.upload('input[type=file][accept^="image/jpeg"]', files.blue, 0);
  await sleep(1800);
  const imgValue = await h.ev(`[...document.querySelectorAll('input[aria-label="الصورة الرئيسية"]')][0]?.value`);
  ok('image uploaded from the product form fills the field with a /uploads/media URL', /^\/uploads\/media\/.+\.png$/.test(imgValue ?? ''), imgValue);
  await h.upload('input[type=file][accept^="image/jpeg"]', files.green, 1);
  await sleep(1500);
  // a spec row
  await h.clickText('إضافة مواصفة');
  await h.fill('اسم المواصفة (العربية)', 'الوزن'); await h.fill('اسم المواصفة (English)', 'Weight');
  await h.fill('القيمة (العربية)', '2 كغ'); await h.fill('القيمة (English)', '2 kg');
  // pick the first label
  await h.ev(`document.querySelector('input[type=checkbox]').click()`);
  await h.shot('adm-product-form.png');
  await h.clickText('إضافة المنتج'); await sleep(2200);
  ok('after saving, the list for water opens', (await h.ev('location.pathname + location.search')).startsWith('/admin/products?sector=water'));
  t = await h.text();
  ok('the new size is in the admin list', t.includes('مياه القدس 2 لتر'));
});
const created = (await api('GET', '/api/admin/products?q=2%20L&sector=water')).items.find((p) => p.name.en === 'Al-Quds Water 2 L');
ok('stored in PostgreSQL with image, size, spec and label', !!created && created.image?.startsWith('/uploads/media/') && created.size.ar === '2 لتر' && created.specs.length === 1 && created.labelIds.length === 1 && created.status === 'published' && created.category.en === 'Bottled drinking water', JSON.stringify(created)?.slice(0, 300));
await page('about:blank', async (h) => {
  await h.goto('/en/water', 2200);
  const t = await h.text();
  ok('the new size appears on the PUBLIC English water page immediately', t.includes('Al-Quds Water 2 L') && t.includes('A large family size'));
  const imgOk = await h.ev(`(async () => { const img = [...document.images].find(i => i.alt === 'Al-Quds Water 2 L'); if (!img) return 'no img'; img.scrollIntoView(); await new Promise(r => setTimeout(r, 1200)); return img.complete && img.naturalWidth > 0 })()`);
  ok('...with its uploaded image actually loading', imgOk === true, imgOk);
  await h.goto('/ar/products/al-quds-water-2-l', 2000);
  ok('the product detail page works in Arabic', (await h.ev('document.querySelector("h1")?.textContent')) === 'مياه القدس 2 لتر' && (await h.text()).includes('الوزن'));
});
newProduct = created;

console.log('── Edit, hide and delete it');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto(`/admin/products/${newProduct.id}`, 2200);
  ok('edit form loads the saved values', (await h.ev(`(() => { const l = [...document.querySelectorAll('label')].find(x => x.textContent.startsWith('اسم المنتج (العربية)')); return document.getElementById(l.htmlFor).value })()`)) === 'مياه القدس 2 لتر');
  await h.fill('الوصف الكامل (العربية)', 'نص محدّث من لوحة التحكم');
  await h.clickText('حفظ التعديلات'); await sleep(1800);
  ok('edit saved', (await api('GET', `/api/admin/products/${newProduct.id}`)).description.ar === 'نص محدّث من لوحة التحكم');
  await h.goto('/admin/products?sector=water', 2000);
  await h.ev(`[...document.querySelectorAll('tr')].find(r => r.textContent.includes('2 لتر')).querySelector('button[aria-label="إخفاء"]').click()`); await sleep(1200);
  ok('the eye button hides it from the public site', (await fetch(API + '/api/products/al-quds-water-2-l')).status === 404);
  await h.ev(`[...document.querySelectorAll('tr')].find(r => r.textContent.includes('2 لتر')).querySelector('button[aria-label="حذف"]').click()`); await sleep(600);
  ok('delete asks for confirmation', (await h.text()).includes('حذف المنتج؟'));
  await h.clickText('حذف', '[role=dialog] button'); await sleep(1500);
  ok('confirmed delete removes it', (await fetch(API + '/api/admin/products/' + newProduct.id, { headers: { Cookie: adminCookie } })).status === 404);
});

console.log('── Water labels');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/water-labels', 1800);
  await h.clickText('إضافة ملصق'); await sleep(400);
  await h.fill('اسم الملصق (العربية)', 'ملصق الاختبار'); await h.fill('اسم الملصق (English)', 'Test label');
  await h.upload('[role=dialog] input[type=file]', files.red, 0); await sleep(1600);
  await h.clickText('حفظ', '[role=dialog] button'); await sleep(1500);
  ok('label added with an uploaded image', (await h.text()).includes('ملصق الاختبار'));
  const labels = await (await fetch(API + '/api/water/labels')).json();
  ok('and it is public', labels.some((l) => l.name.en === 'Test label' && l.image?.startsWith('/uploads/media/')));
  await h.shot('adm-labels.png');
});

console.log('── Media library');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/media', 1800);
  await h.upload('input[type=file][multiple]', files.green, 0); await sleep(2000);
  ok('uploading from the media page adds a card', (await h.text()).includes('e2e-green.png'));
  await h.ev(`[...document.querySelectorAll('li button')].find(b => b.textContent.includes('e2e-green.png')).click()`); await sleep(600);
  ok('clicking opens the details dialog with the URL', (await h.ev(`document.querySelector('[role=dialog] input[readonly]')?.value`))?.startsWith('/uploads/media/'));
  await h.shot('adm-media.png');
});

console.log('── Inbox: messages, applications, notifications');
await fetch(API + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'زائر الموقع', email: 'v@example.com', phone: '0591112233', subject: 'شراكة', message: 'رسالة جديدة من نموذج التواصل للاختبار' }) });
const form = new FormData();
for (const [k, v] of Object.entries({ fullName: 'متقدم اختبار', phone: '+970 59 555 1212', email: 'cand@example.com', city: 'نابلس', position: 'محاسب', education: 'بكالوريوس', experience: 'خمس سنوات', message: '', linkedin: '', portfolio: '' })) form.append(k, v);
form.append('cv', new Blob([fs.readFileSync(path.join(HERE, 'test-cv.pdf'))], { type: 'application/pdf' }), 'cv.pdf');
await fetch(API + '/api/jobs/general/apply', { method: 'POST', body: form });
await page('about:blank', async (h) => {
  await login(h);
  const bell = await h.ev(`document.querySelector('button[aria-label^="الإشعارات"]')?.getAttribute('aria-label')`);
  ok('the bell shows the unread count', /\(2 جديد\)/.test(bell ?? ''), bell);
  await h.click('button[aria-label^="الإشعارات"]'); await sleep(500);
  ok('the dropdown lists both events', (await h.text()).includes('رسالة تواصل جديدة') && (await h.text()).includes('طلب توظيف جديد'));
  await h.clickText('طلب توظيف جديد', 'button'); await sleep(2000);
  ok('clicking a notification opens that application', (await h.text()).includes('متقدم اختبار') && (await h.ev(`!!document.querySelector('[role=dialog]')`)));
  ok('the CV download link points to the protected endpoint', (await h.ev(`document.querySelector('[role=dialog] a[download]')?.getAttribute('href')`))?.includes('/cv'));
  await h.ev(`(() => { const s = document.querySelector('[role=dialog] select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'shortlisted'); s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await sleep(1200);
  const apps = await api('GET', '/api/admin/applications');
  ok('changing the status in the dialog is saved', apps.items[0].status === 'shortlisted', apps.items[0].status);
  await h.shot('adm-application.png');
  await h.goto('/admin/messages', 2000);
  ok('messages page lists the new message; opening it shows the body + WhatsApp', (await h.text()).includes('زائر الموقع'));
  await h.clickText('زائر الموقع', 'li button'); await sleep(800);
  const t = await h.text();
  ok('message detail: full text, mailto and WhatsApp actions', t.includes('رسالة جديدة من نموذج التواصل') && t.includes('رد بالبريد') && t.includes('فتح المحادثة على واتساب'));
  await h.shot('adm-messages.png');
});
const notes = await api('GET', '/api/admin/notifications');
ok('opening items cleared their notifications', notes.unread === 0, String(notes.unread));

console.log('── Company, WhatsApp and homepage text reach the public site');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/company', 2200);
  await h.fill('الهاتف (للعرض)', '+970 9 111 2222');
  await h.clickText('حفظ التعديلات'); await sleep(1800);
  ok('company data saved', (await (await fetch(API + '/api/company')).json()).phoneDisplay === '+970 9 111 2222');
  await h.goto('/admin/whatsapp', 2000);
  await h.ev(`(() => { const l = [...document.querySelectorAll('label')].find(x => x.textContent.startsWith('الرقم (مع رمز الدولة)')); const el = document.getElementById(l.htmlFor); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '972500001111'); el.dispatchEvent(new Event('input', { bubbles: true })) })()`);
  await h.clickText('حفظ التعديلات'); await sleep(1800);
  ok('WhatsApp channel saved', Object.values((await (await fetch(API + '/api/company')).json()).whatsapp).some((c) => c.number === '972500001111'));
  await h.goto('/admin/home', 2000);
  await h.fill('عنوان الهيرو الرئيسي (العربية)', 'عنوان جديد من لوحة التحكم');
  await h.fill('عنوان الهيرو الرئيسي (English)', 'New title from the dashboard');
  await h.clickText('حفظ التعديلات'); await sleep(1800);
});
await page('about:blank', async (h) => {
  await h.goto('/en?introAt=12', 2600);
  ok('the homepage hero shows the title edited in the dashboard', (await h.text()).includes('New title from the dashboard'));
  await h.goto('/en/contact', 2200);
  ok('the contact page shows the new phone number', (await h.text()).includes('+970 9 111 2222'));
});

console.log('── Users & role gating in the UI');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/users', 2000);
  await h.clickText('إضافة مستخدم'); await sleep(400);
  await h.fill('الاسم', 'محرر المحتوى'); await h.fill('البريد الإلكتروني', 'editor@lamico.test'); await h.fill('كلمة السر', 'EditorPassword-123');
  await h.clickText('حفظ', '[role=dialog] button'); await sleep(1600);
  ok('an editor account was created', (await h.text()).includes('editor@lamico.test'));
});
await page('about:blank', async (h) => {
  await login(h, 'editor@lamico.test', 'EditorPassword-123');
  let t = await h.text();
  ok('editor sees content sections', t.includes('كل المنتجات') && t.includes('مكتبة الوسائط'));
  ok('editor does NOT see messages / applications / users / settings in the menu', !t.includes('طلبات التوظيف') && !t.includes('الرسائل') && !t.includes('المستخدمون') && !t.includes('إعدادات متقدمة'));
  await h.goto('/admin/messages', 1800);
  ok('typing /admin/messages as an editor bounces back to the dashboard', (await h.ev('location.pathname')) === '/admin');
  const denied = await fetch(API + '/api/admin/applications', { headers: { Cookie: await cookieOf('editor@lamico.test', 'EditorPassword-123') } });
  ok('...and the API refuses too (403)', denied.status === 403);
});

console.log('── Mobile layout');
await page('about:blank', async (h) => {
  await login(h);
  await h.goto('/admin/products?sector=water', 2000);
  const overflow = await h.ev('document.documentElement.scrollWidth <= innerWidth + 1');
  ok('no horizontal page overflow on a phone', overflow, await h.ev('document.documentElement.scrollWidth + " vs " + innerWidth'));
  await h.click('button[aria-label="فتح القائمة"]'); await sleep(500);
  ok('the menu opens as a drawer', (await h.text()).includes('لوحة المعلومات'));
  await h.shot('adm-mobile.png');
}, { width: 390, height: 844 });

console.log('\n' + (fail === 0 ? 'ALL PASSED' : 'FAILURES') + `: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
