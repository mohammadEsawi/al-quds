import { createContext, useContext, type ReactNode } from 'react';
import type { CompanyInfo, HomeContent, Sector } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { SplashHold } from '@/lib/splash';
import { getCompany, getHomeContent, getSectors } from '@/services/content.service';

interface SiteData {
  company: CompanyInfo;
  sectors: Sector[];
  home: HomeContent;
}

const SiteDataContext = createContext<SiteData | null>(null);

/** Loads the company profile and sector list once; every layout component reads from here. */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const { data } = useAsync(async () => {
    const [company, sectors, home] = await Promise.all([getCompany(), getSectors(), getHomeContent()]);
    return { company, sectors, home };
  });

  // Until the company profile is here there is nothing to show: the first-load splash covers the wait.
  if (!data) return <SplashHold />;
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  const value = useContext(SiteDataContext);
  if (!value) throw new Error('useSiteData must be used inside <SiteDataProvider>');
  return value;
}
