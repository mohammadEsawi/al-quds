import type { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { toCompany } from '../serializers/index.js';
import { PUBLIC_SETTING_KEYS, type UpdateCompanyInput } from '../validators/admin.validators.js';

const COMPANY_ID = 'default';
const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function getCompany() {
  const [company, whatsapp] = await Promise.all([
    prisma.companyInfo.findUnique({ where: { id: COMPANY_ID } }),
    prisma.whatsAppSetting.findMany(),
  ]);
  if (!company) throw AppError.notFound('Company profile has not been set up yet — run the database seed', 'COMPANY_NOT_SEEDED');
  return toCompany(company, whatsapp);
}

export async function updateCompany(input: UpdateCompanyInput) {
  const s = input.social;
  await prisma.companyInfo.update({
    where: { id: COMPANY_ID },
    data: {
      ...(input.name && { nameAr: input.name.ar, nameEn: input.name.en }),
      ...(input.legalName && { legalNameAr: input.legalName.ar, legalNameEn: input.legalName.en }),
      ...(input.founded !== undefined && { founded: input.founded }),
      ...(input.address && { addressAr: input.address.ar, addressEn: input.address.en }),
      ...(input.phone && { phone: input.phone }),
      ...(input.phoneDisplay && { phoneDisplay: input.phoneDisplay }),
      ...(input.email && { email: input.email }),
      ...(input.hours && { hoursAr: input.hours.ar, hoursEn: input.hours.en }),
      ...(input.logo !== undefined && { logoLightUrl: input.logo }),
      ...(input.logoDark !== undefined && { logoDarkUrl: input.logoDark }),
      ...(input.logoMobile !== undefined && { logoMobileUrl: input.logoMobile }),
      ...(input.favicon !== undefined && { faviconUrl: input.favicon }),
      ...(input.mapEmbedUrl !== undefined && { mapEmbedUrl: input.mapEmbedUrl }),
      ...(s?.facebook !== undefined && { facebookUrl: s.facebook }),
      ...(s?.instagram !== undefined && { instagramUrl: s.instagram }),
      ...(s?.linkedin !== undefined && { linkedinUrl: s.linkedin }),
      ...(input.about && { about: json(input.about) }),
      ...(input.mission && { missionAr: input.mission.ar, missionEn: input.mission.en }),
      ...(input.vision && { visionAr: input.vision.ar, visionEn: input.vision.en }),
      ...(input.values && { values: json(input.values) }),
      ...(input.milestones && { milestones: json(input.milestones) }),
      ...(input.standards && { standards: json(input.standards) }),
      ...(input.stats && { stats: json(input.stats) }),
      ...(input.cities && { cities: json(input.cities) }),
    },
  });
  return getCompany();
}

// ───────── WhatsApp channels ─────────

export async function listWhatsAppChannels() {
  const rows = await prisma.whatsAppSetting.findMany({ orderBy: { channel: 'asc' } });
  return rows.map((r) => ({
    channel: r.channel,
    number: r.number,
    message: { ar: r.messageAr, en: r.messageEn },
    isActive: r.isActive,
  }));
}

export async function saveWhatsAppChannels(
  channels: { channel: string; number: string; message: { ar: string; en: string }; isActive: boolean }[],
) {
  await prisma.$transaction(
    channels.map((c) =>
      prisma.whatsAppSetting.upsert({
        where: { channel: c.channel },
        create: { channel: c.channel, number: c.number, messageAr: c.message.ar, messageEn: c.message.en, isActive: c.isActive },
        update: { number: c.number, messageAr: c.message.ar, messageEn: c.message.en, isActive: c.isActive },
      }),
    ),
  );
  return listWhatsAppChannels();
}

// ───────── Free-form settings ─────────

export async function getPublicSetting(key: string) {
  if (!(PUBLIC_SETTING_KEYS as readonly string[]).includes(key)) throw AppError.notFound('Setting not found', 'SETTING_NOT_FOUND');
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) throw AppError.notFound('Setting not found', 'SETTING_NOT_FOUND');
  return row.value;
}

export async function listSettings() {
  const rows = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  return rows.map((r) => ({ key: r.key, value: r.value, isPublic: (PUBLIC_SETTING_KEYS as readonly string[]).includes(r.key), updatedAt: r.updatedAt }));
}

export async function saveSetting(key: string, value: unknown) {
  const row = await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: json(value) },
    update: { value: json(value) },
  });
  return { key: row.key, value: row.value, updatedAt: row.updatedAt };
}
