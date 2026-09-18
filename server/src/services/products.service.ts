import type { ContentStatus, Prisma, ProductSector } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { splitOpt } from '../lib/localized.js';
import { pageArgs, type Page } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { productInclude, toCategory, toProduct, toSector, toWaterLabel } from '../serializers/index.js';
import type { CreateProductInput, UpdateProductInput } from '../validators/admin.validators.js';

const status = { draft: 'DRAFT', published: 'PUBLISHED', hidden: 'HIDDEN' } as const satisfies Record<string, ContentStatus>;

/** Maps API input to table columns. Only keys present in the input are touched (partial updates). */
function columns(i: UpdateProductInput) {
  const category = i.category && splitOpt(i.category);
  const size = i.size && splitOpt(i.size);
  const tag = i.tag && splitOpt(i.tag);

  return {
    ...(i.sector && { sector: i.sector.toUpperCase() as ProductSector }),
    ...(i.name && { nameAr: i.name.ar, nameEn: i.name.en }),
    ...(i.shortDescription && { shortDescriptionAr: i.shortDescription.ar, shortDescriptionEn: i.shortDescription.en }),
    ...(i.description && { descriptionAr: i.description.ar, descriptionEn: i.description.en }),
    ...(category && { categoryLabelAr: category.ar, categoryLabelEn: category.en }),
    ...(size && { sizeAr: size.ar, sizeEn: size.en }),
    ...(tag && { tagAr: tag.ar, tagEn: tag.en }),
    ...(i.categoryId !== undefined && { categoryId: i.categoryId }),
    ...(i.image !== undefined && { imageUrl: i.image }),
    ...(i.secondaryImage !== undefined && { secondaryImageUrl: i.secondaryImage }),
    ...(i.videoUrl !== undefined && { videoUrl: i.videoUrl }),
    ...(i.sku !== undefined && { sku: i.sku || null }),
    ...(i.specs && { specs: i.specs as Prisma.InputJsonValue }),
    ...(i.features && { features: i.features as Prisma.InputJsonValue }),
    ...(i.featured !== undefined && { featured: i.featured }),
    ...(i.status && { status: status[i.status] }),
    ...(i.sortOrder !== undefined && { sortOrder: i.sortOrder }),
    ...(i.isPlaceholder !== undefined && { isSample: i.isPlaceholder }),
  };
}

const slugTaken = (slug: string, exceptId?: string) =>
  prisma.product.count({ where: { slug, ...(exceptId && { NOT: { id: exceptId } }) } }).then(Boolean);

// ───────── Public ─────────

export async function listPublicProducts(filter: { sector?: string; featured?: boolean }) {
  const rows = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      ...(filter.sector && { sector: filter.sector.toUpperCase() as ProductSector }),
      ...(filter.featured !== undefined && { featured: filter.featured }),
    },
    include: productInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toProduct);
}

export async function getPublicProduct(slug: string) {
  const row = await prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, include: productInclude });
  if (!row) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  return toProduct(row);
}

export async function listPublicWaterLabels() {
  const rows = await prisma.waterLabel.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map(toWaterLabel);
}

export async function listPublicSectors() {
  const rows = await prisma.sector.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  return rows.map(toSector);
}

// ───────── Admin: products ─────────

export async function listAdminProducts(query: {
  page: number;
  pageSize: number;
  sector?: string;
  status?: string;
  featured?: boolean;
  q?: string;
}): Promise<Page<ReturnType<typeof toProduct>>> {
  const where: Prisma.ProductWhereInput = {
    ...(query.sector && { sector: query.sector.toUpperCase() as ProductSector }),
    ...(query.status && { status: status[query.status as keyof typeof status] }),
    ...(query.featured !== undefined && { featured: query.featured }),
    ...(query.q && {
      OR: [
        { nameAr: { contains: query.q, mode: 'insensitive' } },
        { nameEn: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ sector: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      ...pageArgs(query),
    }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(toProduct), total, page: query.page, pageSize: query.pageSize };
}

export async function getAdminProduct(id: string) {
  const row = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!row) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  return toProduct(row);
}

export async function createProduct(input: CreateProductInput) {
  const slug = await uniqueSlug(input.slug ?? slugify(input.name!.en, 'product'), (s) => slugTaken(s));
  const last = await prisma.product.aggregate({ where: { sector: input.sector!.toUpperCase() as ProductSector }, _max: { sortOrder: true } });

  const row = await prisma.product.create({
    data: {
      ...columns(input),
      slug,
      sortOrder: input.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
      images: { create: (input.gallery ?? []).map((url, index) => ({ url, sortOrder: index })) },
      labels: { connect: (input.labelIds ?? []).map((id) => ({ id })) },
    } as Prisma.ProductCreateInput,
    include: productInclude,
  });
  return toProduct(row);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  if (input.slug && (await slugTaken(input.slug, id))) throw new AppError(409, 'SLUG_TAKEN', 'This slug is already used');

  const row = await prisma.product.update({
    where: { id },
    data: {
      ...columns(input),
      ...(input.slug && { slug: input.slug }),
      ...(input.gallery && {
        images: { deleteMany: {}, create: input.gallery.map((url, index) => ({ url, sortOrder: index })) },
      }),
      ...(input.labelIds && { labels: { set: input.labelIds.map((labelId) => ({ id: labelId })) } }),
    } as Prisma.ProductUpdateInput,
    include: productInclude,
  });
  return toProduct(row);
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
}

export async function reorderProducts(items: { id: string; sortOrder: number }[]) {
  await prisma.$transaction(items.map((item) => prisma.product.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
}

// ───────── Admin: categories ─────────

interface CategoryInput {
  slug: string;
  sector: string | null;
  name: { ar: string; en: string };
  sortOrder: number;
}

const categoryColumns = (i: CategoryInput) => ({
  slug: i.slug,
  sector: i.sector ? (i.sector.toUpperCase() as ProductSector) : null,
  nameAr: i.name.ar,
  nameEn: i.name.en,
  sortOrder: i.sortOrder,
});

export async function listCategories() {
  return (await prisma.productCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }] })).map(toCategory);
}
export async function createCategory(input: CategoryInput) {
  return toCategory(await prisma.productCategory.create({ data: categoryColumns(input) }));
}
export async function updateCategory(id: string, input: CategoryInput) {
  return toCategory(await prisma.productCategory.update({ where: { id }, data: categoryColumns(input) }));
}
export async function deleteCategory(id: string) {
  await prisma.productCategory.delete({ where: { id } });
}

// ───────── Admin: water labels ─────────

interface LabelInput {
  name: { ar: string; en: string };
  image: string | null;
  active: boolean;
  sortOrder: number;
}
const labelColumns = (i: LabelInput) => ({ nameAr: i.name.ar, nameEn: i.name.en, imageUrl: i.image, isActive: i.active, sortOrder: i.sortOrder });

export async function listAdminWaterLabels() {
  return (await prisma.waterLabel.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })).map(toWaterLabel);
}
export async function createWaterLabel(input: LabelInput) {
  return toWaterLabel(await prisma.waterLabel.create({ data: labelColumns(input) }));
}
export async function updateWaterLabel(id: string, input: LabelInput) {
  return toWaterLabel(await prisma.waterLabel.update({ where: { id }, data: labelColumns(input) }));
}
export async function deleteWaterLabel(id: string) {
  await prisma.waterLabel.delete({ where: { id } });
}

// ───────── Admin: sectors ─────────

export async function listAdminSectors() {
  return (await prisma.sector.findMany({ orderBy: { sortOrder: 'asc' } })).map(toSector);
}

export async function updateSector(
  id: string,
  input: { name?: { ar: string; en: string }; description?: { ar: string; en: string }; image?: string | null; active?: boolean; sortOrder?: number },
) {
  const row = await prisma.sector.update({
    where: { id },
    data: {
      ...(input.name && { nameAr: input.name.ar, nameEn: input.name.en }),
      ...(input.description && { descriptionAr: input.description.ar, descriptionEn: input.description.en }),
      ...(input.image !== undefined && { imageUrl: input.image }),
      ...(input.active !== undefined && { isActive: input.active }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });
  return toSector(row);
}
