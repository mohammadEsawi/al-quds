import { L } from '@/i18n/types';
import type { RealEstateProject } from './types';

const A = '/assets/real-estate';

export const realEstateProjects: RealEstateProject[] = [
  {
    id: 'academy-house',
    slug: 'academy-house',
    name: L('إسكان أكاديمي هاوس', 'Academy House Residences'),
    tagline: L('يعيش وعيساوي', 'يعيش وعيساوي'),
    description: [
      L(
        'مشروع سكني متميز من تنفيذ لاميكو العقارية. تصميم عصري يجمع بين الفخامة والراحة في موقع استراتيجي.',
        'A distinguished residential project delivered by Lamico Real Estate. A modern design that combines elegance and comfort in a strategic location.',
      ),
      L(
        'بناء بأعلى المعايير الهندسية مع تشطيبات فاخرة ومساحات واسعة. مشروع يعكس التزام لاميكو بالجودة في كل ما نبنيه.',
        'Built to the highest engineering standards with premium finishes and generous spaces. A project that reflects Lamico’s commitment to quality in everything we build.',
      ),
    ],
    location: L('نابلس - رفيديا، الأكاديمية، فلسطين', 'Nablus – Rafidia, Al-Academia, Palestine'),
    featuredImage: `${A}/academy-house.webp`,
    gallery: [
      { src: `${A}/academy-house-1.webp`, caption: L('واجهة المبنى', 'Building facade') },
      { src: `${A}/academy-house-2.webp`, caption: L('منظر جانبي', 'Side view') },
      { src: `${A}/academy-house-3.webp`, caption: L('تفاصيل التصميم', 'Design details') },
      { src: `${A}/academy-house-4.webp`, caption: L('منظر مسائي', 'Evening view') },
      { src: `${A}/academy-house-5.webp`, caption: L('المدخل', 'Entrance') },
    ],
    features: [
      L('تصميم عصري', 'Modern design'),
      L('تشطيبات فاخرة', 'Premium finishes'),
      L('مساحات واسعة', 'Generous spaces'),
      L('موقع استراتيجي', 'Strategic location'),
    ],
    contactPhone: '+970597959536',
    whatsappNumber: '9720597959536',
    status: 'construction',
  },
];
