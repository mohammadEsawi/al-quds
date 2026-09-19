import type { LocalizedText } from '@/i18n/types';

/** Shapes returned by `/api/admin/*` (they mirror the public shapes plus admin-only fields). */

export type Loc = LocalizedText;
export const emptyLoc = (): Loc => ({ ar: '', en: '' });

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export type ProductSectorKey = 'water' | 'plastic' | 'preforms' | 'caps' | 'food';
export type ContentStatus = 'draft' | 'published' | 'hidden';

export interface ProductSpecDTO {
  label: Loc;
  value: Loc;
}

export interface ProductDTO {
  id: string;
  slug: string;
  sector: ProductSectorKey;
  categoryId: string | null;
  name: Loc;
  category: Loc;
  shortDescription: Loc;
  description: Loc;
  image?: string;
  secondaryImage?: string;
  videoUrl?: string;
  gallery: string[];
  size?: Loc;
  tag?: Loc;
  sku?: string;
  specs: ProductSpecDTO[];
  features: Loc[];
  labelIds: string[];
  featured: boolean;
  status: ContentStatus;
  sortOrder: number;
  isPlaceholder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  sector: ProductSectorKey | null;
  name: Loc;
  sortOrder: number;
}

export interface WaterLabelDTO {
  id: string;
  name: Loc;
  image?: string;
  active: boolean;
  sortOrder: number;
}

export interface SectorDTO {
  id: string;
  key: string;
  path: string;
  number: string;
  icon: string;
  name: Loc;
  description: Loc;
  image?: string;
  active: boolean;
  sortOrder: number;
}

export type RealEstateStatus = 'planning' | 'construction' | 'available' | 'sold';

export interface RealEstateDTO {
  id: string;
  slug: string;
  name: Loc;
  tagline?: Loc;
  description: Loc[];
  location: Loc;
  featuredImage: string;
  gallery: { src: string; caption: Loc }[];
  features: Loc[];
  contactPhone: string;
  whatsappNumber: string;
  status: RealEstateStatus;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
}

export type EmploymentTypeKey = 'fullTime' | 'partTime' | 'contract' | 'internship';
export type JobStatusKey = 'draft' | 'open' | 'closed';

export interface JobDTO {
  id: string;
  slug: string;
  title: Loc;
  department: Loc;
  location: Loc;
  employmentType: EmploymentTypeKey;
  description: Loc;
  responsibilities: Loc[];
  requirements: Loc[];
  benefits: Loc[];
  deadline?: string;
  status: JobStatusKey;
  isPlaceholder: boolean;
  createdAt: string;
}

export type ApplicationStatusKey = 'new' | 'reviewed' | 'shortlisted' | 'interview' | 'rejected' | 'accepted';

export interface ApplicationDTO {
  id: string;
  job: { id: string; slug: string; title: Loc } | null;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  position: string;
  education: string;
  experience: string;
  message?: string;
  linkedin?: string;
  portfolio?: string;
  cv: { name: string; mimeType: string; size: number; downloadUrl: string };
  status: ApplicationStatusKey;
  notes?: string;
  whatsappUrl: string | null;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  whatsappUrl: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: 'contact_message' | 'job_application' | 'product_inquiry';
  title: string;
  body?: string | null;
  refId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MediaDTO {
  id: string;
  kind: 'image' | 'video' | 'document';
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: Loc;
  createdAt: string;
}

export interface CompanyDTO {
  name: Loc;
  legalName: Loc;
  founded: number;
  address: Loc;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: Loc;
  logo: string;
  logoDark?: string;
  logoMobile?: string;
  favicon?: string;
  mapEmbedUrl: string;
  social: { facebook?: string; instagram?: string; linkedin?: string };
  about: Loc[];
  mission: Loc;
  vision: Loc;
  values: { icon: string; title: Loc; text: Loc }[];
  milestones: { year: string; title: Loc; text: Loc }[];
  standards: { icon: string; title: Loc; text: Loc }[];
  stats: { key: 'years' | 'cities' | 'bottles' | 'team'; value: number; suffix: string }[];
  cities: Loc[];
}

export const WHATSAPP_CHANNELS = ['GENERAL', 'WATER', 'PLASTIC', 'PREFORMS', 'CAPS', 'FOOD', 'REAL_ESTATE', 'JOBS'] as const;
export type WhatsAppChannelKey = (typeof WHATSAPP_CHANNELS)[number];

export interface WhatsAppChannelDTO {
  channel: WhatsAppChannelKey;
  number: string;
  message: Loc;
  isActive: boolean;
}

export interface SettingDTO {
  key: string;
  value: unknown;
  isPublic: boolean;
  updatedAt: string;
}

export interface DashboardDTO {
  totals: {
    products: number;
    waterProducts: number;
    plasticProducts: number;
    foodProducts: number;
    realEstateProjects: number;
    activeJobs: number;
    applications: number;
    newApplications: number;
    unreadMessages: number;
    unreadNotifications: number;
  };
  applicationsByStatus: { status: ApplicationStatusKey; count: number }[];
  activity: {
    applications: { date: string; count: number }[];
    messages: { date: string; count: number }[];
  };
  recent: {
    application: { id: string; fullName: string; position: string; status: ApplicationStatusKey; createdAt: string } | null;
    message: { id: string; name: string; subject?: string; isRead: boolean; whatsappUrl: string | null; createdAt: string } | null;
    product: ProductDTO | null;
    job: JobDTO | null;
  };
}

export type { HomeContent as HomeContentDTO } from '@/content/types';
