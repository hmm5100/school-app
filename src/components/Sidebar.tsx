// src/components/Sidebar.tsx
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BarChart2,
  Award,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  Bell,
  UserCog,
  School,
  Trophy,
  Activity,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'لوحة التحكم', roles: ['admin', 'teacher'] },
  { path: '/students', icon: <Users size={19} />, label: 'الطلاب', roles: ['admin', 'teacher'] },
  { path: '/classes', icon: <School size={19} />, label: 'الفصول', roles: ['admin', 'teacher'] },
  { path: '/teachers', icon: <UserCog size={19} />, label: 'المدرسين', roles: ['admin'] },
  { path: '/subjects', icon: <BookOpen size={19} />, label: 'المواد الدراسية', roles: ['admin', 'teacher'] },
  { path: '/exams', icon: <ClipboardList size={19} />, label: 'الامتحانات', roles: ['admin', 'teacher', 'student'] },
  { path: '/grades', icon: <GraduationCap size={19} />, label: 'الدرجات', roles: ['admin', 'teacher'] },
  { path: '/exam-retake-requests', icon: <RefreshCw size={19} />, label: 'طلبات إعادة الامتحان', roles: ['admin', 'teacher'] },
  { path: '/reports', icon: <BarChart2 size={19} />, label: 'التقارير والإحصائيات', roles: ['admin', 'teacher'] },
  { path: '/honor-roll', icon: <Trophy size={19} />, label: 'لوحة الشرف', roles: ['admin', 'teacher', 'student'] },
  { path: '/certificates', icon: <Award size={19} />, label: 'الشهادات والتكريمات', roles: ['admin', 'teacher'] },
  { path: '/chat', icon: <MessageSquare size={19} />, label: 'الشات الداخلي', roles: ['admin', 'teacher'] },
  { path: '/notifications', icon: <Bell size={19} />, label: 'التنبيهات', roles: ['admin', 'teacher'] },
  { path: '/audit-logs', icon: <FileText size={19} />, label: 'سجلات التعديلات', roles: ['admin'] },
  { path: '/active-users', icon: <Activity size={19} />, label: 'المستخدمون النشطون', roles: ['admin'] },
  { path: '/admin', icon: <Shield size={19} />, label: 'إدارة النظام', roles: ['admin'] },
  { path: '/settings', icon: <Settings size={19} />, label: 'الإعدادات', roles: ['admin', 'teacher'] },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const { userRole } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(item =>
    item.roles.includes(userRole || 'student')
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 39,
          }}
          className="sidebar-overlay"
        />
      )}

      <aside
        style={{
          width: isOpen ? '260px' : '72px',
          minHeight: '100vh',
          background: '#0f2244',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
      >
        {/* Logo Area */}
        <div style={{
          padding: isOpen ? '20px 16px 16px' : '16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '80px',
          transition: 'padding 0.3s',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'white',
            padding: '2px',
          }}>
            <img
              src="/logo.png"
              alt="شعار مدرسة الرواد"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          {isOpen && (
            <div style={{ overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
              <p style={{
                color: 'white',
                fontWeight: '800',
                fontSize: '13px',
                lineHeight: '1.4',
                whiteSpace: 'nowrap',
              }}>
                مدرسة الرواد
              </p>
              <p style={{
                color: '#94a3b8',
                fontSize: '10px',
                lineHeight: '1.4',
                whiteSpace: 'nowrap',
              }}>
                الثانوية الفنية للتمريض
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 8px',
          scrollbarWidth: 'none',
        }}>
          {filteredItems.map((item, idx) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{ textDecoration: 'none', display: 'block', marginBottom: '2px' }}
              >
                <div
                  className={isActive ? 'sidebar-item-active' : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isOpen ? '11px 12px' : '11px',
                    borderRadius: '10px',
                    background: isActive
                      ? 'linear-gradient(135deg, #2555a0 0%, #1a4480 100%)'
                      : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    whiteSpace: 'nowrap',
                    animation: `slideInRight 0.3s ease ${idx * 0.03}s both`,
                    justifyContent: isOpen ? 'flex-start' : 'center',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLDivElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      (e.currentTarget as HTMLDivElement).style.color = '#94a3b8';
                    }
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }}>
                    {item.icon}
                  </span>

                  {isOpen && (
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '500',
                      letterSpacing: '0.01em',
                    }}>
                      {item.label}
                    </span>
                  )}

                  {isOpen && item.badge && (
                    <span style={{
                      marginRight: 'auto',
                      background: '#f39c12',
                      color: '#1a202c',
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '20px',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(37,85,160,0.4) 0%, rgba(192,57,43,0.2) 100%)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                إجمالي الطلاب
              </p>
              <p style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: '900',
                lineHeight: '1',
              }}>
                478
              </p>
              <p style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                في 14 فصل دراسي
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
