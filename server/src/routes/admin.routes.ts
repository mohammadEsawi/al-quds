import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { safeDownloadName } from '../lib/files.js';
import { paginationQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { mediaUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { deleteApplication, getApplication, getCvFile, listApplications, updateApplication } from '../services/applications.service.js';
import { getCompany, listSettings, listWhatsAppChannels, saveSetting, saveWhatsAppChannels, updateCompany } from '../services/company.service.js';
import { getDashboard } from '../services/dashboard.service.js';
import {
  deleteMessage,
  getMessage,
  listMessages,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setMessageRead,
} from '../services/inbox.service.js';
import { createJob, deleteJob, getAdminJob, listAdminJobs, updateJob } from '../services/jobs.service.js';
import { deleteMedia, listMedia, replaceMedia, updateMedia, uploadMedia } from '../services/media.service.js';
import {
  createCategory,
  createProduct,
  createWaterLabel,
  deleteCategory,
  deleteProduct,
  deleteWaterLabel,
  getAdminProduct,
  listAdminProducts,
  listAdminSectors,
  listAdminWaterLabels,
  listCategories,
  reorderProducts,
  updateCategory,
  updateProduct,
  updateSector,
  updateWaterLabel,
} from '../services/products.service.js';
import { createProject, deleteProject, getAdminProject, listAdminProjects, updateProject } from '../services/realEstate.service.js';
import { idParams } from '../validators/common.js';
import { createUser, deleteUser, listUsers, updateUser } from '../services/users.service.js';
import {
  adminApplicationsQuery,
  adminJobsQuery,
  adminMessagesQuery,
  adminProductsQuery,
  categorySchema,
  createJobSchema,
  createProductSchema,
  createRealEstateSchema,
  createUserSchema,
  mediaQuery,
  notificationsQuery,
  reorderSchema,
  sectorUpdateSchema,
  settingKeyParams,
  updateApplicationSchema,
  updateCompanySchema,
  updateJobSchema,
  updateMediaSchema,
  updateMessageSchema,
  updateProductSchema,
  updateRealEstateSchema,
  updateSettingSchema,
  updateUserSchema,
  updateWhatsAppSchema,
  waterLabelSchema,
} from '../validators/admin.validators.js';

export const adminRoutes = Router();

// Every admin route needs a signed-in, active user. Each group below narrows it by role.
adminRoutes.use(requireAuth);

const anyStaff = requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'); // content editors and up
const admins = requireRole('SUPER_ADMIN', 'ADMIN'); // private data: applications, messages, settings
const superAdmin = requireRole('SUPER_ADMIN');

const id = (req: { params: Record<string, string | string[] | undefined> }) => req.params['id'] as string;

// ───────── Dashboard ─────────
adminRoutes.get('/dashboard', anyStaff, async (_req, res) => {
  res.json(await getDashboard());
});

// ───────── Products ─────────
adminRoutes.get('/products', anyStaff, validate(adminProductsQuery, 'query'), async (req, res) => {
  res.json(await listAdminProducts(req.query as never));
});
adminRoutes.post('/products/reorder', anyStaff, validate(reorderSchema), async (req, res) => {
  await reorderProducts(req.body.items);
  res.status(204).end();
});
adminRoutes.get('/products/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  res.json(await getAdminProduct(id(req)));
});
adminRoutes.post('/products', anyStaff, validate(createProductSchema), async (req, res) => {
  res.status(201).json(await createProduct(req.body));
});
adminRoutes.put('/products/:id', anyStaff, validate(idParams, 'params'), validate(updateProductSchema), async (req, res) => {
  res.json(await updateProduct(id(req), req.body));
});
adminRoutes.delete('/products/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteProduct(id(req));
  res.status(204).end();
});

// ───────── Categories ─────────
adminRoutes.get('/categories', anyStaff, async (_req, res) => {
  res.json(await listCategories());
});
adminRoutes.post('/categories', anyStaff, validate(categorySchema), async (req, res) => {
  res.status(201).json(await createCategory(req.body));
});
adminRoutes.put('/categories/:id', anyStaff, validate(idParams, 'params'), validate(categorySchema), async (req, res) => {
  res.json(await updateCategory(id(req), req.body));
});
adminRoutes.delete('/categories/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteCategory(id(req));
  res.status(204).end();
});

// ───────── Water labels ─────────
adminRoutes.get('/water/labels', anyStaff, async (_req, res) => {
  res.json(await listAdminWaterLabels());
});
adminRoutes.post('/water/labels', anyStaff, validate(waterLabelSchema), async (req, res) => {
  res.status(201).json(await createWaterLabel(req.body));
});
adminRoutes.put('/water/labels/:id', anyStaff, validate(idParams, 'params'), validate(waterLabelSchema), async (req, res) => {
  res.json(await updateWaterLabel(id(req), req.body));
});
adminRoutes.delete('/water/labels/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteWaterLabel(id(req));
  res.status(204).end();
});

// ───────── Sectors ─────────
adminRoutes.get('/sectors', anyStaff, async (_req, res) => {
  res.json(await listAdminSectors());
});
adminRoutes.put('/sectors/:id', anyStaff, validate(idParams, 'params'), validate(sectorUpdateSchema), async (req, res) => {
  res.json(await updateSector(id(req), req.body));
});

// ───────── Real estate ─────────
adminRoutes.get('/real-estate', anyStaff, async (_req, res) => {
  res.json(await listAdminProjects());
});
adminRoutes.get('/real-estate/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  res.json(await getAdminProject(id(req)));
});
adminRoutes.post('/real-estate', anyStaff, validate(createRealEstateSchema), async (req, res) => {
  res.status(201).json(await createProject(req.body));
});
adminRoutes.put('/real-estate/:id', anyStaff, validate(idParams, 'params'), validate(updateRealEstateSchema), async (req, res) => {
  res.json(await updateProject(id(req), req.body));
});
adminRoutes.delete('/real-estate/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteProject(id(req));
  res.status(204).end();
});

// ───────── Jobs ─────────
adminRoutes.get('/jobs', anyStaff, validate(adminJobsQuery, 'query'), async (req, res) => {
  res.json(await listAdminJobs(req.query as never));
});
adminRoutes.get('/jobs/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  res.json(await getAdminJob(id(req)));
});
adminRoutes.post('/jobs', anyStaff, validate(createJobSchema), async (req, res) => {
  res.status(201).json(await createJob(req.body));
});
adminRoutes.put('/jobs/:id', anyStaff, validate(idParams, 'params'), validate(updateJobSchema), async (req, res) => {
  res.json(await updateJob(id(req), req.body));
});
adminRoutes.delete('/jobs/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteJob(id(req));
  res.status(204).end();
});

// ───────── Job applications (private data) ─────────
adminRoutes.get('/applications', admins, validate(adminApplicationsQuery, 'query'), async (req, res) => {
  res.json(await listApplications(req.query as never));
});
adminRoutes.get('/applications/:id', admins, validate(idParams, 'params'), async (req, res) => {
  res.json(await getApplication(id(req)));
});
adminRoutes.patch('/applications/:id', admins, validate(idParams, 'params'), validate(updateApplicationSchema), async (req, res) => {
  res.json(await updateApplication(id(req), req.body));
});
adminRoutes.get('/applications/:id/cv', admins, validate(idParams, 'params'), async (req, res) => {
  const cv = await getCvFile(id(req));
  res.setHeader('Content-Type', cv.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  await new Promise<void>((resolve, reject) => {
    res.download(cv.absolutePath, safeDownloadName(cv.name), (error) => {
      if (error) reject(res.headersSent ? error : AppError.notFound('The CV file is missing', 'CV_FILE_MISSING'));
      else resolve();
    });
  });
});
adminRoutes.delete('/applications/:id', admins, validate(idParams, 'params'), async (req, res) => {
  await deleteApplication(id(req));
  res.status(204).end();
});

// ───────── Messages ─────────
adminRoutes.get('/messages', admins, validate(adminMessagesQuery, 'query'), async (req, res) => {
  res.json(await listMessages(req.query as never));
});
adminRoutes.get('/messages/:id', admins, validate(idParams, 'params'), async (req, res) => {
  res.json(await getMessage(id(req)));
});
adminRoutes.patch('/messages/:id', admins, validate(idParams, 'params'), validate(updateMessageSchema), async (req, res) => {
  res.json(await setMessageRead(id(req), req.body.isRead));
});
adminRoutes.delete('/messages/:id', admins, validate(idParams, 'params'), async (req, res) => {
  await deleteMessage(id(req));
  res.status(204).end();
});

// ───────── Notifications ─────────
adminRoutes.get('/notifications', admins, validate(notificationsQuery, 'query'), async (req, res) => {
  res.json(await listNotifications(req.query as never));
});
adminRoutes.post('/notifications/read-all', admins, async (_req, res) => {
  res.json({ updated: await markAllNotificationsRead() });
});
adminRoutes.patch('/notifications/:id/read', admins, validate(idParams, 'params'), async (req, res) => {
  await markNotificationRead(id(req));
  res.status(204).end();
});

// ───────── Media library ─────────
adminRoutes.get('/media', anyStaff, validate(mediaQuery, 'query'), async (req, res) => {
  res.json(await listMedia(req.query as never));
});
adminRoutes.post('/media', anyStaff, mediaUpload, async (req, res) => {
  res.status(201).json(await uploadMedia(req.file));
});
adminRoutes.post('/media/:id/replace', anyStaff, validate(idParams, 'params'), mediaUpload, async (req, res) => {
  res.json(await replaceMedia(id(req), req.file));
});
adminRoutes.patch('/media/:id', anyStaff, validate(idParams, 'params'), validate(updateMediaSchema), async (req, res) => {
  res.json(await updateMedia(id(req), req.body));
});
adminRoutes.delete('/media/:id', anyStaff, validate(idParams, 'params'), async (req, res) => {
  await deleteMedia(id(req));
  res.status(204).end();
});

// ───────── Company, WhatsApp, settings ─────────
adminRoutes.get('/company', admins, async (_req, res) => {
  res.json(await getCompany());
});
adminRoutes.put('/company', admins, validate(updateCompanySchema), async (req, res) => {
  res.json(await updateCompany(req.body));
});
adminRoutes.get('/whatsapp', admins, async (_req, res) => {
  res.json(await listWhatsAppChannels());
});
adminRoutes.put('/whatsapp', admins, validate(updateWhatsAppSchema), async (req, res) => {
  res.json(await saveWhatsAppChannels(req.body.channels));
});
adminRoutes.get('/settings', admins, async (_req, res) => {
  res.json(await listSettings());
});
adminRoutes.put('/settings/:key', admins, validate(settingKeyParams, 'params'), validate(updateSettingSchema), async (req, res) => {
  res.json(await saveSetting(req.params['key'] as string, req.body.value));
});

// ───────── Users (super admin only) ─────────
adminRoutes.get('/users', superAdmin, validate(paginationQuery.partial(), 'query'), async (_req, res) => {
  res.json(await listUsers());
});
adminRoutes.post('/users', superAdmin, validate(createUserSchema), async (req, res) => {
  res.status(201).json(await createUser(req.body));
});
adminRoutes.patch('/users/:id', superAdmin, validate(idParams, 'params'), validate(updateUserSchema), async (req, res) => {
  res.json(await updateUser(id(req), req.user!.id, req.body));
});
adminRoutes.delete('/users/:id', superAdmin, validate(idParams, 'params'), async (req, res) => {
  await deleteUser(id(req), req.user!.id);
  res.status(204).end();
});
