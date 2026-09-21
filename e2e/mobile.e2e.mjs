// Usage: node mobile-sweep.mjs [base=http://localhost:5174]
// For every public route × language × viewport: horizontal overflow, offending elements, tiny tap targets,
// tiny fonts, iOS-zoom inputs, missing alt, console errors. Also opens the mobile menu.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const BASE = process.env.E2E_SITE ?? 'http://localhost:4173';
const SHOTDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-mobile-'));
const routes = [
  '', '/about', '/about/board', '/about/executive', '/about/chairman-message', '/about/gm-message', '/sectors', '/water', '/plastic', '/preforms', '/caps', '/products', '/products/al-quds-water-1-5l', '/products/preform-200ml',
  '/food', '/real-estate', '/real-estate/academy-house', '/careers', '/careers/accountant', '/contact', '/privacy', '/terms', '/does-not-exist',
];
const viewports = [
  { name: 'phone-360', width: 360, height: 740, mobile: true },
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const probe = (W) => `(() => {
  const vw = ${W};
  const clipped = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) return true; } return false; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const label = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '"');
  const out = { vw, docW: document.documentElement.scrollWidth, overflow: [], tap: [], font: [], inputs: [], alt: [], noViewport: !document.querySelector('meta[name=viewport]') };
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if ((r.right > vw + 1 || r.left < -1) && s.position !== 'fixed' && !clipped(el) && out.overflow.length < 6) out.overflow.push(label(el) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
    if (/^(A|BUTTON)$/.test(el.tagName) || el.getAttribute('role') === 'button') {
      const inline = s.display === 'inline' && el.closest('p,li,span,h1,h2,h3');
      if (!inline && !el.classList.contains('sr-only') && (r.width < 32 || r.height < 32) && out.tap.length < 8) out.tap.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio' && parseFloat(s.fontSize) < 16) out.inputs.push(label(el) + ' ' + s.fontSize);
    if (el.tagName === 'IMG' && !el.hasAttribute('alt')) out.alt.push(el.src.split('/').pop());
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 11.5 && out.font.length < 5) out.font.push(label(el) + ' ' + s.fontSize);
  }
  return out;
})()`;

async function open(vp, url) {
  const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const issues = [];
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) return pending.get(m.id)(m), pending.delete(m.id);
    if (m.method === 'Runtime.exceptionThrown') issues.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') issues.push('CONSOLE ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.result.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await send('Page.navigate', { url });
  return { send, ev, issues, sleep, close: async () => { await fetch(`http://127.0.0.1:9222/json/close/${target.id}`); ws.close(); } };
}

let bad = 0;
const summary = [];
for (const vp of viewports) {
  for (const lang of ['ar', 'en']) {
    for (const r of routes) {
      const url = `${BASE}/${lang}${r}?introAt=9`;
      const page = await open(vp, url);
      await sleep(2200);
      await page.ev(`(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,90))};scrollTo(0,0)})()`);
      await sleep(400);
      const res = await page.ev(probe(vp.width));
      const problems = [];
      if (res.docW > res.vw + 1) problems.push(`PAGE OVERFLOWS ${res.docW}>${res.vw}`);
      if (res.overflow.length) problems.push('offscreen: ' + res.overflow.join(' | '));
      if (res.tap.length) problems.push('tiny tap targets: ' + res.tap.join(' | '));
      if (res.inputs.length) problems.push('inputs <16px (iOS zoom): ' + [...new Set(res.inputs)].join(' | '));
      if (res.font.length) problems.push('tiny text: ' + res.font.join(' | '));
      if (res.alt.length) problems.push('img without alt: ' + res.alt.join(', '));
      if (res.noViewport) problems.push('no viewport meta');
      problems.push(...page.issues);
      const tag = `${vp.name} /${lang}${r}`;
      if (problems.length) { bad += 1; console.log(`✗ ${tag}`); problems.forEach((p) => console.log('    ' + p)); } else console.log(`✓ ${tag}`);
      summary.push({ tag, problems });
      await page.close();
    }
  }
}

// mobile menu
for (const lang of ['ar', 'en']) {
  const page = await open(viewports[1], `${BASE}/${lang}?introAt=9`);
  await sleep(2500);
  const opened = await page.ev(`(async()=>{const b=[...document.querySelectorAll('header button')].find(x=>/menu|قائمة|القائمة/i.test((x.getAttribute('aria-label')||'')+x.textContent)); if(!b) return 'NO MENU BUTTON'; b.click(); await new Promise(r=>setTimeout(r,700)); const links=[...document.querySelectorAll('nav a, [role=dialog] a, header a')].filter(a=>a.getBoundingClientRect().width>0).length; return 'opened, visible links: '+links+', docW='+document.documentElement.scrollWidth+'/'+innerWidth})()`);
  console.log(`menu /${lang}: ${opened}`);
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${SHOTDIR}/menu-${lang}.png`, Buffer.from(shot.result.data, 'base64'));
  await page.close();
}
console.log(bad ? `\n${bad} page/viewport combos with issues` : '\nAll clean');
fs.writeFileSync(SHOTDIR + '/mobile-summary.json', JSON.stringify(summary, null, 1));
process.exit(bad ? 1 : 0);
