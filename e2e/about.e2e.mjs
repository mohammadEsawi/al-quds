// Real-browser tests: "About the company" tabs on the homepage and in the navbar, the three pages, the executive
// page with eight people, and adding a photo + a message from the dashboard.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { finish, ok, sleep, withPage } from './lib/browser.mjs';

const SITE = process.env.E2E_SITE ?? 'http://localhost:4173';
const ADMIN = { email: 'admin@lamico.test', password: 'TestPassword-12345' };

// a small real PNG to upload as a portrait
function png() {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let x = 0xffffffff; for (const b of buf) x = crcTable[(x ^ b) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(80, 0); ihdr.writeUInt32BE(100, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: 80 }, () => [40, 110, 180]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: 100 }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const portrait = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-about-')), 'portrait.png');
fs.writeFileSync(portrait, png());

console.log('── Public: tabs, pages, navbar');
await withPage(SITE, async (h) => {
  await h.goto('/ar?introAt=9', 3000);
  const home = await h.text();
  ok('the homepage has the About section with the company name', home.includes('لاميكو للاستثمار الصناعي والتوريدات'));
  ok('…the three small tabs', ['عن شركة لاميكو للاستثمار الصناعي والتوريدات', 'مجلس الإدارة', 'الإدارة التنفيذية'].every((x) => home.includes(x)));
  ok('…and both messages with a short excerpt, the name and a read-more link', ['كلمة رئيس مجلس الإدارة', 'كلمة المدير العام', 'رامي أسعد عيساوي', 'لامي أسعد عيساوي', 'ننظر إلى الاستثمار بوصفه مسؤولية', 'نؤمن في لاميكو'].every((x) => home.includes(x)) && (await h.ev(`document.querySelectorAll('#about a[href$="-message"]').length`)) === 2);
  ok('the excerpt is short — only the first paragraph', !home.includes('وستواصل لاميكو مسيرتها') && !home.includes('إن رؤيتنا للمستقبل'));
  ok('the portraits beside the messages are small', (await h.ev(`Math.max(...[...document.querySelectorAll('#about article [role=img]')].map(e => e.getBoundingClientRect().width))`)) <= 100);

  await h.click('#about a[href="/ar/about/board"]');
  ok('the Board tab opens the board page with the chairman and his experience', await h.waitFor(`location.pathname === '/ar/about/board' && document.body.innerText.includes('رامي أسعد عيساوي') && document.body.innerText.includes('25 عامًا')`));
  ok('…and a short message card leading to the full message', (await h.ev(`!!document.querySelector('main a[href="/ar/about/chairman-message"]')`)));
  await h.goto('/ar?introAt=9', 2500);
  await h.click('#about a[href="/ar/about/chairman-message"]');
  ok('"read the full message" opens the chairman message page', await h.waitFor(`location.pathname === '/ar/about/chairman-message' && document.querySelector('h1')?.innerText.includes('كلمة رئيس مجلس الإدارة')`));
  await h.waitFor(`document.body.innerText.includes('وستواصل لاميكو مسيرتها') && !!document.querySelector('main a[href="/ar/about/gm-message"]')`, 8000);
  const msg = await h.text();
  ok('…with all three paragraphs and the signature', msg.includes('ننظر إلى الاستثمار') && msg.includes('نعمل على ترسيخ مكانة الشركة') && msg.includes('وستواصل لاميكو مسيرتها') && msg.includes('رامي أسعد عيساوي') && msg.includes('رئيس مجلس الإدارة'));
  await h.click('main a[href="/ar/about/gm-message"]');
  ok('…and a link to the other message', await h.waitFor(`location.pathname === '/ar/about/gm-message' && document.body.innerText.includes('إن رؤيتنا للمستقبل') && document.body.innerText.includes('المدير العام')`));
  await h.goto('/ar?introAt=9', 2500);
  await h.click('#about a[href="/ar/about/executive"]');
  ok('the Executive tab opens the executive page with all eight people', await h.waitFor(`location.pathname === '/ar/about/executive' && document.querySelectorAll('main article').length === 8`, 8000));
  const exec = await h.text();
  ok('names, titles and experience are shown', ['لامي أسعد عيساوي', 'المدير العام', 'مدير المبيعات', 'وسيم عثمان شنابلي', 'جامعة بيرزيت', 'هندسة الحاسوب', 'هيا هشام عيساوي', 'مديرة دائرة الجودة', 'أمير عباس عيساوي', 'مدير الحسابات'].every((x) => exec.includes(x)));
  ok('each person has a portrait frame (silhouette until photos are added)', (await h.ev(`document.querySelectorAll('main article [role=img]').length`)) === 8);
  await h.ev(`window.scrollTo(0, document.body.scrollHeight)`);
  await sleep(1500);
  ok('the last person eases in on scroll (visible after scrolling)', (await h.ev(`getComputedStyle(document.querySelectorAll('main article h2')[7].parentElement).opacity`)) === '1');
  ok('the tab bar marks the current page', (await h.ev(`document.querySelector('main nav a[aria-current="page"], nav[aria-label="أقسام صفحات عن الشركة"] a[aria-current="page"]')?.textContent.trim()`)) === 'الإدارة التنفيذية');
  ok('the general manager row links to his message', (await h.ev(`!!document.querySelector('main article a[href="/ar/about/gm-message"]')`)));
  ok('the navbar has an About dropdown with the three pages', (await h.ev(`['/ar/about','/ar/about/board','/ar/about/executive'].every(p => !!document.querySelector('header a[href="'+p+'"]'))`)));

  await h.goto('/ar/about', 2500);
  const about = await h.text();
  const aboutMain = await h.ev(`document.querySelector('main').innerText`);
  ok('the About page has the five paragraphs, vision, mission and eight numbered goals', about.includes('تعد شركة لاميكو') && about.includes('رائدة في الاستثمار الصناعي والتوريدات') && about.includes('بناء أعمال صناعية واستثمارية مستدامة') && (await h.ev(`document.querySelectorAll('#goals ol > li').length`)) === 8);
  ok('the About page no longer shows the old claims (founding year, milestones, ISO)', !/2005|ISO|HACCP|محطات/.test(aboutMain));
}).then((errors) => ok('public About pages: no console errors', errors.length === 0, errors.join(' | ')));

console.log('── Navbar dropdowns close after a choice');
await withPage(SITE, async (h) => {
  await h.goto('/ar?introAt=9', 3000);
  // the dropdown panel that contains the link `href`
  const panel = (href) => `(() => { const a = document.querySelector('header ul a[href="${href}"]'); return a.closest('ul').parentElement; })()`;
  const shown = (href) => h.ev(`(() => { const p = ${panel(href)}; const c = getComputedStyle(p); return c.visibility === 'visible' && Number(c.opacity) > 0.9; })()`);
  const center = (selector) => h.ev(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  const move = async (selector) => { const [x, y] = await center(selector); await h.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); };
  const click = async (selector) => { const [x, y] = await center(selector); for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await h.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };

  ok('the menus start closed', !(await shown('/ar/about/board')) && !(await shown('/ar/plastic')));

  await move('header a[href="/ar/about"]');
  ok('hovering "About the company" opens its menu', await h.waitFor(`(() => { const c = getComputedStyle(${panel('/ar/about/board')}); return c.visibility === 'visible' && Number(c.opacity) > 0.9; })()`, 3000));
  await move('header ul a[href="/ar/about/board"]');
  await sleep(400);
  ok('it stays open while moving down to an item', await shown('/ar/about/board'));
  await click('header ul a[href="/ar/about/board"]');
  ok('choosing an item opens that page', await h.waitFor(`location.pathname === '/ar/about/board'`, 5000));
  await sleep(800);
  ok('…and the menu closes even though the pointer is still over it', !(await shown('/ar/about/board')));

  await move('header a[href="/ar/sectors"]');
  ok('hovering "Sectors" opens the sectors menu', await h.waitFor(`(() => { const c = getComputedStyle(${panel('/ar/plastic')}); return c.visibility === 'visible' && Number(c.opacity) > 0.9; })()`, 3000));
  await click('header ul a[href="/ar/plastic"]');
  ok('choosing a sector opens it', await h.waitFor(`location.pathname === '/ar/plastic'`, 5000));
  await sleep(800);
  ok('…and its menu closes too', !(await shown('/ar/plastic')));

  await h.ev(`document.querySelector('header a[href="/ar/about"]').focus()`);
  ok('keyboard focus on the trigger opens the menu', await h.waitFor(`(() => { const c = getComputedStyle(${panel('/ar/about/board')}); return c.visibility === 'visible' && Number(c.opacity) > 0.9; })()`, 3000));
  await h.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);
  ok('Escape closes it', !(await shown('/ar/about/board')));

  await h.ev(`document.querySelector('header a[href="/ar/about"]').focus()`);
  await sleep(300);
  await h.ev(`document.querySelector('main').focus?.(); document.body.focus(); document.activeElement.blur()`);
  await sleep(500);
  ok('moving focus away closes it', !(await shown('/ar/about/board')));
}).then((errors) => ok('navbar: no console errors', errors.length === 0, errors.join(' | ')));

await withPage(SITE, async (h) => {
  await h.goto('/en/about/executive', 3000);
  const t = await h.text();
  ok('English: executive page in English', t.includes('Executive Management') && t.includes('Lami Asaad Esawi') && t.includes('An-Najah National University'));
  await h.goto('/en/about', 2500);
  const a = await h.text();
  await h.goto('/en/about/chairman-message', 2500);
  const cm = await h.text();
  ok('English: chairman message page', cm.includes('Message from the Chairman') && cm.includes('Rami Asaad Esawi') && cm.includes('an opportunity to build lasting value'));
  ok('English: about page with the goals', a.includes('Strategic goals') && a.includes('National responsibility') && a.includes('Lamico for Industrial Investment and Supplies'));
  ok('English page is left-to-right', (await h.ev('document.documentElement.dir')) === 'ltr');
}).then((errors) => ok('English About pages: no console errors', errors.length === 0, errors.join(' | ')));

await withPage(SITE, async (h) => {
  await h.goto('/ar/about/executive', 2500);
  ok('phone: the executive page has no horizontal overflow', (await h.ev('document.documentElement.scrollWidth <= innerWidth + 1')));
  await h.goto('/ar', 2500);
  ok('phone: the homepage has no horizontal overflow', (await h.ev('document.documentElement.scrollWidth <= innerWidth + 1')));
  await h.goto('/ar/about/chairman-message', 2500);
  ok('phone: the message page has no horizontal overflow', (await h.ev('document.documentElement.scrollWidth <= innerWidth + 1')));
}, { width: 390, height: 800 });

console.log('── Dashboard: add a photo and a message');
await withPage(SITE, async (h) => {
  await h.send('Network.clearBrowserCookies');
  await h.goto('/admin/login', 1500);
  await h.fill('البريد الإلكتروني', ADMIN.email);
  await h.fill('كلمة السر', ADMIN.password);
  await h.clickText('دخول', 'button[type=submit]');
  await h.waitFor(`location.pathname === '/admin'`, 10000);

  await h.goto('/admin/team', 2500);
  const list = await h.text();
  ok('the team page lists both groups and all nine people', list.includes('مجلس الإدارة') && list.includes('الإدارة التنفيذية') && list.includes('لامي أسعد عيساوي') && list.includes('رامي أسعد عيساوي'));
  ok('people without a photo are flagged', (list.match(/بدون صورة/g) ?? []).length >= 9);

  await h.clickText('لامي أسعد عيساوي', 'li');
  await h.ev(`(() => { const li = [...document.querySelectorAll('li')].find(e => e.textContent.includes('لامي أسعد عيساوي')); li.querySelector('button[aria-label="تعديل"]').click(); })()`);
  ok('the edit window opens with the current details', await h.waitFor(`document.body.innerText.includes('الخبرات والمؤهلات') && document.querySelectorAll('[role=dialog] textarea').length >= 3`));
  await h.upload('[role=dialog] input[type=file]', portrait);
  ok('the portrait uploads and previews', await h.waitFor(`!!document.querySelector('[role=dialog] img[src^="/uploads/media/"]')`, 10000));
  await h.fill('الكلمة (العربية)', 'كلمة المدير العام التجريبية');
  await h.fill('الكلمة (English)', 'The general manager test message');
  await h.clickText('حفظ', '[role=dialog] button');
  ok('saving works', await h.waitFor(`document.body.innerText.includes('تم الحفظ')`));

  await h.goto('/ar/about/executive', 3000);
  ok('the photo shows on the executive page', (await h.ev(`!!document.querySelector('main article img[alt="لامي أسعد عيساوي"][src^="/uploads/media/"]')`)));
  await h.goto('/ar?introAt=9', 3000);
  ok('the photo and the message show on the homepage', (await h.ev(`!!document.querySelector('#about img[src^="/uploads/media/"]')`)) && (await h.text()).includes('كلمة المدير العام التجريبية'));

  await h.goto('/admin/about', 2500);
  ok('the About-page editor shows the five paragraphs and eight goals', (await h.ev(`document.querySelectorAll('textarea').length`)) >= 5 + 8 + 2);
  await h.goto('/admin', 3500);
  ok('the checklist reflects the team status', (await h.text()).includes('صور الإدارة'));
}).then((errors) => ok('dashboard team pages: no console errors', errors.length === 0, errors.join(' | ')));

finish();
