import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ClaimsProvider } from './ClaimsContext';
import { Toaster } from 'sonner';
import { AlertTriangle } from 'lucide-react';

// Pages
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Insurance } from './pages/Insurance';
import { Claims } from './pages/Claims';
import { Profile } from './pages/Profile';
import { Support } from './pages/Support';
import { Terms } from './pages/Terms';
import { Auth } from './pages/Auth';
import { Admin } from './pages/Admin';

import { Sidebar } from './components/Sidebar';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If user is logged in but has no profile, redirect to onboarding
  if (!profile && location.pathname !== '/onboarding' && location.pathname !== '/signup') {
    return <Navigate to="/onboarding" replace />;
  }

  // Role-based access control
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-12 border border-neutral-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Unauthorized Access</h2>
            <p className="text-neutral-500 font-medium">This section is restricted to Admin users only.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/insurance" element={
        <ProtectedRoute>
          <Insurance />
        </ProtectedRoute>
      } />
      
      <Route path="/claims" element={
        <ProtectedRoute>
          <Claims />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/support" element={
        <ProtectedRoute>
          <Support />
        </ProtectedRoute>
      } />

      <Route path="/terms" element={
        <ProtectedRoute>
          <Terms />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/analytics" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/claims" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/workers" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/risk-map" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/fraud" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/triggers" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const AppContent: React.FC = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {!isLandingPage && <Sidebar />}
      <main className={`flex-1 overflow-y-auto relative ${isLandingPage ? 'w-full' : ''}`}>
        <AppRoutes />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ClaimsProvider>
        <Router>
          <AppContent />
          <Toaster position="top-right" richColors />
        </Router>
      </ClaimsProvider>
    </AuthProvider>
  );
}

