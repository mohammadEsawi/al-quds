import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { LangLayout } from '@/components/layout/LangLayout';
import { LOCALE_STORAGE_KEY } from '@/i18n/I18nProvider';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/types';

// Every page is code-split so heavy animation code only loads where it is used.
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const SectorsPage = lazy(() => import('@/pages/SectorsPage'));
const WaterPage = lazy(() => import('@/pages/WaterPage'));
const SectorPage = lazy(() => import('@/pages/SectorPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const FoodPage = lazy(() => import('@/pages/FoodPage'));
const RealEstatePage = lazy(() => import('@/pages/RealEstatePage'));
const RealEstateDetailPage = lazy(() => import('@/pages/RealEstateDetailPage'));
const CareersPage = lazy(() => import('@/pages/CareersPage'));
const JobDetailPage = lazy(() => import('@/pages/JobDetailPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/** `/` → the visitor's last language, falling back to Arabic. */
function RootRedirect() {
  let locale = DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved ?? undefined)) locale = saved as typeof DEFAULT_LOCALE;
  } catch {
    /* ignore */
  }
  return <Navigate to={`/${locale}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path=":lang" element={<LangLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="sectors" element={<SectorsPage />} />
        <Route path="water" element={<WaterPage />} />
        <Route path="plastic" element={<SectorPage sector="plastic" />} />
        <Route path="preforms" element={<SectorPage sector="preforms" />} />
        <Route path="caps" element={<SectorPage sector="caps" />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="food" element={<FoodPage />} />
        <Route path="real-estate" element={<RealEstatePage />} />
        <Route path="real-estate/:slug" element={<RealEstateDetailPage />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="careers/:slug" element={<JobDetailPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<LegalPage kind="privacy" />} />
        <Route path="terms" element={<LegalPage kind="terms" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
