import type {
  CompanyInfo,
  EmploymentType,
  Job,
  Prisma,
  RealEstateProject,
  RealEstateStatus,
  Sector,
  WaterLabel,
  WhatsAppSetting,
} from '../generated/prisma/client.js';
import { loc, locOpt, type Localized } from '../lib/localized.js';

/**
 * Database rows → the JSON shape used by the website and the admin dashboard.
 * Column pairs (nameAr / nameEn) become `{ ar, en }`; enums become lower/camel case.
 */

const list = <T>(value: Prisma.JsonValue): T[] => (Array.isArray(value) ? (value as unknown as T[]) : []);

// ───────── Products ─────────

export const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  labels: { select: { id: true } },
} satisfies Prisma.ProductInclude;

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function toProduct(p: ProductRow) {
  return {
    id: p.id,
    slug: p.slug,
    sector: p.sector.toLowerCase(),
    categoryId: p.categoryId,
    name: loc(p.nameAr, p.nameEn),
    category: loc(p.categoryLabelAr ?? '', p.categoryLabelEn ?? ''),
    shortDescription: loc(p.shortDescriptionAr, p.shortDescriptionEn),
    description: loc(p.descriptionAr, p.descriptionEn),
    image: p.imageUrl ?? undefined,
    secondaryImage: p.secondaryImageUrl ?? undefined,
    videoUrl: p.videoUrl ?? undefined,
    gallery: p.images.map((i) => i.url),
    size: locOpt(p.sizeAr, p.sizeEn),
    tag: locOpt(p.tagAr, p.tagEn),
    sku: p.sku ?? undefined,
    specs: list<{ label: Localized; value: Localized }>(p.specs),
    features: list<Localized>(p.features),
    labelIds: p.labels.map((l) => l.id),
    featured: p.featured,
    status: p.status.toLowerCase(),
    sortOrder: p.sortOrder,
    isPlaceholder: p.isSample,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toWaterLabel(l: WaterLabel) {
  return {
    id: l.id,
    name: loc(l.nameAr, l.nameEn),
    image: l.imageUrl ?? undefined,
    active: l.isActive,
    sortOrder: l.sortOrder,
  };
}

export function toCategory(c: { id: string; slug: string; sector: string | null; nameAr: string; nameEn: string; sortOrder: number }) {
  return { id: c.id, slug: c.slug, sector: c.sector?.toLowerCase() ?? null, name: loc(c.nameAr, c.nameEn), sortOrder: c.sortOrder };
}

export function toSector(s: Sector) {
  return {
    id: s.id,
    key: s.key,
    path: s.path,
    number: s.number,
    icon: s.icon,
    name: loc(s.nameAr, s.nameEn),
    description: loc(s.descriptionAr, s.descriptionEn),
    image: s.imageUrl ?? undefined,
    active: s.isActive,
    sortOrder: s.sortOrder,
  };
}

// ───────── Real estate ─────────

export function toRealEstate(p: RealEstateProject) {
  return {
    id: p.id,
    slug: p.slug,
    name: loc(p.nameAr, p.nameEn),
    tagline: locOpt(p.taglineAr, p.taglineEn),
    description: list<Localized>(p.description),
    location: loc(p.locationAr, p.locationEn),
    featuredImage: p.featuredImageUrl,
    gallery: list<{ src: string; caption: Localized }>(p.gallery),
    features: list<Localized>(p.features),
    contactPhone: p.contactPhone,
    whatsappNumber: p.whatsappNumber,
    status: p.status.toLowerCase() as Lowercase<RealEstateStatus>,
    published: p.published,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ───────── Jobs ─────────

const employmentOut: Record<EmploymentType, string> = {
  FULL_TIME: 'fullTime',
  PART_TIME: 'partTime',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
};
export const employmentIn: Record<string, EmploymentType> = {
  fullTime: 'FULL_TIME',
  partTime: 'PART_TIME',
  contract: 'CONTRACT',
  internship: 'INTERNSHIP',
};

export function toJob(j: Job) {
  return {
    id: j.id,
    slug: j.slug,
    title: loc(j.titleAr, j.titleEn),
    department: loc(j.departmentAr, j.departmentEn),
    location: loc(j.locationAr, j.locationEn),
    employmentType: employmentOut[j.employmentType],
    description: loc(j.descriptionAr, j.descriptionEn),
    responsibilities: list<Localized>(j.responsibilities),
    requirements: list<Localized>(j.requirements),
    benefits: list<Localized>(j.benefits),
    deadline: j.deadline ? j.deadline.toISOString().slice(0, 10) : undefined,
    status: j.status.toLowerCase(),
    isPlaceholder: j.isSample,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

// ───────── Company ─────────

const channelKey: Record<string, string> = {
  GENERAL: 'general',
  WATER: 'water',
  PLASTIC: 'plastic',
  PREFORMS: 'preforms',
  CAPS: 'caps',
  FOOD: 'food',
  REAL_ESTATE: 'realEstate',
  JOBS: 'jobs',
};

export function toWhatsApp(rows: WhatsAppSetting[]) {
  const result: Record<string, { number: string; message: Localized }> = {};
  for (const row of rows) {
    if (!row.isActive) continue;
    result[channelKey[row.channel] ?? row.channel.toLowerCase()] = {
      number: row.number,
      message: loc(row.messageAr, row.messageEn),
    };
  }
  return result;
}

export function toCompany(c: CompanyInfo, whatsapp: WhatsAppSetting[]) {
  return {
    name: loc(c.nameAr, c.nameEn),
    legalName: loc(c.legalNameAr, c.legalNameEn),
    founded: c.founded,
    address: loc(c.addressAr, c.addressEn),
    phone: c.phone,
    phoneDisplay: c.phoneDisplay,
    email: c.email,
    hours: loc(c.hoursAr, c.hoursEn),
    logo: c.logoLightUrl ?? '',
    logoDark: c.logoDarkUrl ?? undefined,
    logoMobile: c.logoMobileUrl ?? undefined,
    favicon: c.faviconUrl ?? undefined,
    mapEmbedUrl: c.mapEmbedUrl ?? '',
    social: {
      facebook: c.facebookUrl ?? undefined,
      instagram: c.instagramUrl ?? undefined,
      linkedin: c.linkedinUrl ?? undefined,
    },
    about: list<Localized>(c.about),
    mission: loc(c.missionAr, c.missionEn),
    vision: loc(c.visionAr, c.visionEn),
    values: list(c.values),
    milestones: list(c.milestones),
    standards: list(c.standards),
    stats: list(c.stats),
    cities: list<Localized>(c.cities),
    whatsapp: toWhatsApp(whatsapp),
    updatedAt: c.updatedAt,
  };
}
