import type { JobStatus, Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { pageArgs, type Page } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { employmentIn, toJob } from '../serializers/index.js';
import type { z } from 'zod';
import type { createJobSchema, updateJobSchema } from '../validators/admin.validators.js';

type CreateInput = z.infer<typeof createJobSchema>;
type UpdateInput = z.infer<typeof updateJobSchema>;

function columns(i: UpdateInput) {
  return {
    ...(i.title && { titleAr: i.title.ar, titleEn: i.title.en }),
    ...(i.department && { departmentAr: i.department.ar, departmentEn: i.department.en }),
    ...(i.location && { locationAr: i.location.ar, locationEn: i.location.en }),
    ...(i.employmentType && { employmentType: employmentIn[i.employmentType] }),
    ...(i.description && { descriptionAr: i.description.ar, descriptionEn: i.description.en }),
    ...(i.responsibilities && { responsibilities: i.responsibilities as Prisma.InputJsonValue }),
    ...(i.requirements && { requirements: i.requirements as Prisma.InputJsonValue }),
    ...(i.benefits && { benefits: i.benefits as Prisma.InputJsonValue }),
    ...(i.deadline !== undefined && { deadline: i.deadline ? new Date(`${i.deadline}T23:59:59Z`) : null }),
    ...(i.status && { status: i.status.toUpperCase() as JobStatus }),
    ...(i.isPlaceholder !== undefined && { isSample: i.isPlaceholder }),
  };
}

const slugTaken = (slug: string, exceptId?: string) =>
  prisma.job.count({ where: { slug, ...(exceptId && { NOT: { id: exceptId } }) } }).then(Boolean);

/** Open jobs whose deadline has not passed. */
const openWhere = (): Prisma.JobWhereInput => ({
  status: 'OPEN',
  OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
});

export async function listPublicJobs() {
  const rows = await prisma.job.findMany({ where: openWhere(), orderBy: { createdAt: 'desc' } });
  return rows.map(toJob);
}

export async function getPublicJob(slug: string) {
  const row = await prisma.job.findFirst({ where: { slug, ...openWhere() } });
  if (!row) throw AppError.notFound('Job not found', 'JOB_NOT_FOUND');
  return toJob(row);
}

export async function listAdminJobs(query: { page: number; pageSize: number; status?: string; q?: string }): Promise<Page<ReturnType<typeof toJob>>> {
  const where: Prisma.JobWhereInput = {
    ...(query.status && { status: query.status.toUpperCase() as JobStatus }),
    ...(query.q && {
      OR: [
        { titleAr: { contains: query.q, mode: 'insensitive' } },
        { titleEn: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.job.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.job.count({ where }),
  ]);
  return { items: rows.map(toJob), total, page: query.page, pageSize: query.pageSize };
}

export async function getAdminJob(id: string) {
  const row = await prisma.job.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Job not found', 'JOB_NOT_FOUND');
  return toJob(row);
}

export async function createJob(input: CreateInput) {
  const slug = await uniqueSlug(input.slug ?? slugify(input.title!.en, 'job'), (s) => slugTaken(s));
  const row = await prisma.job.create({ data: { ...columns(input), slug } as Prisma.JobCreateInput });
  return toJob(row);
}

export async function updateJob(id: string, input: UpdateInput) {
  if (input.slug && (await slugTaken(input.slug, id))) throw new AppError(409, 'SLUG_TAKEN', 'This slug is already used');
  const row = await prisma.job.update({ where: { id }, data: { ...columns(input), ...(input.slug && { slug: input.slug }) } });
  return toJob(row);
}

export async function deleteJob(id: string) {
  await prisma.job.delete({ where: { id } });
}
