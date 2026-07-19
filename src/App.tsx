import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from './providers/app-providers';
import { ProtectedRoute } from './components/guards/protected-route';
import { GuestRoute } from './components/guards/guest-route';
import { OrganizationProvider } from './providers/organization-provider';

// Lazy load pages for better performance
import { lazy, Suspense, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = lazy(() => import('./pages/landing'));
const LoginPage = lazy(() => import('./pages/login'));
const SignupPage = lazy(() => import('./pages/signup'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const TreasuryPage = lazy(() => import('./pages/treasury'));
const PayrollPage = lazy(() => import('./pages/payroll'));
const OrganizationPage = lazy(() => import('./pages/organization'));
const SettingsPage = lazy(() => import('./pages/settings'));
const AdminPage = lazy(() => import('./pages/admin'));
const AIAssistantPage = lazy(() => import('./pages/ai-assistant'));
const NotFoundPage = lazy(() => import('./pages/not-found'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-privium-500 border-t-transparent" />
        <p className="text-sm text-surface-500">Loading...</p>
      </div>
    </div>
  );
}

function KeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
      return;
    }

    // ⌘K or Ctrl+K — Command palette (navigate to AI assistant)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      navigate('/ai-assistant');
      return;
    }

    // ⌘D or Ctrl+D — Dashboard
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      navigate('/dashboard');
      return;
    }

    // ⌘T or Ctrl+T — Treasury
    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault();
      navigate('/treasury');
      return;
    }

    // ⌘P or Ctrl+P — Payroll
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault();
      navigate('/payroll');
      return;
    }

    // ⌘,  — Settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      navigate('/settings');
      return;
    }

    // ? — Show keyboard shortcuts help
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      // Could show a modal here — for now just navigate to settings
      e.preventDefault();
      navigate('/ai-assistant');
      return;
    }

    // g then o — Go to Organization
    if (e.key === 'o' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      // Only trigger if we're not already typing
      navigate('/organization');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <OrganizationProvider>
            <KeyboardShortcuts />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <GuestRoute>
                    <SignupPage />
                  </GuestRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/treasury"
                element={
                  <ProtectedRoute>
                    <TreasuryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization"
                element={
                  <ProtectedRoute>
                    <OrganizationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AIAssistantPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </OrganizationProvider>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}