import { Router } from 'express';
import { env } from '../config/env.js';
import { captchaEnabled, requireCaptcha } from '../middleware/captcha.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { cvUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { submitApplication } from '../services/applications.service.js';
import { getCompany, getPublicSetting } from '../services/company.service.js';
import { createContactMessage } from '../services/inbox.service.js';
import { getPublicJob, listPublicJobs } from '../services/jobs.service.js';
import { getPublicProduct, listPublicProducts, listPublicSectors, listPublicWaterLabels } from '../services/products.service.js';
import { createQuoteRequest } from '../services/quotes.service.js';
import { listPublicTeam } from '../services/team.service.js';
import { getPublicProject, listPublicProjects } from '../services/realEstate.service.js';
import { productSectors, settingKeyParams } from '../validators/admin.validators.js';
import { applicationSchema, contactSchema, publicProductsQuery, quoteSchema, slugParams, type ApplicationInput, type ContactInput, type QuoteInput } from '../validators/public.validators.js';

/** Everything the public website reads or submits. No authentication required. */
export const publicRoutes = Router();

publicRoutes.get('/company', async (_req, res) => {
  res.json(await getCompany());
});

publicRoutes.get('/sectors', async (_req, res) => {
  res.json(await listPublicSectors());
});

// Products
publicRoutes.get('/products', validate(publicProductsQuery, 'query'), async (req, res) => {
  const { sector, featured } = req.query as { sector?: string; featured?: boolean };
  res.json(await listPublicProducts({ sector, featured }));
});

publicRoutes.get('/products/:slug', validate(slugParams, 'params'), async (req, res) => {
  res.json(await getPublicProduct(req.params['slug'] as string));
});

// Sector shortcuts: /api/water, /api/plastic, /api/preforms, /api/caps, /api/food
for (const sector of productSectors) {
  publicRoutes.get(`/${sector}`, async (_req, res) => {
    res.json(await listPublicProducts({ sector }));
  });
}

publicRoutes.get('/water/labels', async (_req, res) => {
  res.json(await listPublicWaterLabels());
});

// Real estate
publicRoutes.get('/real-estate', async (_req, res) => {
  res.json(await listPublicProjects());
});

publicRoutes.get('/real-estate/:slug', validate(slugParams, 'params'), async (req, res) => {
  res.json(await getPublicProject(req.params['slug'] as string));
});

// Board of directors and executive management
publicRoutes.get('/team', async (_req, res) => {
  res.json(await listPublicTeam());
});

// Careers
publicRoutes.get('/jobs', async (_req, res) => {
  res.json(await listPublicJobs());
});

publicRoutes.get('/jobs/:slug', validate(slugParams, 'params'), async (req, res) => {
  res.json(await getPublicJob(req.params['slug'] as string));
});

/** `:id` is a job id or slug, or the word `general` for a spontaneous application. Multipart: text fields + `cv`. */
publicRoutes.post('/jobs/:id/apply', formLimiter, requireCaptcha, cvUpload, validate(applicationSchema), async (req, res) => {
  const id = await submitApplication(req.params['id'] as string, req.body as ApplicationInput, req.file, req.ip);
  res.status(201).json({ ok: true, id });
});

// Contact
publicRoutes.post('/contact', formLimiter, requireCaptcha, validate(contactSchema), async (req, res) => {
  await createContactMessage(req.body as ContactInput);
  res.status(201).json({ ok: true });
});

// Whitelisted content blocks (water overview, legal pages...)
publicRoutes.get('/settings/:key', validate(settingKeyParams, 'params'), async (req, res) => {
  res.json(await getPublicSetting(req.params['key'] as string));
});

// Quote requests from companies
publicRoutes.post('/quotes', formLimiter, requireCaptcha, validate(quoteSchema), async (req, res) => {
  await createQuoteRequest(req.body as QuoteInput);
  res.status(201).json({ ok: true });
});

/** Settings the website needs at run time (public keys and the analytics snippet) — nothing secret. */
publicRoutes.get('/config', (_req, res) => {
  const analytics = env.ANALYTICS_PROVIDER
    ? {
        provider: env.ANALYTICS_PROVIDER,
        domain: env.ANALYTICS_DOMAIN ?? null,
        websiteId: env.ANALYTICS_WEBSITE_ID ?? null,
        scriptUrl: env.ANALYTICS_SCRIPT_URL ?? (env.ANALYTICS_PROVIDER === 'plausible' ? 'https://plausible.io/js/script.js' : 'https://cloud.umami.is/script.js'),
      }
    : null;
  res.set('Cache-Control', 'public, max-age=300').json({
    turnstileSiteKey: captchaEnabled() ? (env.TURNSTILE_SITE_KEY ?? null) : null,
    analytics,
    googleSiteVerification: env.GOOGLE_SITE_VERIFICATION ?? null,
  });
});
