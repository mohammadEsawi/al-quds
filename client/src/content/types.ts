import type { LocalizedText } from '@/i18n/types';

/**
 * Content models. They mirror the Prisma models planned for the database so the
 * static seed in this folder can be swapped for API responses without touching components.
 */

export type ProductSector = 'water' | 'plastic' | 'preforms' | 'caps' | 'food';
export type SectorKey = ProductSector | 'real-estate' | 'investment';

export interface Sector {
  key: SectorKey;
  /** Public route, without the language prefix. */
  path: string;
  number: string;
  name: LocalizedText;
  description: LocalizedText;
  image?: string;
  /** Lucide icon name, resolved in the UI layer. */
  icon: 'droplets' | 'factory' | 'flask' | 'circle-dot' | 'wheat' | 'building' | 'trending-up';
}

export interface ProductSpec {
  label: LocalizedText;
  value: LocalizedText;
}

export interface Product {
  id: string;
  slug: string;
  sector: ProductSector;
  name: LocalizedText;
  category: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  image?: string;
  secondaryImage?: string;
  gallery: string[];
  size?: LocalizedText;
  tag?: LocalizedText;
  sku?: string;
  specs: ProductSpec[];
  features: LocalizedText[];
  featured: boolean;
  /** Placeholder entries are shown with a "sample" badge until real data is uploaded. */
  isPlaceholder?: boolean;
}

export interface WaterLabel {
  id: string;
  name: LocalizedText;
  image?: string;
  active: boolean;
}

export interface Milestone {
  year: string;
  title: LocalizedText;
  text: LocalizedText;
}

export interface CompanyValue {
  icon: 'shield' | 'check' | 'moon' | 'users' | 'bolt' | 'globe';
  title: LocalizedText;
  text: LocalizedText;
}

export interface Standard {
  icon: 'check' | 'shield' | 'moon' | 'globe';
  title: LocalizedText;
  text: LocalizedText;
}

export interface CompanyStat {
  key: 'years' | 'cities' | 'bottles' | 'team';
  value: number;
  suffix: string;
}

export interface WhatsAppChannel {
  number: string;
  message: LocalizedText;
}

export interface CompanyInfo {
  name: LocalizedText;
  legalName: LocalizedText;
  founded: number;
  address: LocalizedText;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: LocalizedText;
  logo: string;
  mapEmbedUrl: string;
  social: { facebook?: string; instagram?: string; linkedin?: string };
  about: LocalizedText[];
  mission: LocalizedText;
  vision: LocalizedText;
  values: CompanyValue[];
  milestones: Milestone[];
  standards: Standard[];
  stats: CompanyStat[];
  cities: LocalizedText[];
  whatsapp: {
    general: WhatsAppChannel;
    water: WhatsAppChannel;
    realEstate: WhatsAppChannel;
    jobs: WhatsAppChannel;
  } & Partial<Record<'plastic' | 'preforms' | 'caps' | 'food', WhatsAppChannel>>;
}

/** Homepage texts the admin can override (the `home.content` setting). Missing fields use the built-in text. */
export interface HomeContent {
  hero?: Partial<Record<'overline' | 'title' | 'subtitle' | 'ctaSectors' | 'ctaContact', LocalizedText>>;
}

export interface GalleryImage {
  src: string;
  caption: LocalizedText;
}

export interface RealEstateProject {
  id: string;
  slug: string;
  name: LocalizedText;
  tagline?: LocalizedText;
  description: LocalizedText[];
  location: LocalizedText;
  featuredImage: string;
  gallery: GalleryImage[];
  features: LocalizedText[];
  contactPhone: string;
  whatsappNumber: string;
  status: 'planning' | 'construction' | 'available' | 'sold';
}

export type EmploymentType = 'fullTime' | 'partTime' | 'contract' | 'internship';

export interface Job {
  id: string;
  slug: string;
  title: LocalizedText;
  department: LocalizedText;
  location: LocalizedText;
  employmentType: EmploymentType;
  description: LocalizedText;
  responsibilities: LocalizedText[];
  requirements: LocalizedText[];
  benefits: LocalizedText[];
  /** ISO date (YYYY-MM-DD). */
  deadline?: string;
  status: 'open' | 'closed';
  isPlaceholder?: boolean;
}

export interface LegalSection {
  heading: LocalizedText;
  paragraphs?: LocalizedText[];
  items?: LocalizedText[];
}

export interface LegalDocument {
  updated: LocalizedText;
  sections: LegalSection[];
}
