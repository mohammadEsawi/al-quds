import { Router } from 'express';
import { formLimiter } from '../middleware/rateLimit.js';
import { cvUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { submitApplication } from '../services/applications.service.js';
import { getCompany, getPublicSetting } from '../services/company.service.js';
import { createContactMessage } from '../services/inbox.service.js';
import { getPublicJob, listPublicJobs } from '../services/jobs.service.js';
import { getPublicProduct, listPublicProducts, listPublicSectors, listPublicWaterLabels } from '../services/products.service.js';
import { getPublicProject, listPublicProjects } from '../services/realEstate.service.js';
import { productSectors, settingKeyParams } from '../validators/admin.validators.js';
import { applicationSchema, contactSchema, publicProductsQuery, slugParams, type ApplicationInput, type ContactInput } from '../validators/public.validators.js';

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

// Careers
publicRoutes.get('/jobs', async (_req, res) => {
  res.json(await listPublicJobs());
});

publicRoutes.get('/jobs/:slug', validate(slugParams, 'params'), async (req, res) => {
  res.json(await getPublicJob(req.params['slug'] as string));
});

/** `:id` is a job id or slug, or the word `general` for a spontaneous application. Multipart: text fields + `cv`. */
publicRoutes.post('/jobs/:id/apply', formLimiter, cvUpload, validate(applicationSchema), async (req, res) => {
  const id = await submitApplication(req.params['id'] as string, req.body as ApplicationInput, req.file);
  res.status(201).json({ ok: true, id });
});

// Contact
publicRoutes.post('/contact', formLimiter, validate(contactSchema), async (req, res) => {
  await createContactMessage(req.body as ContactInput);
  res.status(201).json({ ok: true });
});

// Whitelisted content blocks (water overview, legal pages...)
publicRoutes.get('/settings/:key', validate(settingKeyParams, 'params'), async (req, res) => {
  res.json(await getPublicSetting(req.params['key'] as string));
});
