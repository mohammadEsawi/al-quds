/**
 * Writes the website's built-in content (src/content) to server/prisma/seed-data/content.json,
 * which `npm run db:seed` loads into PostgreSQL:   npm run seed:export -w client
 */
import fs from 'node:fs';
import path from 'node:path';
import { aboutPage } from '@/content/aboutPage';
import { company } from '@/content/company';
import { jobs } from '@/content/jobs';
import { privacyPolicy, termsOfUse } from '@/content/legal';
import { foodOverview, products, waterLabels, waterOverview } from '@/content/products';
import { realEstateProjects } from '@/content/realEstate';
import { sectors } from '@/content/sectors';
import { team } from '@/content/team';

const out = { company, sectors, products, waterLabels, waterOverview, foodOverview, realEstateProjects, jobs, team, aboutPage, legal: { privacy: privacyPolicy, terms: termsOfUse } };
const file = path.resolve(import.meta.dirname, '..', '..', 'server', 'prisma', 'seed-data', 'content.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), file)}: ${products.length} products, ${team.length} team members, ${jobs.length} jobs, ${realEstateProjects.length} projects`);
