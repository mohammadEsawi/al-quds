import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SiteDataProvider } from '@/context/SiteData';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/types';
import { Footer } from './Footer';
import { Header } from './Header';
import { WhatsAppFloat } from './WhatsAppFloat';

function PageLoader() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[70vh] items-center justify-center">
      <span className="size-10 animate-pulse rounded-full bg-primary/20 ring-8 ring-primary/10" />
    </div>
  );
}

function Shell() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  // Start every page at the top (hash links are handled by the browser).
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <SiteDataProvider>
      <a
        href="#main"
        className="sr-only z-[200] rounded-lg bg-white px-4 py-2 font-semibold text-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t.common.skipToContent}
      </a>
      <Header />
      <main id="main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppFloat />
    </SiteDataProvider>
  );
}

/** Route element for `/ar/*` and `/en/*` — provides translations and the page shell. */
export function LangLayout({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <Shell />
    </I18nProvider>
  );
}
