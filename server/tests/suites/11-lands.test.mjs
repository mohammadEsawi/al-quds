// Land listings: a section of its own, separate from real-estate projects — each with its own direct
// contact, so an ad for one specific plot can link straight to its page.
import { call, check, finish, session } from '../lib/client.mjs';

const PASS = 'Correct-Horse-Battery-77';
const sa = await session();
await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'editor11@lamico.test', name: 'Editor', password: PASS, role: 'EDITOR' } });
const ed = await session('editor11@lamico.test', PASS);

// ───────── empty by default ─────────
const empty = await call('/lands');
check('no lands yet: an empty array, not an error', empty.status === 200 && Array.isArray(empty.json) && empty.json.length === 0);
check('an unknown slug is a 404', (await call('/lands/no-such-land')).status === 404);

// ───────── dashboard: auth and validation ─────────
check('the lands list needs a login', (await call('/admin/lands', { cookie: null })).status === 401);

const body = {
  title: { ar: 'أرض للبيع في نابلس', en: 'Land for sale in Nablus' },
  area: { ar: '500 م²', en: '500 sqm' },
  location: { ar: 'ضواحي نابلس', en: 'Nablus outskirts' },
  featuredImage: '/uploads/media/land.png',
  contactPhone: '+970597959536',
  whatsappNumber: '9720597959536',
};
check('title, location, image and contact are required', (await call('/admin/lands', { method: 'POST', cookie: ed, body: {} })).status === 400);
check('an image must be an https link or a site path', (await call('/admin/lands', { method: 'POST', cookie: ed, body: { ...body, featuredImage: 'http://example.com/a.png' } })).status === 400);
check('status only accepts available/sold', (await call('/admin/lands', { method: 'POST', cookie: ed, body: { ...body, status: 'construction' } })).status === 400);

const created = await call('/admin/lands', { method: 'POST', cookie: ed, body: { ...body, id: 'forced-id' } });
check(
  'create a land listing (unknown fields such as id are ignored; defaults to available)',
  created.status === 201 && created.json?.id !== 'forced-id' && created.json?.slug === 'land-for-sale-in-nablus' && created.json?.area?.ar === '500 م²' && created.json?.status === 'available' && created.json?.published === true,
  JSON.stringify(created.json),
);

const id = created.json?.id;
const slug = created.json?.slug;
check('it shows on the public list and by slug', (await call('/lands')).json?.some((l) => l.id === id) && (await call(`/lands/${slug}`)).json?.contactPhone === '+970597959536');

// ───────── a second land has its own, different contact ─────────
const second = await call('/admin/lands', {
  method: 'POST',
  cookie: ed,
  body: { title: { ar: 'أرض ثانية', en: 'Second land' }, location: { ar: 'رام الله', en: 'Ramallah' }, featuredImage: '/uploads/media/land2.png', contactPhone: '+970599000000', whatsappNumber: '9720599000000' },
});
check('each land keeps its own contact details', second.status === 201 && second.json?.contactPhone === '+970599000000' && created.json?.contactPhone === '+970597959536');

// ───────── update, status, hide, delete ─────────
const updated = await call(`/admin/lands/${id}`, { method: 'PUT', cookie: ed, body: { status: 'sold' } });
check('update changes only what is sent, status can flip to sold', updated.status === 200 && updated.json?.status === 'sold' && updated.json?.title?.ar === 'أرض للبيع في نابلس', JSON.stringify(updated.json));

const hidden = await call(`/admin/lands/${id}`, { method: 'PUT', cookie: ed, body: { published: false } });
check('a hidden land disappears from the public list but stays in the dashboard', hidden.json?.published === false && !(await call('/lands')).json.some((l) => l.id === id) && (await call('/admin/lands', { cookie: ed })).json.some((l) => l.id === id));
check('…and its detail page also stops resolving publicly', (await call(`/lands/${slug}`)).status === 404);

check('delete a land listing', (await call(`/admin/lands/${id}`, { method: 'DELETE', cookie: ed })).status === 204 && (await call(`/admin/lands/${id}`, { cookie: ed })).status === 404);
check('the public payload has no internal fields', !/createdAt|updatedAt|titleAr/.test((await call('/lands')).text));

finish();
