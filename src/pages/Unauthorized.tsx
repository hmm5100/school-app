// src/pages/Unauthorized.tsx

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldOff, ArrowRight, LogOut } from 'lucide-react';

const Unauthorized = () => {
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    admin: 'مدير النظام',
    teacher: 'مدرس',
    student: 'طالب',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #f1f5f9',
      }}>
        {/* Icon */}
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <ShieldOff size={36} color="#ef4444" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1a202c', marginBottom: '12px' }}>
          غير مصرح بالدخول
        </h1>

        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </p>

        {userRole && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '6px 14px',
            marginBottom: '32px',
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>دورك الحالي:</span>
            <span style={{ fontSize: '12px', color: '#2555a0', fontWeight: '700' }}>
              {roleLabel[userRole] || userRole}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,85,160,0.3)',
            }}
          >
            <ArrowRight size={16} />
            العودة للرئيسية
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '12px 24px',
              background: 'white', color: '#ef4444',
              border: '1.5px solid #fecaca', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            تسجيل خروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
