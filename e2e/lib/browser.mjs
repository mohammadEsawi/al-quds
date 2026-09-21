// A tiny Chrome DevTools Protocol driver for the browser tests: real Chrome, real clicks, real network.
// Chrome must be running with --remote-debugging-port=9222 (e2e/run.mjs starts it for you).
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const DEBUG = process.env.E2E_DEBUG_PORT ?? '9222';

let passed = 0;
let failed = 0;
const failures = [];

export function ok(name, condition, detail = '') {
  if (condition) passed += 1;
  else {
    failed += 1;
    failures.push(`${name}${detail ? `  → ${String(detail).slice(0, 220)}` : ''}`);
  }
  console.log(`${condition ? '✓' : '✗'} ${name}${!condition && detail ? `  → ${String(detail).slice(0, 220)}` : ''}`);
}

export function finish() {
  console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}: ${passed} passed, ${failed} failed`);
  failures.forEach((f) => console.log(` - ${f}`));
  process.exit(failed ? 1 : 0);
}

/**
 * Opens a tab, runs `fn(helpers)`, closes the tab and returns the console errors it saw.
 * Helpers: goto, text, click, clickText, fill, select, waitFor, ev, send, shot.
 */
export async function withPage(site, fn, { width = 1440, height = 900 } = {}) {
  const target = await (await fetch(`http://127.0.0.1:${DEBUG}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(`EXC ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (!/status of 401/.test(text)) errors.push(`ERR ${text.slice(0, 200)}`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description?.split('\n')[0] ?? 'evaluation failed');
    return r.result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });

  const q = JSON.stringify;
  const helpers = {
    ev,
    send,
    errors,
    goto: async (path, wait = 1800) => {
      await send('Page.navigate', { url: site + path });
      await sleep(wait);
    },
    text: () => ev('document.body.innerText'),
    path: () => ev('location.pathname + location.search'),
    click: (selector) => ev(`(() => { const el = document.querySelector(${q(selector)}); if (!el) throw new Error('missing ' + ${q(selector)}); el.click(); return true })()`),
    clickText: (text, scope = 'button, a, [role=button]') =>
      ev(`(() => { const el = [...document.querySelectorAll(${q(scope)})].find((e) => e.textContent.trim().includes(${q(text)})); if (!el) throw new Error('no element with text ' + ${q(text)}); el.click(); return true })()`),
    /** Types into the control whose <label> starts with `label` (works with React-controlled inputs). */
    fill: (label, value) =>
      ev(`(() => {
        const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim().replace(/\\s*\\*$/, '').startsWith(${q(label)}));
        if (!l) throw new Error('no label ' + ${q(label)});
        const el = document.getElementById(l.htmlFor);
        if (!el) throw new Error('label without control: ' + ${q(label)});
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${q(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`),
    select: (selector, value) =>
      ev(`(() => { const el = document.querySelector(${q(selector)}); if (!el) throw new Error('missing ' + ${q(selector)}); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${q(value)}); el.dispatchEvent(new Event('change', { bubbles: true })); return true })()`),
    /** Attaches a local file to the (possibly hidden) file input matching `selector`. */
    upload: async (selector, file, index = 0) => {
      const doc = await send('DOM.getDocument', { depth: -1 });
      const all = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector });
      await send('DOM.setFileInputFiles', { nodeId: all.result.nodeIds[index], files: [file] });
    },
    waitFor: async (expression, ms = 8000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        try {
          if (await ev(expression)) return true;
        } catch {
          /* page still loading */
        }
        await sleep(100);
      }
      return false;
    },
  };
  await fn(helpers);
  await fetch(`http://127.0.0.1:${DEBUG}/json/close/${target.id}`);
  ws.close();
  return errors;
}
