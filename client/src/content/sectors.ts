import { L } from '@/i18n/types';
import type { Sector } from './types';

// Preforms, caps and "Investment & Development" used to be sectors of their own here. Preforms and
// caps now live inside the plastic page (see PlasticOverview.tsx / SectorPage.tsx; /preforms and
// /caps redirect to /plastic), and "Investment & Development" already only ever linked to /about, so
// it added nothing the "About the company" nav entry does not already cover.
export const sectors: Sector[] = [
  {
    key: 'water',
    path: '/water',
    number: '01',
    icon: 'droplets',
    name: L('المياه', 'Water'),
    description: L('مياه القدس — مياه شرب معبأة من آبار وينابيع قرية النصارية.', 'Al-Quds Water — bottled drinking water from the wells and springs of Al-Nasariya.'),
    image: '/assets/water/water-lake-bottle.webp',
  },
  {
    key: 'plastic',
    path: '/plastic',
    number: '02',
    icon: 'factory',
    name: L('البلاستيك', 'Plastic'),
    description: L('حلول متقدمة في صناعة البلاستيك من المادة الخام إلى المنتج النهائي.', 'Advanced plastic manufacturing solutions, from raw material to finished product.'),
  },
  {
    key: 'food',
    path: '/food',
    number: '03',
    icon: 'wheat',
    name: L('المنتجات الغذائية', 'Food Products'),
    description: L('منتجات القدس الفلسطينية: زعتر، فريكة، سماق، قهوة وأكثر.', 'Al-Quds Palestinian products: zaatar, freekeh, sumac, coffee and more.'),
    image: '/assets/food/all-products.webp',
  },
  {
    key: 'real-estate',
    path: '/real-estate',
    number: '04',
    icon: 'building',
    name: L('العقار', 'Real Estate'),
    description: L('مشاريع سكنية متميزة، أولها إسكان أكاديمي هاوس في نابلس.', 'Distinguished residential projects, starting with Academy House in Nablus.'),
    image: '/assets/real-estate/academy-house.webp',
  },
];
