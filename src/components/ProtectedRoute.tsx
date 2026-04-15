// src/components/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Roles allowed to access this route.
   * If omitted, any authenticated user (any role) can access.
   */
  allowedRoles?: UserRole[];
  /**
   * Where to redirect unauthenticated users.
   * Defaults to /login for admin/teacher routes.
   */
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { userRole, loading, currentUser, studentProfile } = useAuth();
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f4f8',
        fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            border: '3px solid #e2e8f0',
            borderTopColor: '#2555a0',
            margin: '0 auto 14px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Dev mode bypass ─────────────────────────
  // In development without Firebase, we allow access to avoid blocking UI work.
  if (isDev && !currentUser && !studentProfile) {
    // Still enforce role checks even in dev when a role is present
    if (!userRole) {
      return <>{children}</>;
    }
  }

  // ── Not authenticated ───────────────────────
  const isAuthenticated = !!(currentUser || studentProfile || (isDev && !currentUser && !studentProfile));

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // ── Role check ──────────────────────────────
  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
