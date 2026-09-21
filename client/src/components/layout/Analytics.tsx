import { useEffect } from 'react';
import { getPublicConfig } from '@/services/config.service';

/**
 * Privacy-friendly visitor statistics (Plausible or Umami — no cookies, no personal data, so no consent banner)
 * and the Google Search Console verification tag. Everything comes from the server's configuration; without it
 * this renders nothing. Not mounted in the dashboard. Visitors who send "Do Not Track" are not counted.
 */
export function Analytics() {
  useEffect(() => {
    let script: HTMLScriptElement | undefined;
    let cancelled = false;

    void getPublicConfig().then((config) => {
      if (cancelled) return;

      if (config.googleSiteVerification && !document.head.querySelector('meta[name="google-site-verification"]')) {
        const meta = document.createElement('meta');
        meta.name = 'google-site-verification';
        meta.content = config.googleSiteVerification;
        document.head.appendChild(meta);
      }

      const { analytics } = config;
      if (!analytics || navigator.doNotTrack === '1') return;
      script = document.createElement('script');
      script.defer = true;
      script.src = analytics.scriptUrl;
      if (analytics.provider === 'plausible' && analytics.domain) script.setAttribute('data-domain', analytics.domain);
      else if (analytics.provider === 'umami' && analytics.websiteId) {
        script.setAttribute('data-website-id', analytics.websiteId);
        script.setAttribute('data-do-not-track', 'true');
      } else return;
      document.head.appendChild(script);
    });

    return () => {
      cancelled = true;
      script?.remove();
    };
  }, []);

  return null;
}
