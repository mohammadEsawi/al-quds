// Board of directors, executive management and the "About the company" page content.
import { spawnSync } from 'node:child_process';
import { BASE, call, check, finish, session } from '../lib/client.mjs';

const PASS = 'Correct-Horse-Battery-77';
const sa = await session();
await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'editor8@lamico.test', name: 'Editor', password: PASS, role: 'EDITOR' } });
await call('/admin/users', { method: 'POST', cookie: sa, body: { email: 'admin8@lamico.test', name: 'Admin', password: PASS, role: 'ADMIN' } });
const ed = await session('editor8@lamico.test', PASS);
const ad = await session('admin8@lamico.test', PASS);

// ───────── public content ─────────
const pub = await call('/team');
check('public team: the chairman and eight executives', pub.status === 200 && pub.json?.board?.length === 1 && pub.json?.executive?.length === 8, JSON.stringify(pub.json).slice(0, 120));
const gm = pub.json?.executive?.[0];
check('the general manager comes first, with name, title, department and three bio paragraphs in both languages', gm?.role === 'general_manager' && gm.name.ar === 'لامي أسعد عيساوي' && gm.title.en === 'General Manager' && gm.department?.ar === 'الإدارة العامة' && gm.bio.length === 3 && gm.bio.every((p) => p.ar && p.en), JSON.stringify(gm)?.slice(0, 200));
check('executives keep the given order', pub.json?.executive?.map((m) => m.title.ar).join('|') === 'المدير العام|مدير المبيعات|مديرة العلاقات العامة والموارد البشرية|مدير العمليات|مدير التطوير|مدير التوريدات|مديرة دائرة الجودة|مدير الحسابات');
check('nobody has a photo yet (they are added from the dashboard)', [...pub.json.board, ...pub.json.executive].every((m) => !m.photo));
const chairman = pub.json?.board?.[0];
check('the chairman is Rami Asaad Esawi with a three-paragraph bio in both languages', chairman?.role === 'chairman' && chairman.name.ar === 'رامي أسعد عيساوي' && chairman.name.en === 'Rami Asaad Esawi' && chairman.title.ar === 'رئيس مجلس الإدارة' && chairman.bio.length === 3 && chairman.bio.every((p) => p.ar && p.en) && chairman.isPlaceholder === false, JSON.stringify(chairman)?.slice(0, 200));
const paragraphs = (text) => text.split('\n\n').filter(Boolean);
check('both leaders have a three-paragraph message in Arabic and English', [chairman, gm].every((m) => paragraphs(m.message?.ar ?? '').length === 3 && paragraphs(m.message?.en ?? '').length === 3), JSON.stringify([chairman?.message, gm?.message]).slice(0, 160));
check('the messages are the given texts', chairman.message.ar.startsWith('في لاميكو للاستثمار الصناعي والتوريدات، ننظر إلى الاستثمار') && gm.message.ar.startsWith('نؤمن في لاميكو للاستثمار الصناعي والتوريدات بأن التميز'));
check('the public payload has no internal fields', !/createdAt|updatedAt|nameAr|isSample/.test(pub.text));

const about = await call('/settings/about.page');
check('about page text is public: 5 paragraphs, vision, mission, 8 goals', about.status === 200 && about.json?.intro?.length === 5 && about.json?.goals?.length === 8 && about.json?.vision?.title?.ar?.includes('رائدة') && about.json?.mission?.title?.en?.includes('sustainable'), JSON.stringify(about.json).slice(0, 100));
check('company name is the full Arabic and English name', about.json?.companyName?.ar === 'لاميكو للاستثمار الصناعي والتوريدات' && about.json?.companyName?.en === 'Lamico for Industrial Investment and Supplies');

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check('sitemap lists the board and executive pages in both languages', ['/ar/about/board', '/en/about/board', '/ar/about/executive', '/en/about/executive', '/ar/about/chairman-message', '/en/about/gm-message'].every((u) => sitemap.includes(u)));

// ───────── dashboard ─────────
check('the team list needs a login', (await call('/admin/team', { cookie: null })).status === 401);
const list = await call('/admin/team', { cookie: ed });
check('an EDITOR can manage the team (it is public content)', list.status === 200 && list.json?.length === 9);

const body = { group: 'board', role: 'member', name: { ar: 'عضو المجلس', en: 'Board Member' }, title: { ar: 'عضو مجلس إدارة', en: 'Board Member' }, bio: [{ ar: 'خبرة طويلة', en: 'Long experience' }], photo: '/uploads/media/member.png' };
const created = await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, id: 'forced-id', createdAt: '2000-01-01' } });
check('create a board member (unknown fields such as id are ignored)', created.status === 201 && created.json?.id !== 'forced-id' && created.json?.photo === '/uploads/media/member.png' && created.json?.group === 'board', JSON.stringify(created.json));
check('new people are added at the end of their group', created.json?.sortOrder === 1);
check('a photo must be an https link or a site path', (await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, photo: 'http://example.com/a.png' } })).status === 400 && (await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, photo: 'javascript:alert(1)' } })).status === 400);
check('title and group are required', (await call('/admin/team', { method: 'POST', cookie: ed, body: { name: body.name } })).status === 400);
check('unknown group or role refused', (await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, group: 'owners' } })).status === 400 && (await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, role: 'god' } })).status === 400);
check('a bio paragraph needs both languages', (await call('/admin/team', { method: 'POST', cookie: ed, body: { ...body, bio: [{ ar: 'فقط عربي', en: '' }] } })).status === 400);
check('the new member shows on the public site', (await call('/team')).json?.board?.some((m) => m.name.en === 'Board Member'));

const id = created.json?.id;
const updated = await call(`/admin/team/${id}`, { method: 'PUT', cookie: ed, body: { name: { ar: 'اسم جديد', en: 'New Name' }, message: { ar: 'رسالة', en: 'Message' } } });
check('update changes only what is sent', updated.status === 200 && updated.json?.name?.en === 'New Name' && updated.json?.message?.en === 'Message' && updated.json?.title?.ar === 'عضو مجلس إدارة' && updated.json?.photo === '/uploads/media/member.png', JSON.stringify(updated.json));
check('clearing the message and the photo works', (await call(`/admin/team/${id}`, { method: 'PUT', cookie: ed, body: { message: { ar: '', en: '' }, photo: null } })).json?.message === undefined);

const hidden = await call(`/admin/team/${id}`, { method: 'PUT', cookie: ed, body: { published: false } });
check('a hidden person disappears from the public site but stays in the dashboard', hidden.json?.published === false && !(await call('/team')).json.board.some((m) => m.id === id) && (await call('/admin/team', { cookie: ed })).json.some((m) => m.id === id));

const executives = (await call('/admin/team', { cookie: ed })).json.filter((m) => m.group === 'executive');
const reordered = executives.map((m) => m.id).reverse().map((memberId, position) => ({ id: memberId, sortOrder: position }));
check('reorder rewrites the positions', (await call('/admin/team/reorder', { method: 'POST', cookie: ed, body: { items: reordered } })).status === 204 && (await call('/team')).json.executive[0].title.ar === 'مدير الحسابات');

check('delete a person', (await call(`/admin/team/${id}`, { method: 'DELETE', cookie: ed })).status === 204 && (await call(`/admin/team/${id}`, { cookie: ed })).status === 404);

// ───────── site checklist ─────────
const ready = Object.fromEntries(((await call('/admin/readiness', { cookie: ad })).json ?? []).map((i) => [i.id, i]));
check('checklist: missing photos are flagged; the chairman and the messages are already in place', ready.teamPhotos?.status === 'todo' && ready.teamPhotos.count === 9 && ready.teamPlaceholders?.status === 'ok' && ready.leaderMessages?.status === 'ok', JSON.stringify([ready.teamPhotos, ready.teamPlaceholders, ready.leaderMessages]));

const all = (await call('/admin/team', { cookie: ed })).json;
const chair = all.find((m) => m.role === 'chairman');
const general = all.find((m) => m.role === 'general_manager');
const message = { ar: 'رسالة حقيقية', en: 'A real message' };
await call(`/admin/team/${chair.id}`, { method: 'PUT', cookie: ed, body: { name: { ar: 'الاسم', en: 'Name' }, message, photo: '/uploads/media/a.png', isPlaceholder: false } });
await call(`/admin/team/${general.id}`, { method: 'PUT', cookie: ed, body: { message, photo: '/uploads/media/b.png' } });
const after = Object.fromEntries(((await call('/admin/readiness', { cookie: ad })).json ?? []).map((i) => [i.id, i]));
check('checklist: the items turn green as the details are entered', after.leaderMessages?.status === 'ok' && after.teamPlaceholders?.status === 'ok' && after.teamPhotos?.count === 7, JSON.stringify([after.leaderMessages, after.teamPlaceholders, after.teamPhotos]));
const home = (await call('/team')).json;
check('the messages are on the public payload for the homepage', home.board[0].message?.ar === 'رسالة حقيقية' && home.executive.find((m) => m.role === 'general_manager')?.message?.en === 'A real message');

// ───────── about page text is editable ─────────
check('an EDITOR cannot change the about page text', (await call('/admin/settings/about.page', { method: 'PUT', cookie: ed, body: { value: {} } })).status === 403);
const text = { ...about.json, companyName: { ar: 'اسم آخر', en: 'Another name' } };
check('an ADMIN can change it, and the public page follows', (await call('/admin/settings/about.page', { method: 'PUT', cookie: ad, body: { value: text } })).status === 200 && (await call('/settings/about.page')).json?.companyName?.en === 'Another name');

// ───────── the seed only adds people who are missing ─────────
const before = (await call('/admin/team', { cookie: ed })).json;
const accounts = before.find((m) => m.title.ar === 'مدير الحسابات');
await call(`/admin/team/${accounts.id}`, { method: 'DELETE', cookie: ed });
const seeded = spawnSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { env: process.env, encoding: 'utf8' });
const afterSeed = (await call('/admin/team', { cookie: ed })).json;
check('running the seed again restores a person who was removed and adds nobody twice', seeded.status === 0 && afterSeed.length === before.length && afterSeed.filter((m) => m.title.ar === 'مدير الحسابات').length === 1, (seeded.stderr || seeded.stdout || '').slice(-200));
check('…at the end of the executive list, and leaves the people edited in the dashboard alone', afterSeed.filter((m) => m.group === 'executive').at(-1).title.ar === 'مدير الحسابات' && afterSeed.find((m) => m.role === 'chairman').name.en === 'Name' && afterSeed.filter((m) => m.role === 'chairman').length === 1);

finish();
