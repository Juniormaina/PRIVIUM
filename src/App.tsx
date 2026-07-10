import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './providers/app-providers';
import { ProtectedRoute } from './components/guards/protected-route';
import { GuestRoute } from './components/guards/guest-route';

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('./pages/login'));
const SignupPage = lazy(() => import('./pages/signup'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const TreasuryPage = lazy(() => import('./pages/treasury'));
const PayrollPage = lazy(() => import('./pages/payroll'));
const OrganizationPage = lazy(() => import('./pages/organization'));
const SettingsPage = lazy(() => import('./pages/settings'));
const AdminPage = lazy(() => import('./pages/admin'));
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

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
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

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}