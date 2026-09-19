import axios from 'axios';
import { api, getErrorCode, type ApiErrorBody } from '@/api/client';
import { errorMessages } from './labels';
import type {
  AdminUser,
  ApplicationDTO,
  ApplicationStatusKey,
  CategoryDTO,
  CompanyDTO,
  DashboardDTO,
  JobDTO,
  MediaDTO,
  MessageDTO,
  NotificationDTO,
  Paged,
  ProductDTO,
  RealEstateDTO,
  SectorDTO,
  SettingDTO,
  WaterLabelDTO,
  WhatsAppChannelDTO,
} from './types';

/** Extracts a readable message (and field-level problems) from any failed admin request. */
export function describeError(error: unknown): { message: string; fields: { path: string; message: string }[] } {
  const code = getErrorCode(error);
  let fields: { path: string; message: string }[] = [];
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const details = error.response?.data?.error?.details;
    if (Array.isArray(details)) fields = details as { path: string; message: string }[];
  }
  return { message: errorMessages[code] ?? 'حدث خطأ غير متوقع، حاول مرة أخرى', fields };
}

const data = <T>(promise: Promise<{ data: T }>): Promise<T> => promise.then((r) => r.data);
const none = (promise: Promise<unknown>): Promise<void> => promise.then(() => undefined);

type Params = Record<string, string | number | boolean | undefined>;
const clean = (params?: Params) => Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''));

/** Typed wrappers around `/api/admin/*`. Every call sends the session cookie. */
export const adminApi = {
  auth: {
    login: (email: string, password: string) => data<{ user: AdminUser }>(api.post('/auth/login', { email, password })),
    logout: () => none(api.post('/auth/logout')),
    me: () => data<{ user: AdminUser }>(api.get('/auth/me')),
    changePassword: (currentPassword: string, newPassword: string) => none(api.post('/auth/change-password', { currentPassword, newPassword })),
  },
  dashboard: () => data<DashboardDTO>(api.get('/admin/dashboard')),

  products: {
    list: (params?: Params) => data<Paged<ProductDTO>>(api.get('/admin/products', { params: clean(params) })),
    get: (id: string) => data<ProductDTO>(api.get(`/admin/products/${id}`)),
    create: (body: unknown) => data<ProductDTO>(api.post('/admin/products', body)),
    update: (id: string, body: unknown) => data<ProductDTO>(api.put(`/admin/products/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/products/${id}`)),
    reorder: (items: { id: string; sortOrder: number }[]) => none(api.post('/admin/products/reorder', { items })),
  },
  categories: {
    list: () => data<CategoryDTO[]>(api.get('/admin/categories')),
    create: (body: unknown) => data<CategoryDTO>(api.post('/admin/categories', body)),
    update: (id: string, body: unknown) => data<CategoryDTO>(api.put(`/admin/categories/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/categories/${id}`)),
  },
  labels: {
    list: () => data<WaterLabelDTO[]>(api.get('/admin/water/labels')),
    create: (body: unknown) => data<WaterLabelDTO>(api.post('/admin/water/labels', body)),
    update: (id: string, body: unknown) => data<WaterLabelDTO>(api.put(`/admin/water/labels/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/water/labels/${id}`)),
  },
  sectors: {
    list: () => data<SectorDTO[]>(api.get('/admin/sectors')),
    update: (id: string, body: unknown) => data<SectorDTO>(api.put(`/admin/sectors/${id}`, body)),
  },
  realEstate: {
    list: () => data<RealEstateDTO[]>(api.get('/admin/real-estate')),
    get: (id: string) => data<RealEstateDTO>(api.get(`/admin/real-estate/${id}`)),
    create: (body: unknown) => data<RealEstateDTO>(api.post('/admin/real-estate', body)),
    update: (id: string, body: unknown) => data<RealEstateDTO>(api.put(`/admin/real-estate/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/real-estate/${id}`)),
  },
  jobs: {
    list: (params?: Params) => data<Paged<JobDTO>>(api.get('/admin/jobs', { params: clean(params) })),
    get: (id: string) => data<JobDTO>(api.get(`/admin/jobs/${id}`)),
    create: (body: unknown) => data<JobDTO>(api.post('/admin/jobs', body)),
    update: (id: string, body: unknown) => data<JobDTO>(api.put(`/admin/jobs/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/jobs/${id}`)),
  },
  applications: {
    list: (params?: Params) => data<Paged<ApplicationDTO>>(api.get('/admin/applications', { params: clean(params) })),
    get: (id: string) => data<ApplicationDTO>(api.get(`/admin/applications/${id}`)),
    update: (id: string, body: { status?: ApplicationStatusKey; notes?: string | null }) => data<ApplicationDTO>(api.patch(`/admin/applications/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/applications/${id}`)),
    cvUrl: (id: string) => `/api/admin/applications/${id}/cv`,
  },
  messages: {
    list: (params?: Params) => data<Paged<MessageDTO>>(api.get('/admin/messages', { params: clean(params) })),
    get: (id: string) => data<MessageDTO>(api.get(`/admin/messages/${id}`)),
    setRead: (id: string, isRead: boolean) => data<MessageDTO>(api.patch(`/admin/messages/${id}`, { isRead })),
    remove: (id: string) => none(api.delete(`/admin/messages/${id}`)),
  },
  notifications: {
    list: (params?: Params) => data<Paged<NotificationDTO> & { unread: number }>(api.get('/admin/notifications', { params: clean(params) })),
    markRead: (id: string) => none(api.patch(`/admin/notifications/${id}/read`)),
    markAllRead: () => none(api.post('/admin/notifications/read-all')),
  },
  media: {
    list: (params?: Params) => data<Paged<MediaDTO>>(api.get('/admin/media', { params: clean(params) })),
    upload: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return data<MediaDTO>(api.post('/admin/media', form, { timeout: 120_000 }));
    },
    replace: (id: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return data<MediaDTO>(api.post(`/admin/media/${id}/replace`, form, { timeout: 120_000 }));
    },
    update: (id: string, body: unknown) => data<MediaDTO>(api.patch(`/admin/media/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/media/${id}`)),
  },
  company: {
    get: () => data<CompanyDTO>(api.get('/admin/company')),
    update: (body: unknown) => data<CompanyDTO>(api.put('/admin/company', body)),
  },
  whatsapp: {
    list: () => data<WhatsAppChannelDTO[]>(api.get('/admin/whatsapp')),
    save: (channels: WhatsAppChannelDTO[]) => data<WhatsAppChannelDTO[]>(api.put('/admin/whatsapp', { channels })),
  },
  settings: {
    list: () => data<SettingDTO[]>(api.get('/admin/settings')),
    save: (key: string, value: unknown) => data<SettingDTO>(api.put(`/admin/settings/${encodeURIComponent(key)}`, { value })),
  },
  users: {
    list: () => data<AdminUser[]>(api.get('/admin/users')),
    create: (body: unknown) => data<AdminUser>(api.post('/admin/users', body)),
    update: (id: string, body: unknown) => data<AdminUser>(api.patch(`/admin/users/${id}`, body)),
    remove: (id: string) => none(api.delete(`/admin/users/${id}`)),
  },
};
