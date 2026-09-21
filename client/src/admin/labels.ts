import type {
  ApplicationStatusKey,
  ContentStatus,
  EmploymentTypeKey,
  JobStatusKey,
  ProductSectorKey,
  RealEstateStatus,
  Role,
  WhatsAppChannelKey,
} from './types';

/** Arabic interface text for the dashboard. Content itself is always edited in both languages. */

export const sectorLabels: Record<ProductSectorKey, string> = {
  water: 'المياه',
  plastic: 'البلاستيك',
  preforms: 'البريفورم',
  caps: 'الأغطية',
  food: 'المنتجات الغذائية',
};

export const sectorKeys = Object.keys(sectorLabels) as ProductSectorKey[];

export const statusLabels: Record<ContentStatus, string> = { draft: 'مسودة', published: 'منشور', hidden: 'مخفي' };
export const jobStatusLabels: Record<JobStatusKey, string> = { draft: 'مسودة', open: 'مفتوحة', closed: 'مغلقة' };

export const applicationStatusLabels: Record<ApplicationStatusKey, string> = {
  new: 'جديد',
  reviewed: 'تمت المراجعة',
  shortlisted: 'مرشّح',
  interview: 'مقابلة',
  rejected: 'مرفوض',
  accepted: 'مقبول',
};

export const employmentLabels: Record<EmploymentTypeKey, string> = {
  fullTime: 'دوام كامل',
  partTime: 'دوام جزئي',
  contract: 'عقد',
  internship: 'تدريب',
};

export const realEstateStatusLabels: Record<RealEstateStatus, string> = {
  planning: 'قيد التخطيط',
  construction: 'قيد الإنشاء',
  available: 'متاح',
  sold: 'مباع',
};

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'مدير عام',
  ADMIN: 'مدير',
  EDITOR: 'محرر محتوى',
};

export const channelLabels: Record<WhatsAppChannelKey, string> = {
  GENERAL: 'عام',
  WATER: 'المياه',
  PLASTIC: 'البلاستيك',
  PREFORMS: 'البريفورم',
  CAPS: 'الأغطية',
  FOOD: 'المنتجات الغذائية',
  REAL_ESTATE: 'العقار',
  JOBS: 'الوظائف',
};

/** Turns an API error code into a sentence the admin can act on. */
export const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة السر غير صحيحة',
  UNAUTHORIZED: 'انتهت الجلسة، سجّل الدخول من جديد',
  FORBIDDEN: 'ليس لديك صلاحية لهذا الإجراء',
  VALIDATION_ERROR: 'بعض الحقول غير صحيحة، راجع الملاحظات بالأسفل',
  SLUG_TAKEN: 'الرابط المختصر (slug) مستخدم مسبقاً',
  CONFLICT: 'يوجد سجل بنفس القيمة مسبقاً',
  NOT_FOUND: 'العنصر غير موجود',
  INVALID_REFERENCE: 'يوجد ارتباط بعنصر غير موجود',
  FILE_TOO_LARGE: 'حجم الملف أكبر من المسموح',
  INVALID_FILE_TYPE: 'نوع الملف غير مدعوم (JPG أو PNG أو WebP أو GIF أو MP4 أو WebM)',
  TYPE_MISMATCH: 'الملف البديل يجب أن يكون من نفس النوع',
  LAST_SUPER_ADMIN: 'يجب أن يبقى مدير عام واحد فعّال على الأقل',
  SELF_DEACTIVATE: 'لا يمكنك تعطيل حسابك',
  SELF_DELETE: 'لا يمكنك حذف حسابك',
  INVALID_CURRENT_PASSWORD: 'كلمة السر الحالية غير صحيحة',
  TOO_MANY_SUBMISSIONS: 'عدد كبير من الطلبات، حاول لاحقاً',
  INVALID_CHARACTERS: 'يحتوي النص على رموز غير مسموحة',
  UPLOAD_ERROR: 'تعذّر رفع الملف',
  CROSS_ORIGIN: 'تم رفض الطلب لأنه من عنوان غير موثوق',
  INVALID_TWO_FACTOR_CODE: 'الرمز غير صحيح، جرّب الرمز الحالي من التطبيق',
  MFA_EXPIRED: 'انتهت مهلة تسجيل الدخول، أدخل كلمة السر من جديد',
  TWO_FACTOR_REQUIRED: 'يجب تفعيل التحقق بخطوتين أولاً',
  TWO_FACTOR_ALREADY_ENABLED: 'التحقق بخطوتين مفعّل مسبقاً',
  TWO_FACTOR_NOT_STARTED: 'ابدأ الإعداد من جديد',
  TWO_FACTOR_NOT_ENABLED: 'التحقق بخطوتين غير مفعّل',
  RATE_LIMITED: 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة',
  NETWORK_ERROR: 'تعذّر الاتصال بالخادم',
};

export const formatDate = (iso?: string | null, withTime = false) =>
  iso
    ? new Intl.DateTimeFormat('ar-PS-u-nu-latn', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(iso))
    : '—';

export const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const quoteStatusLabels: Record<import('./types').QuoteStatusKey, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  quoted: 'أُرسل عرض السعر',
  won: 'تمت الصفقة',
  lost: 'لم تتم',
};

/** What each item of the site checklist means, and what to do about it. */
export const readinessLabels: Record<string, { title: string; hint: string; count?: string }> = {
  productImages: { title: 'صور المنتجات', hint: 'منتجات منشورة بدون صورة', count: 'منتج بدون صورة' },
  sampleProducts: { title: 'منتجات تجريبية', hint: 'استبدل النماذج التجريبية بمنتجات حقيقية أو احذفها', count: 'نموذج تجريبي' },
  waterLabelImages: { title: 'صور ملصقات المياه', hint: 'ارفع صورة لكل ملصق مياه', count: 'ملصق بدون صورة' },
  sampleJobs: { title: 'وظائف تجريبية', hint: 'استبدل الوظائف التجريبية بوظائف حقيقية أو احذفها', count: 'وظيفة تجريبية' },
  teamPhotos: { title: 'صور الإدارة', hint: 'ارفع صورة لكل عضو في مجلس الإدارة والإدارة التنفيذية', count: 'شخص بدون صورة' },
  teamPlaceholders: { title: 'بيانات مؤقتة في الإدارة', hint: 'أضف اسم رئيس مجلس الإدارة وبياناته الحقيقية', count: 'مؤقت' },
  leaderMessages: { title: 'كلمتا رئيس المجلس والمدير العام', hint: 'أضف النص من صفحة «الإدارة» ليظهر في الصفحة الرئيسية وفي صفحته الخاصة' },
  logo: { title: 'شعار الشركة', hint: 'ارفع الشعار الرسمي من «معلومات الشركة»' },
  mapEmbed: { title: 'خريطة الموقع', hint: 'أضف رابط خريطة Google في «معلومات الشركة»' },
  emailServer: { title: 'خادم البريد (SMTP)', hint: 'أضف بيانات SMTP في ملف server/.env لتصلك إشعارات البريد' },
  emailRecipients: { title: 'مستلمو إشعارات البريد', hint: 'فعّل الإشعارات وأضف بريداً من صفحة «الإشعارات»', count: 'مستلم' },
  whatsappAlerts: { title: 'إشعارات واتساب', hint: 'اختياري: أضف WHATSAPP_TOKEN في .env ثم فعّل القناة' },
  captcha: { title: 'حماية النماذج (CAPTCHA)', hint: 'أضف مفاتيح Cloudflare Turnstile في .env لمنع السبام' },
  antivirus: { title: 'فحص فيروسات السير الذاتية', hint: 'شغّل ClamAV وأضف CLAMAV_HOST في .env' },
  twoFactorMine: { title: 'التحقق بخطوتين لحسابك', hint: 'فعّله من صفحة «حسابي»' },
  twoFactorAdmins: { title: 'التحقق بخطوتين للمديرين', hint: 'مديرون بدون تحقق بخطوتين', count: 'مدير' },
  databaseUser: { title: 'مستخدم قاعدة البيانات', hint: 'التطبيق يتصل كمستخدم superuser، أنشئ مستخدماً محدود الصلاحيات (README)' },
  production: { title: 'وضع الإنتاج', hint: 'اضبط NODE_ENV=production عند النشر' },
  backups: { title: 'النسخ الاحتياطي', hint: 'لا يوجد نسخ حديث. شغّل npm run backup وجدولته' },
  analytics: { title: 'إحصائيات الزوار', hint: 'اختياري: فعّل Plausible أو Umami من ملف .env' },
  searchConsole: { title: 'Google Search Console', hint: 'أضف GOOGLE_SITE_VERIFICATION ثم أرسل sitemap.xml' },
};

export const readinessGroups: Record<string, string> = {
  content: 'المحتوى',
  notifications: 'الإشعارات',
  security: 'الأمان',
  operations: 'التشغيل',
};
