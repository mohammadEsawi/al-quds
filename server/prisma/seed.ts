/**
 * Database seed. Safe to run more than once: rows that already exist are left untouched, so edits
 * made from the admin dashboard are never overwritten.
 *
 *   1. Admin account   — created from ADMIN_EMAIL / ADMIN_PASSWORD in server/.env (skipped if unset)
 *   2. Website content — everything in prisma/seed-data/content.json (company, sectors, products,
 *      water labels, real estate, sample jobs, legal pages...)
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env.js';
import type { Prisma } from '../src/generated/prisma/client.js';
import { assertUtf8Database } from '../src/lib/dbcheck.js';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';
import { slugify } from '../src/lib/slug.js';

type L = { ar: string; en: string };
const opt = (value?: L | null) => ({ ar: value?.ar || null, en: value?.en || null });
const json = (value: unknown) => value as Prisma.InputJsonValue;

const content = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'seed-data', 'content.json'), 'utf8'));

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    const users = await prisma.user.count();
    console.log(users ? '• Admin: ADMIN_EMAIL/ADMIN_PASSWORD not set — keeping existing users.' : '! Admin: no users exist and ADMIN_EMAIL/ADMIN_PASSWORD are not set in server/.env — you will not be able to log in.');
    return;
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');

  const email = ADMIN_EMAIL.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`• Admin ${email} already exists — unchanged.`);
    return;
  }
  await prisma.user.create({ data: { email, name: ADMIN_NAME, role: 'SUPER_ADMIN', passwordHash: await hashPassword(ADMIN_PASSWORD) } });
  console.log(`✓ Created SUPER_ADMIN ${email}`);
}

async function seedCompany() {
  const c = content.company;
  await prisma.companyInfo.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      nameAr: c.name.ar, nameEn: c.name.en,
      legalNameAr: c.legalName.ar, legalNameEn: c.legalName.en,
      founded: c.founded,
      addressAr: c.address.ar, addressEn: c.address.en,
      phone: c.phone, phoneDisplay: c.phoneDisplay, email: c.email,
      hoursAr: c.hours.ar, hoursEn: c.hours.en,
      logoLightUrl: c.logo,
      mapEmbedUrl: c.mapEmbedUrl,
      facebookUrl: c.social.facebook ?? null, instagramUrl: c.social.instagram ?? null, linkedinUrl: c.social.linkedin ?? null,
      about: json(c.about),
      missionAr: c.mission.ar, missionEn: c.mission.en,
      visionAr: c.vision.ar, visionEn: c.vision.en,
      values: json(c.values), milestones: json(c.milestones), standards: json(c.standards),
      stats: json(c.stats), cities: json(c.cities),
    },
  });

  // One channel per area; all share the general number until the company sets its own.
  const channels: [string, string, L][] = [
    ['GENERAL', c.whatsapp.general.number, c.whatsapp.general.message],
    ['WATER', c.whatsapp.water.number, c.whatsapp.water.message],
    ['REAL_ESTATE', c.whatsapp.realEstate.number, c.whatsapp.realEstate.message],
    ['JOBS', c.whatsapp.jobs.number, c.whatsapp.jobs.message],
    ['PLASTIC', c.whatsapp.general.number, { ar: 'مرحباً، أرغب بالاستفسار عن قطاع البلاستيك.', en: 'Hello, I would like to inquire about the plastics sector.' }],
    ['PREFORMS', c.whatsapp.general.number, { ar: 'مرحباً، أرغب بالاستفسار عن منتجات البريفورم.', en: 'Hello, I would like to inquire about preform products.' }],
    ['CAPS', c.whatsapp.general.number, { ar: 'مرحباً، أرغب بالاستفسار عن الأغطية البلاستيكية.', en: 'Hello, I would like to inquire about plastic caps.' }],
    ['FOOD', c.whatsapp.general.number, { ar: 'مرحباً، أريد الاستفسار عن منتجاتكم الغذائية.', en: 'Hello, I would like to inquire about your food products.' }],
  ];
  for (const [channel, number, message] of channels) {
    await prisma.whatsAppSetting.upsert({
      where: { channel },
      update: {},
      create: { channel, number, messageAr: message.ar, messageEn: message.en },
    });
  }
  console.log('✓ Company profile and WhatsApp channels');
}

async function seedSectors() {
  let created = 0;
  for (const [index, s] of (content.sectors as any[]).entries()) {
    const exists = await prisma.sector.findUnique({ where: { key: s.key } });
    if (exists) continue;
    await prisma.sector.create({
      data: {
        key: s.key, path: s.path, number: s.number, icon: s.icon,
        nameAr: s.name.ar, nameEn: s.name.en,
        descriptionAr: s.description.ar, descriptionEn: s.description.en,
        imageUrl: s.image ?? null, sortOrder: index,
      },
    });
    created += 1;
  }
  console.log(`✓ Sectors (+${created})`);
}

async function seedProducts() {
  const perSector = new Map<string, number>();
  let created = 0;

  for (const p of content.products as any[]) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) continue;

    const sector = String(p.sector).toUpperCase();
    // One category per distinct label, grouped by sector.
    const categorySlug = `${p.sector}-${slugify(p.category.en, 'general')}`;
    const category = await prisma.productCategory.upsert({
      where: { slug: categorySlug },
      update: {},
      create: { slug: categorySlug, sector: sector as never, nameAr: p.category.ar, nameEn: p.category.en },
    });

    const order = perSector.get(sector) ?? 0;
    perSector.set(sector, order + 1);
    const size = opt(p.size);
    const tag = opt(p.tag);

    await prisma.product.create({
      data: {
        slug: p.slug,
        sector: sector as never,
        categoryId: category.id,
        nameAr: p.name.ar, nameEn: p.name.en,
        categoryLabelAr: p.category.ar, categoryLabelEn: p.category.en,
        shortDescriptionAr: p.shortDescription.ar, shortDescriptionEn: p.shortDescription.en,
        descriptionAr: p.description.ar, descriptionEn: p.description.en,
        imageUrl: p.image ?? null, secondaryImageUrl: p.secondaryImage ?? null,
        sizeAr: size.ar, sizeEn: size.en, tagAr: tag.ar, tagEn: tag.en,
        specs: json(p.specs), features: json(p.features),
        featured: p.featured, sortOrder: order, isSample: Boolean(p.isPlaceholder),
        images: { create: (p.gallery as string[]).map((url, i) => ({ url, sortOrder: i })) },
      },
    });
    created += 1;
  }
  console.log(`✓ Products (+${created})`);
}

async function seedWaterLabels() {
  if ((await prisma.waterLabel.count()) > 0) return;
  const water = await prisma.product.findMany({ where: { sector: 'WATER' }, select: { id: true } });
  for (const [index, label] of (content.waterLabels as any[]).entries()) {
    await prisma.waterLabel.create({
      data: {
        nameAr: label.name.ar, nameEn: label.name.en, imageUrl: label.image ?? null, isActive: label.active, sortOrder: index,
        products: { connect: water },
      },
    });
  }
  console.log('✓ Water labels');
}

async function seedSettings() {
  const entries: [string, unknown][] = [
    ['water.overview', content.waterOverview],
    ['food.overview', content.foodOverview],
    ['legal.privacy', content.legal.privacy],
    ['legal.terms', content.legal.terms],
  ];
  for (const [key, value] of entries) {
    await prisma.siteSetting.upsert({ where: { key }, update: {}, create: { key, value: json(value) } });
  }
  console.log('✓ Site settings');
}

async function seedRealEstate() {
  let created = 0;
  for (const [index, p] of (content.realEstateProjects as any[]).entries()) {
    if (await prisma.realEstateProject.findUnique({ where: { slug: p.slug } })) continue;
    const tagline = opt(p.tagline);
    await prisma.realEstateProject.create({
      data: {
        slug: p.slug,
        nameAr: p.name.ar, nameEn: p.name.en, taglineAr: tagline.ar, taglineEn: tagline.en,
        description: json(p.description),
        locationAr: p.location.ar, locationEn: p.location.en,
        featuredImageUrl: p.featuredImage, gallery: json(p.gallery), features: json(p.features),
        contactPhone: p.contactPhone, whatsappNumber: p.whatsappNumber,
        status: String(p.status).toUpperCase() as never, sortOrder: index,
      },
    });
    created += 1;
  }
  console.log(`✓ Real estate (+${created})`);
}

const employment: Record<string, string> = { fullTime: 'FULL_TIME', partTime: 'PART_TIME', contract: 'CONTRACT', internship: 'INTERNSHIP' };

async function seedJobs() {
  let created = 0;
  for (const j of content.jobs as any[]) {
    if (await prisma.job.findUnique({ where: { slug: j.slug } })) continue;
    await prisma.job.create({
      data: {
        slug: j.slug,
        titleAr: j.title.ar, titleEn: j.title.en,
        departmentAr: j.department.ar, departmentEn: j.department.en,
        locationAr: j.location.ar, locationEn: j.location.en,
        employmentType: employment[j.employmentType] as never,
        descriptionAr: j.description.ar, descriptionEn: j.description.en,
        responsibilities: json(j.responsibilities), requirements: json(j.requirements), benefits: json(j.benefits),
        status: 'OPEN',
        // Sample vacancies: the company deletes them and posts real ads from the dashboard.
        isSample: true,
      },
    });
    created += 1;
  }
  console.log(`✓ Sample jobs (+${created})`);
}

async function main() {
  await assertUtf8Database();
  await seedAdmin();
  await seedCompany();
  await seedSectors();
  await seedProducts();
  await seedWaterLabels();
  await seedSettings();
  await seedRealEstate();
  await seedJobs();
  console.log('\nSeed finished.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
