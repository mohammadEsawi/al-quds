// Homepage "latest news": title + short text, an optional photo and an optional link.
import { call, check, finish, session } from '../lib/client.mjs';

const PASS = 'Correct-Horse-Battery-77';
const sa = await session();
await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'editor10@lamico.test', name: 'Editor', password: PASS, role: 'EDITOR' } });
const ed = await session('editor10@lamico.test', PASS);

// ───────── empty by default ─────────
const empty = await call('/news');
check('no news yet: an empty array, not an error', empty.status === 200 && Array.isArray(empty.json) && empty.json.length === 0);

// ───────── dashboard: auth and validation ─────────
check('the news list needs a login', (await call('/admin/news', { cookie: null })).status === 401);

const body = { title: { ar: 'عنوان الخبر', en: 'News title' }, text: { ar: 'نص قصير عن الخبر', en: 'Short news text' }, image: '/uploads/media/news.png', link: 'https://example.com/post' };
check('title and text are required', (await call('/admin/news', { method: 'POST', cookie: ed, body: {} })).status === 400);
check('an image must be an https link or a site path', (await call('/admin/news', { method: 'POST', cookie: ed, body: { ...body, image: 'http://example.com/a.png' } })).status === 400 && (await call('/admin/news', { method: 'POST', cookie: ed, body: { ...body, image: 'javascript:alert(1)' } })).status === 400);
check('a link must be an https link or a site path', (await call('/admin/news', { method: 'POST', cookie: ed, body: { ...body, link: 'not-a-url' } })).status === 400);

const created = await call('/admin/news', { method: 'POST', cookie: ed, body: { ...body, id: 'forced-id', createdAt: '2000-01-01' } });
check('create a news item (unknown fields such as id are ignored)', created.status === 201 && created.json?.id !== 'forced-id' && created.json?.title?.ar === 'عنوان الخبر' && created.json?.image === '/uploads/media/news.png' && created.json?.link === 'https://example.com/post' && created.json?.published === true, JSON.stringify(created.json));

const id = created.json?.id;
check('it shows on the public site', (await call('/news')).json?.some((n) => n.id === id && n.text.en === 'Short news text'));

// ───────── second item, reorder ─────────
const second = await call('/admin/news', { method: 'POST', cookie: ed, body: { title: { ar: 'خبر ثانٍ', en: 'Second news' }, text: { ar: 'نص', en: 'Text' } } });
check('a second item is added without an image or link', second.status === 201 && second.json?.image === undefined && second.json?.link === undefined);
check('public order follows sortOrder, newest-added last by default', (await call('/news')).json.map((n) => n.id).join(',') === `${id},${second.json.id}`);

const reordered = [{ id: second.json.id, sortOrder: 0 }, { id, sortOrder: 1 }];
check('reorder rewrites the positions', (await call('/admin/news/reorder', { method: 'POST', cookie: ed, body: { items: reordered } })).status === 204 && (await call('/news')).json.map((n) => n.id).join(',') === `${second.json.id},${id}`);

// ───────── update, hide, delete ─────────
const updated = await call(`/admin/news/${id}`, { method: 'PUT', cookie: ed, body: { title: { ar: 'عنوان جديد', en: 'New title' } } });
check('update changes only what is sent', updated.status === 200 && updated.json?.title?.en === 'New title' && updated.json?.text?.en === 'Short news text', JSON.stringify(updated.json));

const hidden = await call(`/admin/news/${id}`, { method: 'PUT', cookie: ed, body: { published: false } });
check('a hidden item disappears from the public site but stays in the dashboard', hidden.json?.published === false && !(await call('/news')).json.some((n) => n.id === id) && (await call('/admin/news', { cookie: ed })).json.some((n) => n.id === id));

check('clearing the image and the link works', (await call(`/admin/news/${id}`, { method: 'PUT', cookie: ed, body: { image: null, link: null } })).json?.image === undefined);

check('delete a news item', (await call(`/admin/news/${id}`, { method: 'DELETE', cookie: ed })).status === 204 && (await call(`/admin/news/${id}`, { cookie: ed })).status === 404);
check('the public payload has no internal fields', !/createdAt|updatedAt|titleAr/.test((await call('/news')).text));

finish();
