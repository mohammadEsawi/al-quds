import { createContext, useContext, type ReactNode } from 'react';
import type { CompanyInfo, Sector } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { getCompany, getSectors } from '@/services/content.service';

interface SiteData {
  company: CompanyInfo;
  sectors: Sector[];
}

const SiteDataContext = createContext<SiteData | null>(null);

/** Loads the company profile and sector list once; every layout component reads from here. */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const { data } = useAsync(async () => {
    const [company, sectors] = await Promise.all([getCompany(), getSectors()]);
    return { company, sectors };
  });

  if (!data) return null;
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  const value = useContext(SiteDataContext);
  if (!value) throw new Error('useSiteData must be used inside <SiteDataProvider>');
  return value;
}
