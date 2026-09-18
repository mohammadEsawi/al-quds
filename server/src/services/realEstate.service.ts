import type { Prisma, RealEstateStatus } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { splitOpt } from '../lib/localized.js';
import { prisma } from '../lib/prisma.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { toRealEstate } from '../serializers/index.js';
import type { z } from 'zod';
import type { createRealEstateSchema, updateRealEstateSchema } from '../validators/admin.validators.js';

type CreateInput = z.infer<typeof createRealEstateSchema>;
type UpdateInput = z.infer<typeof updateRealEstateSchema>;

function columns(i: UpdateInput) {
  const tagline = i.tagline && splitOpt(i.tagline);
  return {
    ...(i.name && { nameAr: i.name.ar, nameEn: i.name.en }),
    ...(tagline && { taglineAr: tagline.ar, taglineEn: tagline.en }),
    ...(i.description && { description: i.description as Prisma.InputJsonValue }),
    ...(i.location && { locationAr: i.location.ar, locationEn: i.location.en }),
    ...(i.featuredImage && { featuredImageUrl: i.featuredImage }),
    ...(i.gallery && { gallery: i.gallery as Prisma.InputJsonValue }),
    ...(i.features && { features: i.features as Prisma.InputJsonValue }),
    ...(i.contactPhone && { contactPhone: i.contactPhone }),
    ...(i.whatsappNumber && { whatsappNumber: i.whatsappNumber }),
    ...(i.status && { status: i.status.toUpperCase() as RealEstateStatus }),
    ...(i.published !== undefined && { published: i.published }),
    ...(i.sortOrder !== undefined && { sortOrder: i.sortOrder }),
  };
}

const slugTaken = (slug: string, exceptId?: string) =>
  prisma.realEstateProject.count({ where: { slug, ...(exceptId && { NOT: { id: exceptId } }) } }).then(Boolean);

export async function listPublicProjects() {
  const rows = await prisma.realEstateProject.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(toRealEstate);
}

export async function getPublicProject(slug: string) {
  const row = await prisma.realEstateProject.findFirst({ where: { slug, published: true } });
  if (!row) throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
  return toRealEstate(row);
}

export async function listAdminProjects() {
  const rows = await prisma.realEstateProject.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(toRealEstate);
}

export async function getAdminProject(id: string) {
  const row = await prisma.realEstateProject.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
  return toRealEstate(row);
}

export async function createProject(input: CreateInput) {
  const slug = await uniqueSlug(input.slug ?? slugify(input.name!.en, 'project'), (s) => slugTaken(s));
  const row = await prisma.realEstateProject.create({
    data: { ...columns(input), slug } as Prisma.RealEstateProjectCreateInput,
  });
  return toRealEstate(row);
}

export async function updateProject(id: string, input: UpdateInput) {
  if (input.slug && (await slugTaken(input.slug, id))) throw new AppError(409, 'SLUG_TAKEN', 'This slug is already used');
  const row = await prisma.realEstateProject.update({
    where: { id },
    data: { ...columns(input), ...(input.slug && { slug: input.slug }) },
  });
  return toRealEstate(row);
}

export async function deleteProject(id: string) {
  await prisma.realEstateProject.delete({ where: { id } });
}
