import type { LandStatus, Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { splitOpt } from '../lib/localized.js';
import { prisma } from '../lib/prisma.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { toLand } from '../serializers/index.js';
import type { z } from 'zod';
import type { createLandSchema, updateLandSchema } from '../validators/admin.validators.js';

type CreateInput = z.infer<typeof createLandSchema>;
type UpdateInput = z.infer<typeof updateLandSchema>;

function columns(i: UpdateInput) {
  const area = i.area && splitOpt(i.area);
  return {
    ...(i.title && { titleAr: i.title.ar, titleEn: i.title.en }),
    ...(area && { areaAr: area.ar, areaEn: area.en }),
    ...(i.description && { description: i.description as Prisma.InputJsonValue }),
    ...(i.location && { locationAr: i.location.ar, locationEn: i.location.en }),
    ...(i.featuredImage && { featuredImageUrl: i.featuredImage }),
    ...(i.gallery && { gallery: i.gallery as Prisma.InputJsonValue }),
    ...(i.features && { features: i.features as Prisma.InputJsonValue }),
    ...(i.contactPhone && { contactPhone: i.contactPhone }),
    ...(i.whatsappNumber && { whatsappNumber: i.whatsappNumber }),
    ...(i.status && { status: i.status.toUpperCase() as LandStatus }),
    ...(i.published !== undefined && { published: i.published }),
    ...(i.sortOrder !== undefined && { sortOrder: i.sortOrder }),
  };
}

const slugTaken = (slug: string, exceptId?: string) =>
  prisma.landListing.count({ where: { slug, ...(exceptId && { NOT: { id: exceptId } }) } }).then(Boolean);

export async function listPublicLands() {
  const rows = await prisma.landListing.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(toLand);
}

export async function getPublicLand(slug: string) {
  const row = await prisma.landListing.findFirst({ where: { slug, published: true } });
  if (!row) throw AppError.notFound('Land listing not found', 'LAND_NOT_FOUND');
  return toLand(row);
}

export async function listAdminLands() {
  const rows = await prisma.landListing.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(toLand);
}

export async function getAdminLand(id: string) {
  const row = await prisma.landListing.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Land listing not found', 'LAND_NOT_FOUND');
  return toLand(row);
}

export async function createLand(input: CreateInput) {
  const slug = await uniqueSlug(input.slug ?? slugify(input.title!.en, 'land'), (s) => slugTaken(s));
  const row = await prisma.landListing.create({
    data: { ...columns(input), slug } as Prisma.LandListingCreateInput,
  });
  return toLand(row);
}

export async function updateLand(id: string, input: UpdateInput) {
  if (input.slug && (await slugTaken(input.slug, id))) throw new AppError(409, 'SLUG_TAKEN', 'This slug is already used');
  const row = await prisma.landListing.update({
    where: { id },
    data: { ...columns(input), ...(input.slug && { slug: input.slug }) },
  });
  return toLand(row);
}

export async function deleteLand(id: string) {
  await prisma.landListing.delete({ where: { id } });
}
