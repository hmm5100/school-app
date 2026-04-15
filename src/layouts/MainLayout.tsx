// src/layouts/MainLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

// صفحات تملى الشاشة كاملة بدون padding
const FULL_SCREEN_PAGES = ['/chat', '/active-users'];

// صفحات بدون padding - بتتحكم في الـ padding بنفسها
const NO_PADDING_PREFIXES = ['/exams/'];

// صفحات بخلفية فاتحة
const LIGHT_BG_PAGES = [
  '/dashboard',
  '/students',
  '/teachers',
  '/subjects',
  '/classes',
  '/exams',
  '/grades',
  '/reports',
  '/honor-roll',
  '/certificates',
  '/notifications',
  '/settings',
  '/admin',
  '/audit-logs',
  '/activity-log',
  '/active-users',
  '/profile',
];

const MainLayout = () => {
  const { currentUser, studentProfile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  const isFullScreen = FULL_SCREEN_PAGES.includes(location.pathname);
  // صفحات تفاصيل الامتحان - مسار فيه ID بعد /exams/
  const isNoPadding = location.pathname.startsWith('/exams/') && location.pathname.length > 7;
  const isLightPage = LIGHT_BG_PAGES.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            border: '3px solid #1e293b', borderTopColor: '#3b82f6',
            margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            جاري التحميل...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isAuthenticated = !!(currentUser || studentProfile || isDev);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const bgColor = isLightPage ? '#f0f4f8' : '#0f172a';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: bgColor,
      overflow: 'hidden',
      flexDirection: 'row',
    }}>
      <Sidebar isOpen={sidebarOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Navbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        {/* ✅ الحل الجذري: className="light-page" أو "dark-page" على عنصر main */}
        <main
          className={isLightPage ? 'light-page' : 'dark-page'}
          style={{
            flex: 1,
            padding: isFullScreen || isNoPadding ? '0' : '24px',
            overflowY: isFullScreen ? 'hidden' : 'auto',
            overflowX: 'hidden',
            background: bgColor,
            width: '100%',
            boxSizing: 'border-box',
            direction: 'rtl',
            /* ✅ إضافة لون النص مباشرة عشان الـ Tailwind classes تشتغل صح */
            color: isLightPage ? '#1e293b' : '#f1f5f9',
          }}
        >
          <div className={isFullScreen ? '' : 'fade-in'} style={{ width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
