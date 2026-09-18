import { L } from '@/i18n/types';
import type { CompanyInfo } from './types';

/**
 * Company information — seeded from the original Lamico site.
 * These values are editable from the admin dashboard once the database is connected.
 * NOTE: statistics, certifications and milestones below come from the previous website and
 * must be verified by the company before launch.
 */
export const company: CompanyInfo = {
  name: L('شركة لاميكو الاستثمارية', 'Lamico Investment Company'),
  legalName: L('شركة لاميكو للاستثمار الصناعي والتوريدات', 'Lamico for Industrial Investment & Supplies'),
  founded: 2005,
  address: L('المنطقة الصناعية، نابلس، فلسطين', 'Industrial Zone, Nablus, Palestine'),
  phone: '+970597959536',
  phoneDisplay: '+970 5 9795 9536',
  email: 'info@lamicogroup.com',
  hours: L('الأحد – الخميس: 8:00 ص – 5:00 م', 'Sunday – Thursday: 8:00 AM – 5:00 PM'),
  logo: '/assets/branding/lamico-logo.webp',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3375.3155974877973!2d35.264721024564174!3d32.22266777390022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151ce1272cfa10cd%3A0xa61f18460155d838!2sLamico%20Trading%20Company!5e0!3m2!1sar!2s!4v1782738891402!5m2!1sar!2s',
  // Leave a link empty to hide its icon. Real profile URLs are added from the dashboard.
  social: {},
  about: [
    L(
      'تأسست لاميكو للاستثمار عام 2005 برؤية بسيطة وقوية: تقديم منتجات فلسطينية بجودة عالية للمجتمعات في المنطقة وخارجها.',
      'Lamico Investment was founded in 2005 with a simple, powerful vision: delivering high-quality Palestinian products to communities in the region and beyond.',
    ),
    L(
      'ما بدأ كعملية صغيرة نما ليصبح واحداً من أبرز الأسماء في فلسطين. رحلتنا تعكس التزاماً عميقاً بالجودة والاستدامة ورفاهية المجتمع.',
      'What started as a small operation grew into one of the best-known names in Palestine. Our journey reflects a deep commitment to quality, sustainability and community well-being.',
    ),
    L(
      'اليوم، مرافق الإنتاج الحديثة لدينا تعتمد أحدث التقنيات، لضمان أن كل منتج يحمل اسمنا يلبي أعلى معايير الجودة والسلامة.',
      'Today, our modern production facilities rely on the latest technologies, ensuring that every product carrying our name meets the highest quality and safety standards.',
    ),
  ],
  mission: L(
    'تقديم أنقى وأسلم المنتجات للمجتمع الفلسطيني من خلال ممارسات مستدامة وتكنولوجيا مبتكرة والتزام لا يتزعزع بالتميز في كل منتج ننتجه.',
    'To deliver the purest and safest products to the Palestinian community through sustainable practices, innovative technology and an unwavering commitment to excellence in everything we produce.',
  ),
  vision: L(
    'أن نكون العلامة التجارية الأولى في فلسطين — نضع معياراً للنقاء والجودة والمسؤولية تجاه مجتمعنا في كل مدينة وقرية فلسطينية.',
    'To be the leading brand in Palestine — setting a standard for purity, quality and responsibility toward our community in every Palestinian city and village.',
  ),
  values: [
    {
      icon: 'shield',
      title: L('النقاء', 'Purity'),
      text: L('معايير لا تقبل المساومة في كل خطوة من عملية الإنتاج.', 'Uncompromising standards at every step of production.'),
    },
    {
      icon: 'check',
      title: L('الجودة', 'Quality'),
      text: L('عمليات مضبوطة تضمن الثبات والتميز.', 'Controlled processes that ensure consistency and excellence.'),
    },
    {
      icon: 'moon',
      title: L('الاستدامة', 'Sustainability'),
      text: L('إنتاج مسؤول يحمي بيئتنا للأجيال القادمة.', 'Responsible production that protects our environment for future generations.'),
    },
    {
      icon: 'users',
      title: L('المجتمع', 'Community'),
      text: L('بناء مجتمعات أقوى من خلال التوظيف والمسؤولية الاجتماعية.', 'Building stronger communities through employment and social responsibility.'),
    },
    {
      icon: 'bolt',
      title: L('الابتكار', 'Innovation'),
      text: L('تطوير مستمر لتقنياتنا وعملياتنا لمنتجات أفضل.', 'Continuous improvement of our technology and processes for better products.'),
    },
    {
      icon: 'globe',
      title: L('الانتشار المحلي', 'Local reach'),
      text: L('التواجد في كل مدينة وقرية فلسطينية في الضفة الغربية والداخل.', 'Present in every Palestinian city and village across the West Bank and the interior.'),
    },
  ],
  milestones: [
    {
      year: '2005',
      title: L('تأسيس لاميكو', 'Lamico is founded'),
      text: L('انطلاقة لاميكو للاستثمار برؤية طموحة لبناء مجموعة استثمارية متنوعة في فلسطين.', 'Lamico Investment launches with an ambitious vision to build a diversified investment group in Palestine.'),
    },
    {
      year: '2012',
      title: L('شهادة ISO 9001', 'ISO 9001 certification'),
      text: L('الحصول على شهادة الجودة، تأكيداً لالتزامنا بأعلى معايير الإنتاج والسلامة.', 'Earning the quality certification, confirming our commitment to the highest production and safety standards.'),
    },
    {
      year: '2022',
      title: L('إطلاق خط البقوليات والزعتر', 'Legumes and zaatar line launched'),
      text: L('التوسع في قطاع المواد الغذائية بإطلاق منتجات البقوليات والزعتر الفلسطيني الأصيل.', 'Expanding into food products with legumes and authentic Palestinian zaatar.'),
    },
    {
      year: '2023',
      title: L('إطلاق مياه القدس', 'Al-Quds Water launched'),
      text: L('إطلاق العلامة التجارية "مياه القدس" — مياه شرب معبأة نقية بجميع الأحجام بخطوط تعبئة حديثة.', 'Launching the "Al-Quds Water" brand — pure bottled drinking water in every size on modern filling lines.'),
    },
    {
      year: '2026',
      title: L('دخول قطاع العقارات', 'Entering real estate'),
      text: L('تأسيس لاميكو العقارية وإطلاق مشروع أكاديمي هاوس — يعيش وعيساوي كأول مشروع سكني متميز.', 'Founding Lamico Real Estate and launching Academy House as its first distinguished residential project.'),
    },
  ],
  standards: [
    { icon: 'check', title: L('ISO 9001:2015', 'ISO 9001:2015'), text: L('نظام إدارة الجودة المعتمد لضمان ثبات التميز في الإنتاج.', 'A certified quality management system that keeps production excellence consistent.') },
    { icon: 'shield', title: L('HACCP', 'HACCP'), text: L('تحليل المخاطر ونقاط التحكم الحرجة لضمان الامتثال لسلامة الغذاء.', 'Hazard analysis and critical control points ensuring food-safety compliance.') },
    { icon: 'moon', title: L('ISO 22000', 'ISO 22000'), text: L('نظام إدارة سلامة الغذاء لضمان سلامة المنتج عبر سلسلة التوريد.', 'A food-safety management system protecting the product across the supply chain.') },
    { icon: 'globe', title: L('GMP', 'GMP'), text: L('ممارسات التصنيع الجيدة لبيئات إنتاج صحية ومراقبة.', 'Good manufacturing practices for hygienic, monitored production environments.') },
  ],
  stats: [
    { key: 'years', value: 21, suffix: '+' },
    { key: 'cities', value: 22, suffix: '' },
    { key: 'bottles', value: 50, suffix: 'M+' },
    { key: 'team', value: 500, suffix: '+' },
  ],
  cities: [
    L('نابلس', 'Nablus'), L('رام الله', 'Ramallah'), L('القدس', 'Jerusalem'), L('الخليل', 'Hebron'),
    L('بيت لحم', 'Bethlehem'), L('جنين', 'Jenin'), L('طولكرم', 'Tulkarm'), L('قلقيلية', 'Qalqilya'),
    L('طوباس', 'Tubas'), L('سلفيت', 'Salfit'), L('أريحا', 'Jericho'), L('حيفا', 'Haifa'),
    L('يافا', 'Jaffa'), L('عكا', 'Acre'), L('الناصرة', 'Nazareth'), L('اللد', 'Lydda'),
    L('الرملة', 'Ramla'), L('أم الفحم', 'Umm al-Fahm'), L('الطيبة', 'Tayibe'),
    L('باقة الغربية', 'Baqa al-Gharbiyye'), L('سخنين', 'Sakhnin'), L('النقب', 'Negev'),
  ],
  // The number is shared for now; every channel can get its own number from the dashboard.
  whatsapp: {
    general: {
      number: '9720597959536',
      message: L('مرحباً، أرغب بالتواصل مع شركة لاميكو الاستثمارية.', 'Hello, I would like to get in touch with Lamico Investment Company.'),
    },
    water: {
      number: '9720597959536',
      message: L('مرحباً، أرغب بالاستفسار عن منتجات المياه.', 'Hello, I would like to inquire about your water products.'),
    },
    realEstate: {
      number: '9720597959536',
      message: L('مرحباً، أرغب بالاستفسار عن إسكان أكاديمي هاوس.', 'Hello, I would like to inquire about Academy House residences.'),
    },
    jobs: {
      number: '9720597959536',
      message: L('مرحباً، لدي استفسار بخصوص الوظائف المتاحة.', 'Hello, I have a question about the available jobs.'),
    },
  },
};
