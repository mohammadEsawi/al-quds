import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.js';
import { weakPasswordReason } from '../lib/passwordPolicy.js';
import {
  assetUrl,
  localizedList,
  localizedOptional,
  localizedRequired,
  optionalAssetUrl,
  slugSchema,
  sortOrder,
} from './common.js';

const id = z.string().min(1).max(64);
const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

export const productSectors = ['water', 'plastic', 'preforms', 'caps', 'food'] as const;

// ───────── Products ─────────

const productShape = {
  sector: z.enum(productSectors),
  slug: slugSchema,
  name: localizedRequired,
  /** Display label shown on cards ("Bottled drinking water"). */
  category: localizedOptional,
  categoryId: id.nullable(),
  shortDescription: localizedRequired,
  description: localizedRequired,
  image: optionalAssetUrl,
  secondaryImage: optionalAssetUrl,
  videoUrl: optionalAssetUrl,
  gallery: z.array(assetUrl).max(30),
  size: localizedOptional,
  tag: localizedOptional,
  sku: z.string().trim().max(80).nullable(),
  specs: z.array(z.object({ label: localizedRequired, value: localizedRequired })).max(40),
  features: localizedList,
  labelIds: z.array(id).max(50),
  featured: z.boolean(),
  status: z.enum(['draft', 'published', 'hidden']),
  sortOrder,
  isPlaceholder: z.boolean(),
};

export const createProductSchema = z
  .object(productShape)
  .partial()
  .required({ sector: true, name: true, shortDescription: true, description: true });
export const updateProductSchema = z.object(productShape).partial();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const adminProductsQuery = paginationQuery.extend({
  sector: z.enum(productSectors).optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
  featured: bool.optional(),
  q: z.string().trim().max(100).optional(),
});

export const reorderSchema = z.object({
  items: z.array(z.object({ id, sortOrder })).min(1).max(500),
});

export const categorySchema = z.object({
  slug: slugSchema,
  sector: z.enum(productSectors).nullable(),
  name: localizedRequired,
  sortOrder,
});

export const waterLabelSchema = z.object({
  name: localizedRequired,
  image: optionalAssetUrl,
  active: z.boolean(),
  sortOrder,
});

export const sectorUpdateSchema = z
  .object({
    name: localizedRequired,
    description: localizedRequired,
    image: optionalAssetUrl,
    active: z.boolean(),
    sortOrder,
  })
  .partial();

// ───────── Real estate ─────────

const phone = z.string().trim().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number');
const waNumber = z.string().trim().regex(/^\d{7,15}$/, 'Digits only, with country code');

const realEstateShape = {
  slug: slugSchema,
  name: localizedRequired,
  tagline: localizedOptional,
  description: localizedList,
  location: localizedRequired,
  featuredImage: assetUrl,
  gallery: z.array(z.object({ src: assetUrl, caption: localizedOptional })).max(60),
  features: localizedList,
  contactPhone: phone,
  whatsappNumber: waNumber,
  status: z.enum(['planning', 'construction', 'available', 'sold']),
  published: z.boolean(),
  sortOrder,
};
export const createRealEstateSchema = z
  .object(realEstateShape)
  .partial()
  .required({ name: true, location: true, featuredImage: true, contactPhone: true, whatsappNumber: true });
export const updateRealEstateSchema = z.object(realEstateShape).partial();

// ───────── Jobs ─────────

const jobShape = {
  slug: slugSchema,
  title: localizedRequired,
  department: localizedRequired,
  location: localizedRequired,
  employmentType: z.enum(['fullTime', 'partTime', 'contract', 'internship']),
  description: localizedRequired,
  responsibilities: localizedList,
  requirements: localizedList,
  benefits: localizedList,
  deadline: z.iso.date().nullable(),
  status: z.enum(['draft', 'open', 'closed']),
  isPlaceholder: z.boolean(),
};
export const createJobSchema = z
  .object(jobShape)
  .partial()
  .required({ title: true, department: true, location: true, description: true });
export const updateJobSchema = z.object(jobShape).partial();

export const adminJobsQuery = paginationQuery.extend({
  status: z.enum(['draft', 'open', 'closed']).optional(),
  q: z.string().trim().max(100).optional(),
});

// ───────── Company leadership ─────────

const teamShape = {
  group: z.enum(['board', 'executive']),
  role: z.enum(['chairman', 'general_manager', 'member']),
  name: localizedOptional,
  title: localizedRequired,
  department: localizedOptional,
  bio: localizedList,
  message: localizedOptional,
  photo: optionalAssetUrl,
  published: z.boolean(),
  sortOrder,
  isPlaceholder: z.boolean(),
};
export const createTeamMemberSchema = z.object(teamShape).partial().required({ group: true, title: true });
export const updateTeamMemberSchema = z.object(teamShape).partial();

// ───────── Applications, messages, notifications ─────────

export const applicationStatuses = ['new', 'reviewed', 'shortlisted', 'interview', 'rejected', 'accepted'] as const;

export const adminApplicationsQuery = paginationQuery.extend({
  status: z.enum(applicationStatuses).optional(),
  jobId: id.optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateApplicationSchema = z
  .object({ status: z.enum(applicationStatuses), notes: z.string().trim().max(4000).nullable() })
  .partial();

export const adminMessagesQuery = paginationQuery.extend({
  unread: bool.optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateMessageSchema = z.object({ isRead: z.boolean() });

export const notificationsQuery = paginationQuery.extend({ unread: bool.optional() });

// ───────── Media ─────────

export const mediaQuery = paginationQuery.extend({
  kind: z.enum(['image', 'video', 'document']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateMediaSchema = z.object({ alt: localizedOptional }).partial();

// ───────── Company & settings ─────────

const iconKeys = z.enum(['shield', 'check', 'moon', 'users', 'bolt', 'globe']);

const companyShape = {
  name: localizedRequired,
  legalName: localizedRequired,
  founded: z.number().int().min(1800).max(2100),
  address: localizedRequired,
  phone,
  phoneDisplay: z.string().trim().min(3).max(40),
  email: z.email(),
  hours: localizedRequired,
  logo: optionalAssetUrl,
  logoDark: optionalAssetUrl,
  logoMobile: optionalAssetUrl,
  favicon: optionalAssetUrl,
  mapEmbedUrl: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/(www\.)?google\.com\/maps\/embed\?[^\s]*$/, 'Must be a Google Maps embed URL')
    .nullish()
    .transform((v) => v || null),
  social: z.object({ facebook: optionalAssetUrl, instagram: optionalAssetUrl, linkedin: optionalAssetUrl }).partial(),
  about: localizedList,
  mission: localizedRequired,
  vision: localizedRequired,
  values: z.array(z.object({ icon: iconKeys, title: localizedRequired, text: localizedRequired })).max(24),
  milestones: z
    .array(z.object({ year: z.string().trim().min(2).max(10), title: localizedRequired, text: localizedRequired }))
    .max(40),
  standards: z.array(z.object({ icon: iconKeys, title: localizedRequired, text: localizedRequired })).max(24),
  stats: z
    .array(
      z.object({
        key: z.enum(['years', 'cities', 'bottles', 'team']),
        value: z.number().min(0).max(1e12),
        suffix: z.string().trim().max(6),
      }),
    )
    .max(8),
  cities: z.array(localizedRequired).max(150),
};
export const updateCompanySchema = z.object(companyShape).partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const whatsappChannels = ['GENERAL', 'WATER', 'PLASTIC', 'PREFORMS', 'CAPS', 'FOOD', 'REAL_ESTATE', 'JOBS'] as const;
export const updateWhatsAppSchema = z.object({
  channels: z
    .array(
      z.object({
        channel: z.enum(whatsappChannels),
        number: waNumber,
        message: localizedRequired,
        isActive: z.boolean(),
      }),
    )
    .min(1)
    .max(whatsappChannels.length),
});

export const settingKeyParams = z.object({ key: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,59}$/) });
export const quoteStatuses = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

export const adminQuotesQuery = paginationQuery.extend({
  status: z.enum(quoteStatuses).optional(),
  unread: bool.optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateQuoteSchema = z
  .object({ status: z.enum(quoteStatuses), notes: z.string().trim().max(4000).nullable(), isRead: z.boolean() })
  .partial();

export const auditQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
});

export const updateSettingSchema = z.object({ value: z.json() });

/** Setting keys that the public website may read. Everything else stays admin-only. */
export const PUBLIC_SETTING_KEYS = ['water.overview', 'food.overview', 'home.content', 'about.page', 'legal.privacy', 'legal.terms'] as const;

// ───────── Users ─────────

const password = z
  .string()
  .min(12, 'At least 12 characters')
  .max(200)
  .superRefine((value, ctx) => {
    const reason = weakPasswordReason(value);
    if (reason) ctx.addIssue({ code: 'custom', message: reason });
  });
const role = z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(2).max(120),
  password,
  role,
});
export const updateUserSchema = z
  .object({ name: z.string().trim().min(2).max(120), role, isActive: z.boolean(), password, resetTwoFactor: z.literal(true) })
  .partial();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: password });
