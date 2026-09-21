/**
 * Security headers for the built website (the files in `dist/`).
 *
 * The API sends its own headers (helmet). These are for whatever serves the static site — nginx, a CDN,
 * `vite preview`. `deploy/nginx.conf` repeats the same values; keep the two in sync.
 *
 * CSP notes: fonts come from Google Fonts, the contact map is a Google Maps embed, product images and
 * videos are uploaded to this same origin (`/uploads`). React, GSAP and Framer Motion set inline styles
 * through the CSSOM (allowed), and Tailwind ships as a stylesheet, so no `unsafe-inline` for styles.
 */
/**
 * Optional: the address of your visitor-statistics service (ANALYTICS_HOST=https://plausible.io when the site is built),
 * which must be allowed to load its script and receive events.
 */
const analyticsHost = process.env['ANALYTICS_HOST']?.trim();
const allowAnalytics = analyticsHost ? ` ${analyticsHost}` : '';

/** Cloudflare Turnstile (the CAPTCHA on the public forms) loads a script and shows its check in a frame. */
const TURNSTILE = 'https://challenges.cloudflare.com';

export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${TURNSTILE}${allowAnalytics}`,
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  `connect-src 'self' ${TURNSTILE}${allowAnalytics}`,
  `frame-src https://www.google.com ${TURNSTILE}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': contentSecurityPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Only meaningful over HTTPS; browsers ignore it on http://localhost.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
