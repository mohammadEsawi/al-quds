const BASE = process.env.TEST_API_URL ?? 'http://localhost:4001';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✓' : '✗'} ${name}${!cond && extra ? '  → ' + extra : ''}`); };

async function call(method, path, { json, form, cookie, raw } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body, redirect: 'manual' });
  if (raw) return res;
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}
const login = async (email, password) => {
  const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.getSetCookie?.()[0] ?? '').split(';')[0];
  return { status: res.status, cookie };
};
const pdf = (extra = '') => new Blob([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n' + extra)], { type: 'application/pdf' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const appForm = (over = {}, file = pdf(), name = 'cv.pdf') => {
  const f = new FormData();
  const fields = { fullName: 'Test Applicant', phone: '+970 59 111 2222', email: 'a@b.co', city: 'Nablus', position: 'Accountant', education: 'BSc', experience: '3 years', message: '', linkedin: '', portfolio: '', ...over };
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  if (file) f.append('cv', file, name);
  return f;
};

console.log('── PUBLIC API');
let r = await call('GET', '/api/health');
ok('health', r.data.status === 'ok');
r = await call('GET', '/api/company');
ok('company: bilingual + whatsapp channels', r.data.name?.ar === 'شركة لاميكو الاستثمارية' && r.data.whatsapp?.water?.number && r.data.whatsapp?.realEstate && r.data.stats?.length === 4 && r.data.cities?.length === 22, JSON.stringify(Object.keys(r.data.whatsapp ?? {})));
ok('company: legacy logo path kept', r.data.logo === '/assets/branding/lamico-logo.webp');
r = await call('GET', '/api/sectors');
ok('sectors: 7 ordered', r.data.length === 7 && r.data[0].key === 'water' && r.data[6].key === 'investment');
r = await call('GET', '/api/products');
const all = r.data;
ok('products: 17', all.length === 17);
ok('products: same shape as website (name/category/size/tag/gallery)', all[0].name.en === 'Al-Quds Water 1.5 L' && all[0].size?.ar === '1.5 لتر' && all[0].tag?.ar === 'الأكثر مبيعاً' && all[0].gallery.length === 2 && all[0].isPlaceholder === false && all[0].sector === 'water');
r = await call('GET', '/api/products?sector=water');
ok('products?sector=water → 3', r.data.length === 3);
r = await call('GET', '/api/products?featured=true&sector=food');
ok('products?featured=true&sector=food → 3', r.data.length === 3);
r = await call('GET', '/api/products?sector=bogus');
ok('invalid sector → 400 VALIDATION_ERROR', r.status === 400 && r.data.error.code === 'VALIDATION_ERROR');
for (const [s, n] of [['water', 3], ['plastic', 0], ['preforms', 3], ['caps', 3], ['food', 8]]) {
  r = await call('GET', `/api/${s}`);
  ok(`/api/${s} → ${n}`, r.status === 200 && r.data.length === n, String(r.data?.length));
}
r = await call('GET', '/api/products/al-quds-water-500ml');
ok('product by slug', r.status === 200 && r.data.size.en === '500 ml');
r = await call('GET', '/api/products/does-not-exist');
ok('unknown product → 404', r.status === 404 && r.data.error.code === 'PRODUCT_NOT_FOUND');
r = await call('GET', '/api/water/labels');
ok('water labels (2)', r.data.length === 2 && r.data[0].active === true);
r = await call('GET', '/api/real-estate');
ok('real estate list', r.data.length === 1 && r.data[0].slug === 'academy-house' && r.data[0].status === 'construction' && r.data[0].gallery.length === 5 && r.data[0].description.length === 2);
r = await call('GET', '/api/real-estate/academy-house');
ok('real estate by slug (tagline, features)', r.data.tagline?.ar === 'يعيش وعيساوي' && r.data.features.length === 4);
r = await call('GET', '/api/jobs');
ok('jobs: 4 open sample jobs', r.data.length === 4 && r.data.every((j) => j.isPlaceholder === true && j.employmentType === 'fullTime'));
r = await call('GET', '/api/jobs/accountant');
ok('job by slug', r.status === 200 && r.data.title.en === 'Accountant');
r = await call('GET', '/api/settings/water.overview');
ok('public setting: water.overview', r.status === 200 && r.data.specs?.length === 4);
r = await call('GET', '/api/settings/legal.privacy');
ok('public setting: legal.privacy', r.data.sections?.length >= 6);
r = await call('GET', '/api/settings/whatever');
ok('non-whitelisted setting → 404', r.status === 404);
r = await call('GET', '/api/nothing-here');
ok('unknown route → 404 JSON', r.status === 404 && r.data.error.code === 'ROUTE_NOT_FOUND');

console.log('── CONTACT');
r = await call('POST', '/api/contact', { json: { name: 'محمد أحمد', email: 'm@example.com', phone: '0597959536', subject: 'شراكة', message: 'أرغب بمعرفة تفاصيل التوزيع في نابلس' } });
ok('contact: 201 (Arabic text stored)', r.status === 201 && r.data.ok);
r = await call('POST', '/api/contact', { json: { name: 'x', email: 'bad', message: 'short' } });
ok('contact: invalid → 400 with field errors', r.status === 400 && r.data.error.details.length >= 3);
r = await call('POST', '/api/contact', { json: { name: 'Bot', email: 'b@b.co', message: 'this is spam message', website: 'http://spam' } });
ok('contact: honeypot filled → rejected', r.status === 400);
r = await call('POST', '/api/contact', { json: '{bad' });
ok('contact: malformed JSON → 400', r.status === 400);

console.log('── AUTH & ROLES');
r = await call('GET', '/api/admin/dashboard');
ok('admin without login → 401', r.status === 401);
let l = await login('admin@lamico.test', 'wrong-password-123');
ok('wrong password → 401', l.status === 401);
l = await login('nobody@lamico.test', 'whatever-password-1');
ok('unknown email → 401 (same response)', l.status === 401);
l = await login('admin@lamico.test', 'TestPassword-12345');
const admin = l.cookie;
ok('login sets httpOnly cookie', l.status === 200 && admin.startsWith('lamico_token='));
r = await call('GET', '/api/auth/me', { cookie: admin });
ok('me → SUPER_ADMIN', r.data.user.role === 'SUPER_ADMIN');
r = await call('GET', '/api/admin/dashboard', { cookie: admin });
ok('dashboard totals', r.status === 200 && r.data.totals.products === 17 && r.data.totals.waterProducts === 3 && r.data.totals.plasticProducts === 6 && r.data.totals.foodProducts === 8 && r.data.totals.unreadMessages === 1 && r.data.activity.messages.length === 14, JSON.stringify(r.data.totals));

console.log('── ADMIN: PRODUCTS');
r = await call('POST', '/api/admin/products', { cookie: admin, json: { sector: 'water', name: { ar: 'مياه القدس 2 لتر', en: 'Al-Quds Water 2 L' }, shortDescription: { ar: 'حجم جديد', en: 'New size' }, description: { ar: 'وصف', en: 'Description' }, size: { ar: '2 لتر', en: '2 L' }, gallery: ['/assets/water/water-1-5l.webp'], specs: [{ label: { ar: 'الوزن', en: 'Weight' }, value: { ar: '2 كغ', en: '2 kg' } }] } });
const pid = r.data.id;
ok('create product (only required fields) → 201 + generated slug', r.status === 201 && r.data.slug === 'al-quds-water-2-l' && r.data.status === 'published' && r.data.gallery.length === 1, JSON.stringify(r.data).slice(0, 200));
r = await call('GET', '/api/products?sector=water');
ok('new size appears on the public site with no code change', r.data.length === 4 && r.data.at(-1).slug === 'al-quds-water-2-l');
r = await call('POST', '/api/admin/products', { cookie: admin, json: { sector: 'water', slug: 'al-quds-water-2-l', name: { ar: 'م', en: 'x' }, shortDescription: { ar: 'م', en: 'x' }, description: { ar: 'م', en: 'x' } } });
ok('explicit duplicate slug gets a unique slug automatically', r.status === 201 && r.data.slug === 'al-quds-water-2-l-2');
const dupId = r.data.id;
r = await call('PUT', `/api/admin/products/${dupId}`, { cookie: admin, json: { slug: 'al-quds-water-2-l' } });
ok('changing to a taken slug → 409', r.status === 409 && r.data.error.code === 'SLUG_TAKEN');
r = await call('PUT', `/api/admin/products/${pid}`, { cookie: admin, json: { status: 'hidden', featured: true, gallery: ['/assets/water/water-500ml.webp', '/assets/water/water-250ml.webp'], sortOrder: 99 } });
ok('update: hide + feature + replace gallery', r.status === 200 && r.data.status === 'hidden' && r.data.featured && r.data.gallery.length === 2 && r.data.sortOrder === 99);
r = await call('GET', '/api/products/al-quds-water-2-l');
ok('hidden product is not public', r.status === 404);
r = await call('GET', '/api/admin/products?status=hidden', { cookie: admin });
ok('admin list shows hidden (+pagination)', r.data.items.some((p) => p.id === pid) && r.data.total >= 1 && r.data.page === 1);
r = await call('GET', '/api/admin/products?q=%D8%A7%D9%84%D9%82%D8%AF%D8%B3&sector=water', { cookie: admin });
ok('admin search in Arabic', r.data.total >= 3, String(r.data.total));
r = await call('POST', '/api/admin/products', { cookie: admin, json: { sector: 'nope' } });
ok('invalid product input → 400', r.status === 400);
r = await call('POST', '/api/admin/products', { cookie: admin, json: { sector: 'water', name: { ar: 'a', en: 'b' }, shortDescription: { ar: 'a', en: 'b' }, description: { ar: 'a', en: 'b' }, image: 'javascript:alert(1)' } });
ok('javascript: URL rejected', r.status === 400);
r = await call('POST', '/api/admin/products/reorder', { cookie: admin, json: { items: [{ id: pid, sortOrder: 1 }, { id: dupId, sortOrder: 2 }] } });
ok('reorder → 204', r.status === 204);
r = await call('DELETE', `/api/admin/products/${dupId}`, { cookie: admin });
ok('delete → 204', r.status === 204);
r = await call('DELETE', `/api/admin/products/${dupId}`, { cookie: admin });
ok('delete again → 404', r.status === 404);
r = await call('PUT', `/api/admin/products/${pid}`, { cookie: admin, json: { labelIds: ['does-not-exist'] } });
ok('bad label reference → 4xx (not 500)', r.status >= 400 && r.status < 500, String(r.status));

console.log('── ADMIN: LABELS, CATEGORIES, SECTORS');
r = await call('POST', '/api/admin/water/labels', { cookie: admin, json: { name: { ar: 'ملصق جديد', en: 'New label' }, image: '/uploads/media/x.png', active: true, sortOrder: 5 } });
const labelId = r.data.id;
ok('create water label', r.status === 201);
r = await call('PUT', `/api/admin/products/${pid}`, { cookie: admin, json: { labelIds: [labelId] } });
ok('assign label to product', r.data.labelIds?.[0] === labelId);
r = await call('PUT', `/api/admin/water/labels/${labelId}`, { cookie: admin, json: { name: { ar: 'ملصق', en: 'Label X' }, image: null, active: false, sortOrder: 5 } });
r = await call('GET', '/api/water/labels');
ok('deactivated label hidden from public', r.data.length === 2);
r = await call('POST', '/api/admin/categories', { cookie: admin, json: { slug: 'test-cat', sector: 'food', name: { ar: 'تجريبي', en: 'Test' }, sortOrder: 0 } });
ok('create category', r.status === 201);
const catId = r.data.id;
r = await call('POST', '/api/admin/categories', { cookie: admin, json: { slug: 'test-cat', sector: 'food', name: { ar: 'تجريبي', en: 'Test' }, sortOrder: 0 } });
ok('duplicate category slug → 409', r.status === 409);
await call('DELETE', `/api/admin/categories/${catId}`, { cookie: admin });
r = await call('GET', '/api/admin/sectors', { cookie: admin });
const sec = r.data.find((s) => s.key === 'plastic');
r = await call('PUT', `/api/admin/sectors/${sec.id}`, { cookie: admin, json: { description: { ar: 'وصف محدّث', en: 'Updated description' } } });
ok('update sector text', r.status === 200 && r.data.description.en === 'Updated description');

console.log('── ADMIN: REAL ESTATE & JOBS');
r = await call('POST', '/api/admin/real-estate', { cookie: admin, json: { name: { ar: 'مشروع جديد', en: 'New Project' }, location: { ar: 'نابلس', en: 'Nablus' }, featuredImage: '/assets/real-estate/academy-house.webp', contactPhone: '+970597959536', whatsappNumber: '9720597959536' } });
ok('create real-estate project', r.status === 201 && r.data.slug === 'new-project');
const reId = r.data.id;
r = await call('PUT', `/api/admin/real-estate/${reId}`, { cookie: admin, json: { published: false } });
r = await call('GET', '/api/real-estate');
ok('unpublished project not public', r.data.length === 1);
r = await call('POST', '/api/admin/real-estate', { cookie: admin, json: { name: { ar: 'م', en: 'x' }, location: { ar: 'ن', en: 'y' }, featuredImage: '/a.png', contactPhone: 'abc', whatsappNumber: '123' } });
ok('bad phone / whatsapp → 400', r.status === 400);
await call('DELETE', `/api/admin/real-estate/${reId}`, { cookie: admin });

r = await call('POST', '/api/admin/jobs', { cookie: admin, json: { title: { ar: 'مهندس جودة', en: 'Quality Engineer' }, department: { ar: 'الجودة', en: 'Quality' }, location: { ar: 'نابلس', en: 'Nablus' }, description: { ar: 'وصف', en: 'Desc' }, responsibilities: [{ ar: 'م1', en: 'r1' }], deadline: '2099-12-31', employmentType: 'contract' } });
const jobId = r.data.id;
ok('create job (real ad)', r.status === 201 && r.data.employmentType === 'contract' && r.data.deadline === '2099-12-31' && r.data.status === 'open');
r = await call('GET', '/api/jobs');
ok('new job is public', r.data.length === 5);
r = await call('POST', '/api/admin/jobs', { cookie: admin, json: { title: { ar: 'قديمة', en: 'Expired job' }, department: { ar: 'أ', en: 'a' }, location: { ar: 'ن', en: 'n' }, description: { ar: 'و', en: 'd' }, deadline: '2001-01-01' } });
const expiredId = r.data.id;
r = await call('GET', '/api/jobs');
ok('job past its deadline is hidden', r.data.length === 5 && !r.data.some((j) => j.id === expiredId));

console.log('── APPLICATIONS (multipart + CV)');
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({ position: 'Quality Engineer' }) });
ok('apply with PDF → 201', r.status === 201 && r.data.ok, JSON.stringify(r.data));
const appId = r.data.id;
r = await call('POST', '/api/jobs/general/apply', { form: appForm({ fullName: 'متقدم عام', city: 'رام الله' }, pdf('general'), 'سيرة ذاتية.pdf') });
ok('general application with Arabic file name → 201', r.status === 201);
const generalId = r.data.id;
const exe = new Blob([Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)])], { type: 'application/pdf' });
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({}, exe, 'cv.pdf') });
ok('executable renamed .pdf → 400 INVALID_FILE_TYPE', r.status === 400 && r.data.error.code === 'INVALID_FILE_TYPE');
const html = new Blob(['<html><script>alert(1)</script></html>'], { type: 'application/pdf' });
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({}, html, 'cv.pdf') });
ok('HTML disguised as PDF → 400', r.status === 400);
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({}, new Blob([Buffer.alloc(6 * 1024 * 1024, 65)]), 'big.pdf') });
ok('CV over 5 MB → 413', r.status === 413 && r.data.error.code === 'FILE_TOO_LARGE', String(r.status));
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({}, null) });
ok('missing CV → 400 CV_REQUIRED', r.status === 400 && r.data.error.code === 'CV_REQUIRED', JSON.stringify(r.data.error));
r = await call('POST', `/api/jobs/${jobId}/apply`, { form: appForm({ email: 'nope', fullName: 'x' }) });
ok('invalid fields → 400', r.status === 400);
r = await call('POST', `/api/jobs/${expiredId}/apply`, { form: appForm() });
ok('apply to expired job → 400 JOB_CLOSED', r.status === 400 && r.data.error.code === 'JOB_CLOSED');
r = await call('POST', '/api/jobs/does-not-exist/apply', { form: appForm() });
ok('apply to unknown job → 404', r.status === 404);

r = await call('GET', '/api/admin/applications', { cookie: admin });
ok('admin lists applications (2)', r.data.total === 2 && r.data.items[0].cv.downloadUrl.includes('/cv'), String(r.data.total));
const general = r.data.items.find((a) => a.id === generalId);
ok('application: job link + Arabic name preserved', r.data.items.find((a) => a.id === appId).job?.title.en === 'Quality Engineer' && general.job === null && general.cv.name === 'سيرة ذاتية.pdf' && general.whatsappUrl === 'https://wa.me/970591112222', general.cv.name);
r = await call('GET', `/api/admin/applications/${appId}/cv`, { cookie: admin, raw: true });
const cvBytes = Buffer.from(await r.arrayBuffer());
ok('CV download (auth) returns the original bytes', r.status === 200 && cvBytes.toString().startsWith('%PDF-1.4') && /attachment/.test(r.headers.get('content-disposition') ?? ''), `${r.status}`);
r = await call('GET', `/api/admin/applications/${appId}/cv`, { raw: true });
ok('CV download without login → 401', r.status === 401);
r = await call('GET', '/uploads/private/cv/anything.pdf', { raw: true });
ok('private CV folder is NOT served statically', r.status === 404);
r = await call('PATCH', `/api/admin/applications/${appId}`, { cookie: admin, json: { status: 'shortlisted', notes: 'مرشح ممتاز' } });
ok('change status + notes', r.status === 200 && r.data.status === 'shortlisted' && r.data.notes === 'مرشح ممتاز');
r = await call('PATCH', `/api/admin/applications/${appId}`, { cookie: admin, json: { status: 'hired' } });
ok('invalid status → 400', r.status === 400);
r = await call('GET', '/api/admin/applications?status=shortlisted', { cookie: admin });
ok('filter by status', r.data.total === 1);

console.log('── INBOX & NOTIFICATIONS');
r = await call('GET', '/api/admin/messages', { cookie: admin });
const msg = r.data.items[0];
ok('messages: Arabic body + whatsapp link (0597… → 970597…)', msg.message.includes('نابلس') && msg.whatsappUrl === 'https://wa.me/970597959536' && msg.isRead === false, msg.whatsappUrl);
r = await call('GET', '/api/admin/notifications', { cookie: admin });
ok('notifications: message + unreviewed application (reviewed one auto-cleared)', r.data.unread === 2 && r.data.items.some((n) => n.type === 'contact_message') && r.data.items.some((n) => n.type === 'job_application'), String(r.data.unread));
r = await call('PATCH', `/api/admin/messages/${msg.id}`, { cookie: admin, json: { isRead: true } });
r = await call('GET', '/api/admin/notifications?unread=true', { cookie: admin });
ok('reading a message clears its notification', r.data.unread === 1, String(r.data.unread));
r = await call('POST', '/api/admin/notifications/read-all', { cookie: admin });
ok('mark all read', r.data.updated === 1);
r = await call('DELETE', `/api/admin/applications/${generalId}`, { cookie: admin });
ok('delete application → 204', r.status === 204);
r = await call('DELETE', `/api/admin/messages/${msg.id}`, { cookie: admin });
ok('delete message → 204', r.status === 204);

console.log('── MEDIA LIBRARY');
const upload = (buf, name, type, path = '/api/admin/media') => { const f = new FormData(); f.append('file', new Blob([buf], { type }), name); return call('POST', path, { cookie: admin, form: f }); };
r = await upload(png, 'شعار.png', 'image/png');
const media = r.data;
ok('upload PNG → 201, url + kind + size', r.status === 201 && media.url.startsWith('/uploads/media/') && media.kind === 'image' && media.mimeType === 'image/png' && media.originalName === 'شعار.png', JSON.stringify(media));
r = await call('GET', media.url, { raw: true });
ok('public file served with nosniff + CORP', r.status === 200 && r.headers.get('content-type') === 'image/png' && r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('cross-origin-resource-policy') === 'cross-origin');
r = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'x.svg', 'image/svg+xml');
ok('SVG rejected (script risk)', r.status === 400);
r = await upload(Buffer.from('<html>hi</html>'), 'x.png', 'image/png');
ok('HTML disguised as PNG rejected', r.status === 400 && r.data.error.code === 'INVALID_FILE_TYPE');
r = await upload(png, 'again.png', 'image/png', `/api/admin/media/${media.id}/replace`);
ok('replace with same type keeps the URL', r.status === 200 && r.data.url === media.url);
r = await upload(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), 'x.jpg', 'image/jpeg', `/api/admin/media/${media.id}/replace`);
ok('replace with a different type → 400 TYPE_MISMATCH', r.status === 400 && r.data.error.code === 'TYPE_MISMATCH');
r = await call('PATCH', `/api/admin/media/${media.id}`, { cookie: admin, json: { alt: { ar: 'شعار', en: 'Logo' } } });
ok('edit alt text', r.data.alt.en === 'Logo');
r = await call('GET', '/api/admin/media?kind=image&q=again', { cookie: admin });
ok('list media with filter', r.data.total === 1);
r = await call('DELETE', `/api/admin/media/${media.id}`, { cookie: admin });
r = await call('GET', media.url, { raw: true });
ok('delete removes the file', r.status === 404);

console.log('── COMPANY, WHATSAPP, SETTINGS');
r = await call('PUT', '/api/admin/company', { cookie: admin, json: { phoneDisplay: '+970 9 999 0000', social: { facebook: 'https://facebook.com/lamico' }, hours: { ar: 'يومياً', en: 'Daily' } } });
ok('company partial update', r.status === 200 && r.data.phoneDisplay === '+970 9 999 0000' && r.data.social.facebook === 'https://facebook.com/lamico' && r.data.name.ar === 'شركة لاميكو الاستثمارية');
r = await call('GET', '/api/company');
ok('change is public immediately', r.data.hours.en === 'Daily');
r = await call('PUT', '/api/admin/whatsapp', { cookie: admin, json: { channels: [{ channel: 'WATER', number: '972500000000', message: { ar: 'مياه', en: 'Water' }, isActive: true }] } });
r = await call('GET', '/api/company');
ok('per-sector WhatsApp number', r.data.whatsapp.water.number === '972500000000' && r.data.whatsapp.general.number === '9720597959536');
r = await call('PUT', '/api/admin/whatsapp', { cookie: admin, json: { channels: [{ channel: 'WATER', number: '+972-bad', message: { ar: 'م', en: 'w' }, isActive: true }] } });
ok('invalid WhatsApp number → 400', r.status === 400);
r = await call('PUT', '/api/admin/settings/home.content', { cookie: admin, json: { value: { heroTitle: { ar: 'عنوان', en: 'Title' } } } });
r = await call('GET', '/api/settings/home.content');
ok('setting saved and readable publicly', r.data.heroTitle.en === 'Title');
r = await call('PUT', '/api/admin/settings/secret.key', { cookie: admin, json: { value: 'private' } });
r = await call('GET', '/api/settings/secret.key');
ok('private setting stays private', r.status === 404);

console.log('── USERS & ROLE GATING');
r = await call('POST', '/api/admin/users', { cookie: admin, json: { email: 'Editor@Lamico.test', name: 'Editor', password: 'EditorPassword-123', role: 'EDITOR' } });
ok('create EDITOR (email lower-cased)', r.status === 201 && r.data.email === 'editor@lamico.test' && !JSON.stringify(r.data).includes('passwordHash'));
const editorId = r.data.id;
r = await call('POST', '/api/admin/users', { cookie: admin, json: { email: 'weak@lamico.test', name: 'Weak', password: 'short', role: 'ADMIN' } });
ok('weak password → 400', r.status === 400);
r = await call('POST', '/api/admin/users', { cookie: admin, json: { email: 'editor@lamico.test', name: 'Dup', password: 'EditorPassword-123', role: 'EDITOR' } });
ok('duplicate email → 409', r.status === 409);
const ed = await login('editor@lamico.test', 'EditorPassword-123');
ok('editor can log in', ed.status === 200);
for (const [method, path, expected, label] of [
  ['GET', '/api/admin/products', 200, 'editor: products allowed'],
  ['GET', '/api/admin/media', 200, 'editor: media allowed'],
  ['GET', '/api/admin/applications', 403, 'editor: applications FORBIDDEN'],
  ['GET', '/api/admin/messages', 403, 'editor: messages FORBIDDEN'],
  ['GET', '/api/admin/company', 403, 'editor: company settings FORBIDDEN'],
  ['GET', '/api/admin/users', 403, 'editor: users FORBIDDEN'],
]) {
  r = await call(method, path, { cookie: ed.cookie });
  ok(label, r.status === expected, String(r.status));
}
r = await call('GET', `/api/admin/applications/${appId}/cv`, { cookie: ed.cookie, raw: true });
ok('editor cannot download CVs', r.status === 403);
r = await call('PATCH', `/api/admin/users/${editorId}`, { cookie: admin, json: { isActive: false } });
r = await call('GET', '/api/auth/me', { cookie: ed.cookie });
ok('deactivated user is locked out immediately (existing token)', r.status === 401);
const me = (await call('GET', '/api/auth/me', { cookie: admin })).data.user;
r = await call('PATCH', `/api/admin/users/${me.id}`, { cookie: admin, json: { role: 'ADMIN' } });
ok('cannot demote the last super admin', r.status === 400 && r.data.error.code === 'LAST_SUPER_ADMIN');
r = await call('DELETE', `/api/admin/users/${me.id}`, { cookie: admin });
ok('cannot delete yourself', r.status === 400);
r = await call('POST', '/api/auth/change-password', { cookie: admin, json: { currentPassword: 'nope', newPassword: 'Fresh-Secure-Pass-98765' } });
ok('change password: wrong current → 400', r.status === 400);
r = await call('POST', '/api/auth/change-password', { cookie: admin, json: { currentPassword: 'TestPassword-12345', newPassword: 'Fresh-Secure-Pass-98765' } });
ok('change password → 204', r.status === 204);
l = await login('admin@lamico.test', 'Fresh-Secure-Pass-98765');
ok('login with the new password', l.status === 200);

console.log('── SECURITY HEADERS');
r = await call('GET', '/api/products', { raw: true });
ok('helmet headers, no x-powered-by', !r.headers.get('x-powered-by') && r.headers.get('x-content-type-options') === 'nosniff');
r = await call('GET', '/api/products', { raw: true, cookie: '' });
r = await fetch(BASE + '/api/admin/dashboard', { headers: { Authorization: 'Bearer garbage.token.value' } });
ok('garbage bearer token → 401', r.status === 401);

// cleanup of the test data we created
for (const id of [pid, jobId, expiredId]) { await call('DELETE', `/api/admin/${id === pid ? 'products' : 'jobs'}/${id}`, { cookie: admin }); }
await call('DELETE', `/api/admin/applications/${appId}`, { cookie: admin });
await call('DELETE', `/api/admin/water/labels/${labelId}`, { cookie: admin });

console.log(`\n${fail === 0 ? 'ALL PASSED' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
