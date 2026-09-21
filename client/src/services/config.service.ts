import { api } from '@/api/client';

/** Settings the server exposes for the website at run time (public keys only — nothing secret). */
export interface PublicConfig {
  /** Cloudflare Turnstile site key; null when the forms are not protected by a CAPTCHA. */
  turnstileSiteKey: string | null;
  analytics: { provider: 'plausible' | 'umami'; domain: string | null; websiteId: string | null; scriptUrl: string } | null;
  googleSiteVerification: string | null;
}

const EMPTY: PublicConfig = { turnstileSiteKey: null, analytics: null, googleSiteVerification: null };

let cached: Promise<PublicConfig> | undefined;

/** Loaded once per visit. If the API is unreachable the site simply runs without the optional extras. */
export function getPublicConfig(): Promise<PublicConfig> {
  cached ??= api
    .get<PublicConfig>('/config')
    .then((response) => ({ ...EMPTY, ...response.data }))
    .catch(() => EMPTY);
  return cached;
}
