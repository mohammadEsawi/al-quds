import axios from 'axios';
import { api } from '@/api/client';
import { company as seedCompany } from '@/content/company';
import { jobs as seedJobs } from '@/content/jobs';
import { privacyPolicy, termsOfUse } from '@/content/legal';
import { products as seedProducts, waterLabels as seedLabels, waterOverview, foodOverview } from '@/content/products';
import { realEstateProjects as seedProjects } from '@/content/realEstate';
import { sectors as seedSectors } from '@/content/sectors';
import type {
  CompanyInfo,
  HomeContent,
  Job,
  LegalDocument,
  Product,
  ProductSector,
  RealEstateProject,
  Sector,
  WaterLabel,
} from '@/content/types';

/**
 * Data access layer.
 *
 * Content comes from the REST API (PostgreSQL). If the API is unreachable, or answers with a server
 * error, the site falls back to the built-in seed in `src/content` so it never goes blank.
 * "Not found" answers are real answers and are NOT masked by the seed.
 */

async function load<T>(path: string, fallback: () => T, params?: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await api.get<T>(path, { params });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status < 500) throw error;
    if (import.meta.env.DEV) console.warn(`[content] API unavailable for ${path} — using the built-in seed`);
    return fallback();
  }
}

/** Like `load`, but a 404 becomes `undefined` so pages can render their "not found" state. */
async function loadOne<T>(path: string, fallback: () => T | undefined): Promise<T | undefined> {
  try {
    return await load<T | undefined>(path, fallback);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return undefined;
    throw error;
  }
}

export async function getCompany(): Promise<CompanyInfo> {
  const company = await load<CompanyInfo>('/company', () => seedCompany);
  // An empty logo setting must not produce a broken <img>.
  return company.logo ? company : { ...company, logo: seedCompany.logo };
}

export const getSectors = (): Promise<Sector[]> => load<Sector[]>('/sectors', () => seedSectors);

export function getProducts(filter?: { sector?: ProductSector; featured?: boolean }): Promise<Product[]> {
  return load<Product[]>(
    '/products',
    () =>
      seedProducts.filter(
        (p) => (!filter?.sector || p.sector === filter.sector) && (!filter?.featured || p.featured),
      ),
    filter,
  );
}

export const getProduct = (slug: string): Promise<Product | undefined> =>
  loadOne<Product>(`/products/${encodeURIComponent(slug)}`, () => seedProducts.find((p) => p.slug === slug));

export const getWaterLabels = (): Promise<WaterLabel[]> => load<WaterLabel[]>('/water/labels', () => seedLabels.filter((l) => l.active));

export const getWaterOverview = (): Promise<typeof waterOverview> => load('/settings/water.overview', () => waterOverview);
export const getFoodOverview = (): Promise<typeof foodOverview> => load('/settings/food.overview', () => foodOverview);

export const getRealEstateProjects = (): Promise<RealEstateProject[]> =>
  load<RealEstateProject[]>('/real-estate', () => seedProjects);

export const getRealEstateProject = (slug: string): Promise<RealEstateProject | undefined> =>
  loadOne<RealEstateProject>(`/real-estate/${encodeURIComponent(slug)}`, () => seedProjects.find((p) => p.slug === slug));

export const getJobs = (): Promise<Job[]> => load<Job[]>('/jobs', () => seedJobs.filter((j) => j.status === 'open'));

export const getJob = (slug: string): Promise<Job | undefined> =>
  loadOne<Job>(`/jobs/${encodeURIComponent(slug)}`, () => seedJobs.find((j) => j.slug === slug));

export const getLegalDocument = (kind: 'privacy' | 'terms'): Promise<LegalDocument> =>
  load<LegalDocument>(`/settings/legal.${kind}`, () => (kind === 'privacy' ? privacyPolicy : termsOfUse));

/** Admin-edited homepage texts. No setting saved yet (404) or an unreachable API both mean "use the defaults". */
export async function getHomeContent(): Promise<HomeContent> {
  try {
    return await load<HomeContent>('/settings/home.content', () => ({}));
  } catch {
    return {};
  }
}
