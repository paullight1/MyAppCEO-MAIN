import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminReviewQueuePage } from './pages/AdminReviewQueuePage';
import { AdminVerificationQueuePage } from './pages/AdminVerificationQueuePage';
import { AdminNotificationPage } from './pages/AdminNotificationPage';
import { AdminBlogPage } from './pages/AdminBlogPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { MarketplaceOversight } from './pages/MarketplaceOversight';
import { DocumentationPage } from './pages/DocumentationPage';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/review" element={<AdminReviewQueuePage />} />
          <Route path="/verifications" element={<AdminVerificationQueuePage />} />
          <Route path="/notifications" element={<AdminNotificationPage />} />
          <Route path="/blog" element={<AdminBlogPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/marketplace" element={<DashboardLayout><MarketplaceOversight /></DashboardLayout>} />
          <Route path="/documentation" element={<DashboardLayout><DocumentationPage /></DashboardLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
