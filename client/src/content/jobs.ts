import { L } from '@/i18n/types';
import type { Job } from './types';

const sampleText = L(
  'نص تجريبي — سيتم استبداله بتفاصيل الوظيفة الفعلية عند نشرها من لوحة التحكم.',
  'Placeholder text — to be replaced with the real job details once published from the dashboard.',
);

/**
 * No real vacancies have been provided yet. These entries are clearly marked as samples so the
 * design can be reviewed; the company removes them and adds real ads from the dashboard.
 */
export const jobs: Job[] = [
  { id: 'job-1', slug: 'production-engineer', title: L('مهندس إنتاج', 'Production Engineer'), department: L('الإنتاج', 'Production') },
  { id: 'job-2', slug: 'maintenance-technician', title: L('فني صيانة', 'Maintenance Technician'), department: L('الصيانة', 'Maintenance') },
  { id: 'job-3', slug: 'accountant', title: L('محاسب', 'Accountant'), department: L('المالية', 'Finance') },
  { id: 'job-4', slug: 'production-supervisor', title: L('مشرف إنتاج', 'Production Supervisor'), department: L('الإنتاج', 'Production') },
].map<Job>((base) => ({
  ...base,
  location: L('نابلس، فلسطين', 'Nablus, Palestine'),
  employmentType: 'fullTime',
  description: sampleText,
  responsibilities: [sampleText],
  requirements: [sampleText],
  benefits: [],
  status: 'open',
  isPlaceholder: true,
}));
