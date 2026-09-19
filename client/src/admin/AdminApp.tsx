import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RequireAuth, RequireRole } from './auth';
import { ConfirmProvider, ToastProvider } from './components/ui';
import { AdminLayout } from './layout/AdminLayout';
import { CategoriesPage, SectorsPage, WaterLabelsPage } from './pages/CatalogPages';
import DashboardPage from './pages/DashboardPage';
import { ApplicationsPage, MessagesPage } from './pages/InboxPages';
import { JobEditPage, JobsListPage } from './pages/JobsPages';
import LoginPage from './pages/LoginPage';
import MediaPage from './pages/MediaPage';
import ProductEditPage from './pages/ProductEditPage';
import ProductsPage from './pages/ProductsPage';
import { RealEstateEditPage, RealEstateListPage } from './pages/RealEstatePages';
import { CompanyPage, HomeContentPage, SettingsPage, WhatsAppPage } from './pages/SitePages';
import { AccountPage, UsersPage } from './pages/UsersPages';

/**
 * The whole admin dashboard, mounted at `/admin/*`. Loaded lazily so visitors of the public site
 * never download it. Access is enforced twice: here by role guards, and again by the API.
 */
export default function AdminApp() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />

                {/* content: every signed-in role */}
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/:id" element={<ProductEditPage />} />
                <Route path="water-labels" element={<WaterLabelsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="sectors" element={<SectorsPage />} />
                <Route path="real-estate" element={<RealEstateListPage />} />
                <Route path="real-estate/:id" element={<RealEstateEditPage />} />
                <Route path="jobs" element={<JobsListPage />} />
                <Route path="jobs/:id" element={<JobEditPage />} />
                <Route path="media" element={<MediaPage />} />
                <Route path="account" element={<AccountPage />} />

                {/* private data and site settings: admins */}
                <Route element={<RequireRole roles={['SUPER_ADMIN', 'ADMIN']} />}>
                  <Route path="applications" element={<ApplicationsPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="home" element={<HomeContentPage />} />
                  <Route path="company" element={<CompanyPage />} />
                  <Route path="whatsapp" element={<WhatsAppPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* user management: super admin */}
                <Route element={<RequireRole roles={['SUPER_ADMIN']} />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
