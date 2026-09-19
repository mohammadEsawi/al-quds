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
  RATE_LIMITED: 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة',
  NETWORK_ERROR: 'تعذّر الاتصال بالخادم',
};

export const formatDate = (iso?: string | null, withTime = false) =>
  iso
    ? new Intl.DateTimeFormat('ar-PS-u-nu-latn', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(iso))
    : '—';

export const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
