import { Router } from 'express';
import { env } from '../config/env.js';
import { getCompany } from '../services/company.service.js';
import { getPublicProduct } from '../services/products.service.js';
import { getPublicProject } from '../services/realEstate.service.js';
import { getPublicJob } from '../services/jobs.service.js';

/**
 * Minimal server-rendered HTML with Open Graph / Twitter tags, for link-preview crawlers only
 * (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn, Slack, Discord...). Real search engines
 * (Google, Bing) run the actual React app's JavaScript and already get the rich page — this exists
 * because link-unfurlers generally do not execute JavaScript, so they only ever see whatever this
 * route (or the static index.html) returns. nginx decides which requests reach this route at all —
 * it forwards here only when the User-Agent matches a known preview bot (see deploy/nginx.conf);
 * everyone else keeps getting the normal single-page app, unchanged.
 */
export const previewRoutes = Router();

const site = (env.SITE_URL ?? env.CLIENT_URL).replace(/\/+$/, '');
const LOCALES = ['ar', 'en'] as const;
type Locale = (typeof LOCALES)[number];

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(locale: Locale, path: string, title: string, description: string, image: string) {
  const url = `${site}/${locale}${path}`;
  const absImage = image.startsWith('http') ? image : `${site}${image}`;
  return `<!doctype html>
<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(absImage)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${locale === 'ar' ? 'ar_PS' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(absImage)}">
<meta http-equiv="refresh" content="0; url=${esc(url)}">
</head>
<body><a href="${esc(url)}">${esc(title)}</a></body>
</html>`;
}

/** `/ar/products/x` -> { locale: 'ar', rest: '/products/x' }; an unprefixed path defaults to 'ar'. */
function splitLocale(urlPath: string): { locale: Locale; rest: string } {
  const match = urlPath.match(/^\/(ar|en)(\/.*)?$/);
  if (match) return { locale: match[1] as Locale, rest: match[2] || '/' };
  return { locale: 'ar', rest: urlPath };
}

previewRoutes.get(/^\/(ar|en)?(\/.*)?$/, async (req, res, next) => {
  try {
    const { locale, rest } = splitLocale(req.path);
    const company = await getCompany();
    const brand = company.name[locale];
    const defaultImage = `${site}/assets/hero/hero-scene.webp`;
    const fallback = () => res.type('html').send(page(locale, rest, brand, company.about[0]?.[locale] ?? brand, defaultImage));

    const productMatch = rest.match(/^\/products\/([^/]+)\/?$/);
    const projectMatch = rest.match(/^\/real-estate\/([^/]+)\/?$/);
    const jobMatch = rest.match(/^\/careers\/([^/]+)\/?$/);

    if (productMatch) {
      const product = await getPublicProduct(decodeURIComponent(productMatch[1]!));
      if (!product) return fallback();
      const title = `${product.name[locale]} | ${brand}`;
      res.type('html').send(page(locale, rest, title, product.shortDescription[locale], product.image ?? defaultImage));
      return;
    }

    if (projectMatch) {
      const project = await getPublicProject(decodeURIComponent(projectMatch[1]!));
      if (!project) return fallback();
      const title = `${project.name[locale]} | ${brand}`;
      const desc = project.description[0]?.[locale] ?? project.tagline?.[locale] ?? brand;
      res.type('html').send(page(locale, rest, title, desc, project.featuredImage ?? defaultImage));
      return;
    }

    if (jobMatch) {
      const job = await getPublicJob(decodeURIComponent(jobMatch[1]!));
      if (!job) return fallback();
      const title = `${job.title[locale]} | ${brand}`;
      res.type('html').send(page(locale, rest, title, job.description[locale], defaultImage));
      return;
    }

    fallback();
  } catch (error) {
    next(error);
  }
});
