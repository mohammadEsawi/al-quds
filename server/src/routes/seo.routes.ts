import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/** `/robots.txt` and `/sitemap.xml`. The reverse proxy forwards these two paths to the API (see deploy/nginx.conf). */
export const seoRoutes = Router();

const site = (env.SITE_URL ?? env.CLIENT_URL).replace(/\/+$/, '');
const LOCALES = ['ar', 'en'] as const;
const STATIC_PAGES = ['', '/about', '/about/board', '/about/executive', '/about/chairman-message', '/about/gm-message', '/sectors', '/water', '/plastic', '/preforms', '/caps', '/products', '/food', '/real-estate', '/careers', '/contact', '/quote', '/privacy', '/terms'];

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Entry {
  path: string;
  lastmod?: Date;
}

function urlBlock({ path, lastmod }: Entry) {
  const alternates = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xml(`${site}/${l}${path}`)}"/>`).join('\n');
  return LOCALES.map(
    (l) => `  <url>\n    <loc>${xml(`${site}/${l}${path}`)}</loc>\n${lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` : ''}${alternates}\n  </url>`,
  ).join('\n');
}

seoRoutes.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
});

seoRoutes.get('/sitemap.xml', async (_req, res) => {
  const [products, jobs, projects] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.job.findMany({ where: { status: 'OPEN', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] }, select: { slug: true, updatedAt: true } }),
    prisma.realEstateProject.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const entries: Entry[] = [
    ...STATIC_PAGES.map((path) => ({ path })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastmod: p.updatedAt })),
    ...jobs.map((j) => ({ path: `/careers/${j.slug}`, lastmod: j.updatedAt })),
    ...projects.map((p) => ({ path: `/real-estate/${p.slug}`, lastmod: p.updatedAt })),
  ];
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.map(urlBlock).join('\n')}\n</urlset>\n`);
});
