import type { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { toNewsItem } from '../serializers/index.js';
import type { z } from 'zod';
import type { createNewsItemSchema, updateNewsItemSchema } from '../validators/admin.validators.js';

type CreateInput = z.infer<typeof createNewsItemSchema>;
type UpdateInput = z.infer<typeof updateNewsItemSchema>;

function columns(i: UpdateInput) {
  return {
    ...(i.title && { titleAr: i.title.ar, titleEn: i.title.en }),
    ...(i.text && { textAr: i.text.ar, textEn: i.text.en }),
    ...(i.image !== undefined && { imageUrl: i.image }),
    ...(i.link !== undefined && { linkUrl: i.link }),
    ...(i.publishedAt && { publishedAt: i.publishedAt }),
    ...(i.published !== undefined && { published: i.published }),
    ...(i.sortOrder !== undefined && { sortOrder: i.sortOrder }),
  };
}

const order = [{ sortOrder: 'asc' }, { publishedAt: 'desc' }] satisfies Prisma.NewsItemOrderByWithRelationInput[];

/** What the homepage shows: published news, most recently arranged first. */
export async function listPublicNews() {
  const rows = await prisma.newsItem.findMany({ where: { published: true }, orderBy: order });
  return rows.map(toNewsItem);
}

export async function listAdminNews() {
  return (await prisma.newsItem.findMany({ orderBy: order })).map(toNewsItem);
}

export async function getAdminNewsItem(id: string) {
  const row = await prisma.newsItem.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('News item not found', 'NEWS_ITEM_NOT_FOUND');
  return toNewsItem(row);
}

export async function createNewsItem(input: CreateInput) {
  const last = await prisma.newsItem.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.newsItem.create({
    data: { ...columns(input), sortOrder: input.sortOrder ?? (last._max.sortOrder ?? -1) + 1 } as Prisma.NewsItemCreateInput,
  });
  return toNewsItem(row);
}

export async function updateNewsItem(id: string, input: UpdateInput) {
  const row = await prisma.newsItem.update({ where: { id }, data: columns(input) });
  return toNewsItem(row);
}

export async function deleteNewsItem(id: string) {
  await prisma.newsItem.delete({ where: { id } });
}

export async function reorderNews(items: { id: string; sortOrder: number }[]) {
  await prisma.$transaction(items.map((item) => prisma.newsItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
}
