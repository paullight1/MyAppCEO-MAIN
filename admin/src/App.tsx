import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import { AdminReviewQueuePage } from './pages/AdminReviewQueuePage';
import { AdminVerificationQueuePage } from './pages/AdminVerificationQueuePage';
import { AdminNotificationPage } from './pages/AdminNotificationPage';
import { AdminBlogPage } from './pages/AdminBlogPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { MarketplaceOversight } from './pages/MarketplaceOversight';
import { DocumentationPage } from './pages/DocumentationPage';
import { Dashboard } from './pages/Dashboard';
import { AdminAuthPage } from './pages/AdminAuthPage';

const protectedRoute = (element: React.ReactNode) => (
  <AdminRouteGuard>{element}</AdminRouteGuard>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AdminAuthPage />} />
          <Route path="/" element={protectedRoute(<Dashboard />)} />
          <Route path="/review" element={protectedRoute(<AdminReviewQueuePage />)} />
          <Route path="/verifications" element={protectedRoute(<AdminVerificationQueuePage />)} />
          <Route path="/notifications" element={protectedRoute(<AdminNotificationPage />)} />
          <Route path="/blog" element={protectedRoute(<AdminBlogPage />)} />
          <Route path="/audit-log" element={protectedRoute(<AuditLogPage />)} />
          <Route
            path="/marketplace"
            element={protectedRoute(<DashboardLayout><MarketplaceOversight /></DashboardLayout>)}
          />
          <Route
            path="/documentation"
            element={protectedRoute(<DashboardLayout><DocumentationPage /></DashboardLayout>)}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
