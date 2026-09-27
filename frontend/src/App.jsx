import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Landing from './pages/Landing';
import Submit from './pages/Submit';
import Confirmation from './pages/Confirmation';
import AdminLogin from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import FeedbackExplorer from './pages/admin/FeedbackExplorer';
import FeedbackDetail from './pages/admin/FeedbackDetail';
import Moderation from './pages/admin/Moderation';
import Analytics from './pages/admin/Analytics';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/confirmation" element={<Confirmation />} />

        {/* Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Admin (protected) */}
        <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute><FeedbackExplorer /></ProtectedRoute>} />
        <Route path="/admin/feedback/:id" element={<ProtectedRoute><FeedbackDetail /></ProtectedRoute>} />
        <Route path="/admin/moderation" element={<ProtectedRoute><Moderation /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
