import path from 'node:path';
import { env } from '../config/env.js';
import type { ApplicationStatus, Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { CV_DIR, CV_TYPES, detectFile, removeFile, storeFile } from '../lib/files.js';
import { pageArgs, type Page } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import type { ApplicationInput } from '../validators/public.validators.js';
import { whatsappUrlFor } from './inbox.service.js';
import { notifyAdmins } from './notify.service.js';

const applicationInclude = { job: { select: { id: true, slug: true, titleAr: true, titleEn: true } } } satisfies Prisma.JobApplicationInclude;
type ApplicationRow = Prisma.JobApplicationGetPayload<{ include: typeof applicationInclude }>;

const toDto = (a: ApplicationRow) => ({
  id: a.id,
  job: a.job ? { id: a.job.id, slug: a.job.slug, title: { ar: a.job.titleAr, en: a.job.titleEn } } : null,
  fullName: a.fullName,
  phone: a.phone,
  email: a.email,
  city: a.city,
  position: a.position,
  education: a.education,
  experience: a.experience,
  message: a.message ?? undefined,
  linkedin: a.linkedin || undefined,
  portfolio: a.portfolio || undefined,
  cv: { name: a.cvOriginalName, mimeType: a.cvMimeType, size: a.cvSize, downloadUrl: `/api/admin/applications/${a.id}/cv` },
  status: a.status.toLowerCase(),
  notes: a.notes ?? undefined,
  whatsappUrl: whatsappUrlFor(a.phone),
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

/** Browsers send file names as latin1; this restores UTF-8 (Arabic) names. */
function fixFilename(name: string): string {
  return /[\u0080-ÿ]/.test(name) && !/[^\u0000-ÿ]/.test(name) ? Buffer.from(name, 'latin1').toString('utf8') : name;
}

// ───────── Public: apply ─────────

export async function submitApplication(jobRef: string, input: ApplicationInput, file: Express.Multer.File | undefined) {
  if (!file) throw AppError.badRequest('A CV file is required', 'CV_REQUIRED');

  const detected = detectFile(file.buffer);
  if (!detected || !CV_TYPES.has(detected.mime)) throw AppError.badRequest('CV must be a PDF, DOC or DOCX file', 'INVALID_FILE_TYPE');
  if (file.size > env.MAX_CV_MB * 1024 * 1024) throw new AppError(413, 'FILE_TOO_LARGE', 'The CV is larger than the allowed size');

  let jobId: string | null = null;
  if (jobRef !== 'general') {
    const job = await prisma.job.findFirst({ where: { OR: [{ id: jobRef }, { slug: jobRef }] } });
    if (!job) throw AppError.notFound('Job not found', 'JOB_NOT_FOUND');
    if (job.status !== 'OPEN' || (job.deadline && job.deadline < new Date())) {
      throw AppError.badRequest('This job is no longer accepting applications', 'JOB_CLOSED');
    }
    jobId = job.id;
  }

  const stored = await storeFile(CV_DIR, file.buffer, detected.ext);
  try {
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        city: input.city,
        position: input.position,
        education: input.education,
        experience: input.experience,
        message: input.message || null,
        linkedin: input.linkedin || null,
        portfolio: input.portfolio || null,
        cvFile: stored,
        cvOriginalName: fixFilename(file.originalname).slice(0, 200),
        cvMimeType: detected.mime,
        cvSize: file.size,
      },
    });
    await notifyAdmins({
      type: 'JOB_APPLICATION',
      title: 'طلب توظيف جديد',
      body: `${application.fullName} — ${application.position}`,
      refId: application.id,
    });
    return application.id;
  } catch (error) {
    await removeFile(CV_DIR, stored); // don't leave an orphan file behind
    throw error;
  }
}

// ───────── Admin ─────────

export async function listApplications(query: {
  page: number;
  pageSize: number;
  status?: string;
  jobId?: string;
  q?: string;
}): Promise<Page<ReturnType<typeof toDto>>> {
  const where: Prisma.JobApplicationWhereInput = {
    ...(query.status && { status: query.status.toUpperCase() as ApplicationStatus }),
    ...(query.jobId && { jobId: query.jobId }),
    ...(query.q && {
      OR: [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { position: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.jobApplication.findMany({ where, include: applicationInclude, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.jobApplication.count({ where }),
  ]);
  return { items: rows.map(toDto), total, page: query.page, pageSize: query.pageSize };
}

export async function getApplication(id: string) {
  const row = await prisma.jobApplication.findUnique({ where: { id }, include: applicationInclude });
  if (!row) throw AppError.notFound('Application not found', 'APPLICATION_NOT_FOUND');
  return toDto(row);
}

export async function updateApplication(id: string, input: { status?: string; notes?: string | null }) {
  const row = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status.toUpperCase() as ApplicationStatus }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: applicationInclude,
  });
  // Reviewing an application clears its dashboard notification.
  await prisma.notification.updateMany({ where: { type: 'JOB_APPLICATION', refId: id }, data: { isRead: true } });
  return toDto(row);
}

/** Absolute path + download name of a CV, for the authenticated download route. */
export async function getCvFile(id: string) {
  const row = await prisma.jobApplication.findUnique({ where: { id }, select: { cvFile: true, cvOriginalName: true, cvMimeType: true } });
  if (!row) throw AppError.notFound('Application not found', 'APPLICATION_NOT_FOUND');
  return { absolutePath: path.join(CV_DIR, path.basename(row.cvFile)), name: row.cvOriginalName, mimeType: row.cvMimeType };
}

export async function deleteApplication(id: string) {
  const row = await prisma.jobApplication.delete({ where: { id } });
  await removeFile(CV_DIR, row.cvFile);
  await prisma.notification.deleteMany({ where: { type: 'JOB_APPLICATION', refId: id } });
}
