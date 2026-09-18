import axios from 'axios';

/** Shared axios instance. The session lives in an httpOnly cookie, so credentials must be sent. */
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
});

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Extracts the machine-readable error code; UI text comes from the i18n dictionary, never raw backend messages. */
export function getErrorCode(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.code ?? (error.response ? 'UNKNOWN' : 'NETWORK_ERROR');
  }
  return 'UNKNOWN';
}
