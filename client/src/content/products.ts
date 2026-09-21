import { L } from '@/i18n/types';
import type { Product, WaterLabel } from './types';

const A = '/assets';

export const products: Product[] = [
  // ───────── Water ─────────
  {
    id: 'water-1-5l',
    slug: 'al-quds-water-1-5l',
    sector: 'water',
    name: L('مياه القدس 1.5 لتر', 'Al-Quds Water 1.5 L'),
    category: L('مياه شرب معبأة', 'Bottled drinking water'),
    shortDescription: L('الحجم العائلي المثالي للمنزل والمكتب. تعبئة من آبار وينابيع قرية النصارية.', 'The ideal family size for home and office. Filled from the wells and springs of Al-Nasariya.'),
    description: L(
      'الحجم العائلي المثالي للمنزل والمكتب. مياه شرب معبأة نقية من آبار وينابيع قرية النصارية.',
      'The ideal family size for home and office. Pure bottled drinking water from the wells and springs of Al-Nasariya.',
    ),
    image: `${A}/water/water-1-5l.webp`,
    secondaryImage: `${A}/water/water-1-5l-pack.webp`,
    gallery: [`${A}/water/water-1-5l.webp`, `${A}/water/water-1-5l-pack.webp`],
    size: L('1.5 لتر', '1.5 L'),
    tag: L('الأكثر مبيعاً', 'Best seller'),
    specs: [],
    features: [],
    featured: true,
  },
  {
    id: 'water-500ml',
    slug: 'al-quds-water-500ml',
    sector: 'water',
    name: L('مياه القدس 500 مل', 'Al-Quds Water 500 ml'),
    category: L('مياه شرب معبأة', 'Bottled drinking water'),
    shortDescription: L('الحجم المناسب للتنقل والرحلات. سهلة الحمل ومثالية ليومك.', 'The right size for commuting and trips. Easy to carry and perfect for your day.'),
    description: L(
      'الحجم المناسب للتنقل والرحلات. سهلة الحمل ومثالية ليومك.',
      'The right size for commuting and trips. Easy to carry and perfect for your day.',
    ),
    image: `${A}/water/water-500ml.webp`,
    secondaryImage: `${A}/water/water-500ml-pack.webp`,
    gallery: [`${A}/water/water-500ml.webp`, `${A}/water/water-500ml-pack.webp`],
    size: L('500 مل', '500 ml'),
    specs: [],
    features: [],
    featured: true,
  },
  {
    id: 'water-250ml',
    slug: 'al-quds-water-250ml',
    sector: 'water',
    name: L('مياه القدس 250 مل', 'Al-Quds Water 250 ml'),
    category: L('مياه شرب معبأة', 'Bottled drinking water'),
    shortDescription: L('الحجم المثالي للفعاليات والمناسبات والاجتماعات. أنيقة وعملية.', 'The ideal size for events, occasions and meetings. Elegant and practical.'),
    description: L(
      'الحجم المثالي للفعاليات والمناسبات والاجتماعات. أنيقة وعملية.',
      'The ideal size for events, occasions and meetings. Elegant and practical.',
    ),
    image: `${A}/water/water-250ml.webp`,
    secondaryImage: `${A}/water/water-250ml-pack.webp`,
    gallery: [`${A}/water/water-250ml.webp`, `${A}/water/water-250ml-pack.webp`],
    size: L('250 مل', '250 ml'),
    specs: [],
    features: [],
    featured: true,
  },

  // ───────── Food ─────────
  {
    id: 'food-zaatar-mix',
    slug: 'palestinian-zaatar-mix',
    sector: 'food',
    name: L('خليط الزعتر الفلسطيني', 'Palestinian Zaatar Mix'),
    category: L('بهارات وتوابل', 'Spices & seasonings'),
    shortDescription: L('زعتر فلسطيني أصيل مخلوط بالسمسم والسماق. طعم لا يُنسى من أرض فلسطين.', 'Authentic Palestinian zaatar blended with sesame and sumac. An unforgettable taste from the land of Palestine.'),
    description: L(
      'زعتر فلسطيني أصيل مخلوط بالسمسم والسماق. طعم لا يُنسى من أرض فلسطين.',
      'Authentic Palestinian zaatar blended with sesame and sumac. An unforgettable taste from the land of Palestine.',
    ),
    image: `${A}/food/zaatar-mix.webp`,
    gallery: [`${A}/food/zaatar-mix.webp`, `${A}/food/zaatar-alt.webp`],
    specs: [],
    features: [],
    featured: true,
  },
  {
    id: 'food-freekeh',
    slug: 'palestinian-freekeh',
    sector: 'food',
    name: L('فريكة فلسطينية مجروشة', 'Palestinian Cracked Freekeh'),
    category: L('حبوب وبقوليات', 'Grains & legumes'),
    shortDescription: L('فريكة خضراء مجروشة فاخرة من سنابل القمح الفلسطيني. غنية بالنكهة والفوائد.', 'Premium cracked green freekeh from Palestinian wheat ears. Rich in flavor and benefits.'),
    description: L(
      'فريكة خضراء مجروشة فاخرة من سنابل القمح الفلسطيني. غنية بالنكهة والفوائد.',
      'Premium cracked green freekeh from Palestinian wheat ears. Rich in flavor and benefits.',
    ),
    image: `${A}/food/freekeh.webp`,
    gallery: [`${A}/food/freekeh.webp`],
    specs: [],
    features: [],
    featured: true,
  },
  {
    id: 'food-sumac',
    slug: 'palestinian-sumac',
    sector: 'food',
    name: L('السماق الفلسطيني الفاخر', 'Premium Palestinian Sumac'),
    category: L('بهارات وتوابل', 'Spices & seasonings'),
    shortDescription: L('سماق فلسطيني طبيعي بنكهة حامضة مميزة. يضيف طعماً أصيلاً لكل طبق.', 'Natural Palestinian sumac with a distinctive tang. Adds an authentic taste to every dish.'),
    description: L(
      'سماق فلسطيني طبيعي بنكهة حامضة مميزة. يضيف طعماً أصيلاً لكل طبق.',
      'Natural Palestinian sumac with a distinctive tang. Adds an authentic taste to every dish.',
    ),
    image: `${A}/food/sumac.webp`,
    gallery: [`${A}/food/sumac.webp`],
    specs: [],
    features: [],
    featured: true,
  },
  {
    id: 'food-sage',
    slug: 'palestinian-dried-sage',
    sector: 'food',
    name: L('ميرمية فلسطينية مجففة', 'Dried Palestinian Sage'),
    category: L('أعشاب طبيعية', 'Natural herbs'),
    shortDescription: L('ميرمية فلسطينية فاخرة مجففة بعناية. مثالية للشاي والمشروبات الساخنة.', 'Premium Palestinian sage, carefully dried. Perfect for tea and hot drinks.'),
    description: L(
      'ميرمية فلسطينية فاخرة مجففة بعناية. مثالية للشاي والمشروبات الساخنة.',
      'Premium Palestinian sage, carefully dried. Perfect for tea and hot drinks.',
    ),
    image: `${A}/food/sage.webp`,
    gallery: [`${A}/food/sage.webp`],
    specs: [],
    features: [],
    featured: false,
  },
  {
    id: 'food-dukkah',
    slug: 'palestinian-dukkah',
    sector: 'food',
    name: L('الدقة الفلسطينية الفاخرة', 'Premium Palestinian Dukkah'),
    category: L('بهارات وتوابل', 'Spices & seasonings'),
    shortDescription: L('خليط الدقة الفلسطينية (زعتر أحمر) من القمح المطحون والسمسم والتوابل الأصيلة.', 'Palestinian dukkah (red zaatar) made from ground wheat, sesame and authentic spices.'),
    description: L(
      'خليط الدقة الفلسطينية (زعتر أحمر) من القمح المطحون والسمسم والتوابل الأصيلة.',
      'Palestinian dukkah (red zaatar) made from ground wheat, sesame and authentic spices.',
    ),
    image: `${A}/food/dukkah.webp`,
    gallery: [`${A}/food/dukkah.webp`],
    specs: [],
    features: [],
    featured: false,
  },
  {
    id: 'food-cardamom-coffee',
    slug: 'al-quds-cardamom-coffee',
    sector: 'food',
    name: L('قهوة القدس بالهيل', 'Al-Quds Cardamom Coffee'),
    category: L('مشروبات', 'Beverages'),
    shortDescription: L('قهوة عربية فاخرة بالهيل. تحميص مثالي ونكهة غنية تعكس أصالة القهوة الفلسطينية.', 'Premium Arabic coffee with cardamom. A perfect roast and rich flavor that reflects authentic Palestinian coffee.'),
    description: L(
      'قهوة عربية فاخرة بالهيل. تحميص مثالي ونكهة غنية تعكس أصالة القهوة الفلسطينية.',
      'Premium Arabic coffee with cardamom. A perfect roast and rich flavor that reflects authentic Palestinian coffee.',
    ),
    image: `${A}/food/cardamom-coffee.webp`,
    gallery: [`${A}/food/cardamom-coffee.webp`],
    specs: [],
    features: [],
    featured: false,
  },
  {
    id: 'food-watermelon-seeds',
    slug: 'roasted-watermelon-seeds',
    sector: 'food',
    name: L('بذر بطيخ محمص فاخر', 'Premium Roasted Watermelon Seeds'),
    category: L('مكسرات وبذور', 'Nuts & seeds'),
    shortDescription: L('بذر بطيخ فلسطيني محمص بإتقان. تسالي طبيعية بنكهة مميزة.', 'Palestinian watermelon seeds, expertly roasted. A natural snack with a distinctive flavor.'),
    description: L(
      'بذر بطيخ فلسطيني محمص بإتقان. تسالي طبيعية بنكهة مميزة.',
      'Palestinian watermelon seeds, expertly roasted. A natural snack with a distinctive flavor.',
    ),
    image: `${A}/food/watermelon-seeds.webp`,
    gallery: [`${A}/food/watermelon-seeds.webp`],
    specs: [],
    features: [],
    featured: false,
  },
  {
    id: 'food-dried-thyme',
    slug: 'dried-palestinian-thyme',
    sector: 'food',
    name: L('زعتر فلسطيني مجفف', 'Dried Palestinian Thyme'),
    category: L('أعشاب طبيعية', 'Natural herbs'),
    shortDescription: L('أوراق زعتر فلسطيني مجففة طبيعياً. للطبخ والمشروبات بنكهة عطرية أصيلة.', 'Naturally dried Palestinian thyme leaves. For cooking and drinks with an authentic aromatic flavor.'),
    description: L(
      'أوراق زعتر فلسطيني مجففة طبيعياً. للطبخ والمشروبات بنكهة عطرية أصيلة.',
      'Naturally dried Palestinian thyme leaves. For cooking and drinks with an authentic aromatic flavor.',
    ),
    image: `${A}/food/dried-thyme.webp`,
    gallery: [`${A}/food/dried-thyme.webp`],
    specs: [],
    features: [],
    featured: false,
  },

  // ───────── Preforms (real sizes; product photos are uploaded from the dashboard) ─────────
  ...(
    [
      { id: '200ml', slug: 'preform-200ml', ar: '200 مل', en: '200 ml' },
      { id: '500ml', slug: 'preform-500ml', ar: '0.5 لتر', en: '0.5 L' },
      { id: '1-5l', slug: 'preform-1-5l', ar: '1.5 لتر', en: '1.5 L' },
    ] as const
  ).map<Product>((size) => ({
    id: `preform-${size.id}`,
    slug: size.slug,
    sector: 'preforms',
    name: L(`بريفورم ${size.ar}`, `PET Preform ${size.en}`),
    category: L('بريفورم PET', 'PET preform'),
    shortDescription: L(
      `بريفورم PET لعبوات ${size.ar}، يُصنَّع على ماكينات الحقن لدينا.`,
      `PET preform for ${size.en} bottles, made on our own injection machines.`,
    ),
    description: L(
      `بريفورم PET مخصص لنفخ عبوات بسعة ${size.ar}. يُصنَّع داخل الشركة على ماكينات الحقن الخاصة بنا وبأيدي عمّالنا، من مواد خام نستوردها بأنفسنا.`,
      `PET preform for blowing ${size.en} bottles. It is made in-house on our own injection machines by our own workers, from raw material we import ourselves.`,
    ),
    gallery: [],
    size: L(size.ar, size.en),
    specs: [
      { label: L('المادة', 'Material'), value: L('PET', 'PET') },
      { label: L('حجم العبوة', 'Bottle size'), value: L(size.ar, size.en) },
      { label: L('طريقة التصنيع', 'Manufacturing'), value: L('الحقن على ماكينات الشركة', 'Injection on the company’s own machines') },
    ],
    features: [
      L('يُصنَّع على ماكينات الحقن لدينا', 'Made on our own injection machines'),
      L('مواد خام نستوردها بأنفسنا', 'Raw material we import ourselves'),
      L('إنتاج بأيدي عمّالنا', 'Produced by our own workers'),
    ],
    featured: false,
  })),

  // ───────── Caps (unlimited types, admin-managed) ─────────
  ...[1, 2, 3].map<Product>((n) => ({
    id: `cap-${n}`,
    slug: `cap-type-${n}`,
    sector: 'caps',
    name: L(`غطاء — النوع ${n}`, `Cap — Type ${n}`),
    category: L('أغطية بلاستيكية', 'Plastic caps'),
    shortDescription: L('نص تجريبي — سيتم استبداله بمعلومات النوع الفعلية.', 'Placeholder text — to be replaced with the real type information.'),
    description: L('نص تجريبي — سيتم استبداله بمعلومات النوع الفعلية.', 'Placeholder text — to be replaced with the real type information.'),
    gallery: [],
    specs: [],
    features: [],
    featured: false,
    isPlaceholder: true,
  })),
];

/**
 * Water label options for the label selector. Real label artwork is uploaded from the dashboard;
 * until then the selector shows clearly marked upload placeholders.
 */
export const waterLabels: WaterLabel[] = [
  { id: 'label-01', name: L('الملصق 01', 'Label 01'), active: true },
  { id: 'label-02', name: L('الملصق 02', 'Label 02'), active: true },
];

/** Long-form copy for the featured water product block (from the previous website). */
export const waterOverview = {
  image: '/assets/water/water-all-sizes.webp',
  title: L('مياه القدس — مياه شرب معبأة', 'Al-Quds Water — bottled drinking water'),
  lead: L(
    'منتجنا الرئيسي — مياه شرب معبأة نقية من آبار وينابيع قرية النصارية. صافية بالكامل مع محتوى معدني متوازن للترطيب المثالي.',
    'Our flagship product — pure bottled drinking water from the wells and springs of Al-Nasariya. Fully clear with a balanced mineral content for ideal hydration.',
  ),
  body: L(
    'كل عبوة تخضع لاختبارات جودة صارمة لضمان توافقها مع أعلى معايير الجودة والسلامة.',
    'Every bottle goes through strict quality tests to ensure it meets the highest quality and safety standards.',
  ),
  specs: [
    { label: L('المصدر', 'Source'), value: L('آبار وينابيع قرية النصارية', 'Wells and springs of Al-Nasariya') },
    { label: L('درجة الحموضة', 'pH level'), value: L('7.2 متوازنة', '7.2 balanced') },
    { label: L('المواد الصلبة الذائبة', 'Total dissolved solids'), value: L('180 mg/L', '180 mg/L') },
    { label: L('الأحجام المتوفرة', 'Available sizes'), value: L('250مل — 500مل — 1.5لتر', '250 ml — 500 ml — 1.5 L') },
  ],
};

export const foodOverview = {
  image: '/assets/food/all-products.webp',
};
