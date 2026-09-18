import { L } from '@/i18n/types';
import type { Sector } from './types';

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
    key: 'preforms',
    path: '/preforms',
    number: '03',
    icon: 'flask',
    name: L('البريفورم', 'Preforms'),
    description: L('بريفورم مصنّع بدقة ليكون البداية المثالية لعبوات PET.', 'Precisely manufactured preforms — the ideal starting point for PET bottles.'),
  },
  {
    key: 'caps',
    path: '/caps',
    number: '04',
    icon: 'circle-dot',
    name: L('الأغطية', 'Caps'),
    description: L('أغطية بلاستيكية بأنواع متعددة تناسب احتياجات التعبئة.', 'Plastic caps in multiple types to suit every filling need.'),
  },
  {
    key: 'food',
    path: '/food',
    number: '05',
    icon: 'wheat',
    name: L('المنتجات الغذائية', 'Food Products'),
    description: L('منتجات القدس الفلسطينية: زعتر، فريكة، سماق، قهوة وأكثر.', 'Al-Quds Palestinian products: zaatar, freekeh, sumac, coffee and more.'),
    image: '/assets/food/all-products.webp',
  },
  {
    key: 'real-estate',
    path: '/real-estate',
    number: '06',
    icon: 'building',
    name: L('العقار', 'Real Estate'),
    description: L('مشاريع سكنية متميزة، أولها إسكان أكاديمي هاوس في نابلس.', 'Distinguished residential projects, starting with Academy House in Nablus.'),
    image: '/assets/real-estate/academy-house.webp',
  },
  {
    key: 'investment',
    path: '/about',
    number: '07',
    icon: 'trending-up',
    name: L('الاستثمار والتطوير', 'Investment & Development'),
    description: L('استثمار متنوع وتطوير مستمر لقطاعات جديدة داخل فلسطين.', 'Diversified investment and continuous development of new sectors in Palestine.'),
  },
];
