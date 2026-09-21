// Small helpers shared by the API suites.
export const BASE = process.env.TEST_API_URL ?? 'http://localhost:4001';
export const API = `${BASE}/api`;
/** The browser origin the API trusts (CLIENT_URL). */
export const ORIGIN = process.env.TEST_ORIGIN ?? 'http://localhost:5173';
export const ADMIN = { email: 'admin@lamico.test', password: 'TestPassword-12345' };
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;
const failures = [];

export function check(name, condition, detail = '') {
  if (condition) passed += 1;
  else {
    failed += 1;
    failures.push(`${name}${detail ? `  → ${String(detail).slice(0, 240)}` : ''}`);
  }
  console.log(`${condition ? '✓' : '✗'} ${name}${!condition && detail ? `  → ${String(detail).slice(0, 240)}` : ''}`);
}

export function finish() {
  console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log(` - ${f}`));
  process.exit(failed ? 1 : 0);
}

/** JSON/multipart request against the API. `cookie: null` means "no session". */
export async function call(path, { method = 'GET', body, cookie, headers = {}, form } = {}) {
  const h = { origin: ORIGIN, ...headers };
  if (cookie) h.cookie = cookie;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    h['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers: h, body: payload });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, text, headers: res.headers };
}

export const sessionCookie = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).find((c) => c.startsWith('lamico_token=')) ?? null;

export const login = (email = ADMIN.email, password = ADMIN.password) => call('/auth/login', { method: 'POST', body: { email, password } });

/** Logs in and returns the session cookie. */
export async function session(email, password) {
  const res = await login(email, password);
  return sessionCookie(res);
}

export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
export const pdf = (extra = '') => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}\ntrailer<<>>\n%%EOF`);

export function applicationForm(over = {}, file = { buf: pdf(), name: 'cv.pdf', type: 'application/pdf' }) {
  const form = new FormData();
  const fields = { fullName: 'Feature Tester', phone: '0591234567', email: 'feature@example.com', city: 'Nablus', position: 'QA Engineer', education: 'BSc', experience: 'Five years of careful testing', ...over };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append('cv', new Blob([file.buf], { type: file.type }), file.name);
  return form;
}
