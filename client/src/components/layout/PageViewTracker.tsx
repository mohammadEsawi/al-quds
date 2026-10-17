import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { api } from '@/api/client';

/**
 * Feeds the dashboard's visits/countries widget: one call per page the visitor opens. No cookie,
 * no stored IP address and no persistent identifier — the server only keeps the page path, the
 * country and a same-day rotating hash (see server/src/services/analytics.service.ts) — which is
 * why this needs no cookie-consent banner. Never mounted in the dashboard, so staff visits are not
 * counted, and visitors who send "Do Not Track" are skipped (matches <Analytics />).
 */
export function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (navigator.doNotTrack === '1') return;
    void api.post('/track', { path: pathname }).catch(() => {
      // a lost page view is never worth surfacing to the visitor
    });
  }, [pathname]);

  return null;
}
