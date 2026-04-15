// src/components/Navbar.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Menu,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { getUnreadCount as getNotificationUnreadCount, getUserNotifications } from '../services/notificationService';
import { getUnreadCount as getChatUnreadCount } from '../services/chatService';

interface NavbarProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  teacher: 'مدرس',
  student: 'طالب',
};

const Navbar = ({ onMenuToggle }: NavbarProps) => {
  const { userProfile, studentProfile, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  // Get user info
  const user = studentProfile || userProfile;
  const userId = user?.id || '';
  const userName = userProfile?.displayName || studentProfile?.name || 'مستخدم';
  const role = userRole || 'student';

  useEffect(() => {
    loadCounts();
    loadRecentNotifications();

    // Refresh counts every 30 seconds
    const interval = setInterval(() => {
      loadCounts();
      loadRecentNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, role]);

  const loadCounts = () => {
    if (!userId || !role) return;
    
    const notifCount = getNotificationUnreadCount(userId, role);
    const msgCount = getChatUnreadCount(userId);
    
    setNotificationCount(notifCount);
    setChatCount(msgCount);
  };

  const loadRecentNotifications = () => {
    if (!userId || !role) return;
    
    const notifications = getUserNotifications(userId, role);
    setRecentNotifications(notifications.slice(0, 5));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    if (hours > 0) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    if (minutes > 0) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    return 'الآن';
  };

  return (
    <header
      style={{
        background: 'white',
        boxShadow: '0 1px 0 #e2e8f0, 0 2px 8px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '64px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '0 20px',
        gap: '16px',
      }}>
        {/* Right: Hamburger + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onMenuToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f0f4f8';
              e.currentTarget.style.color = '#1a3a6b';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px 14px',
            minWidth: '220px',
          }}>
            <Search size={16} color="#94a3b8" />
            <input
              placeholder="بحث عن طالب، فصل، مادة..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'Cairo, sans-serif',
                fontSize: '14px',
                color: '#475569',
                width: '100%',
                direction: 'rtl',
              }}
            />
          </div>
        </div>

        {/* Left: Actions + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Chat - ظاهر للكل */}
          <button
            onClick={() => navigate('/chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              position: 'relative',
            }}
          >
            <MessageSquare size={19} />
            {chatCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '16px',
                height: '16px',
                background: '#10b981',
                borderRadius: '50%',
                fontSize: '10px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                border: '2px solid white',
              }}>
                {chatCount > 9 ? '9+' : chatCount}
              </span>
            )}
          </button>

          {/* Notifications - مخفي للطلاب */}
          {role !== 'student' && <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                cursor: 'pointer',
                color: '#475569',
                position: 'relative',
              }}
            >
              <Bell size={19} />
              {notificationCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '16px',
                  height: '16px',
                  background: '#e74c3c',
                  borderRadius: '50%',
                  fontSize: '10px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  border: '2px solid white',
                }}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute',
                left: '0',
                top: '50px',
                width: '320px',
                background: 'white',
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid #f0f4f8',
                overflow: 'hidden',
                zIndex: 100,
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f4f8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a202c' }}>التنبيهات</span>
                  {notificationCount > 0 && (
                    <span style={{
                      background: '#e74c3c',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}>{notificationCount} جديد</span>
                  )}
                </div>
                {recentNotifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد تنبيهات
                  </div>
                ) : (
                  recentNotifications.map(n => (
                    <div key={n.id} style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid #f8fafc',
                      background: !n.read ? '#fef9f0' : 'white',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}>
                      <p style={{ fontSize: '13px', color: '#334155', marginBottom: '4px', lineHeight: '1.5' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatTimestamp(n.createdAt)}
                      </span>
                    </div>
                  ))
                )}
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => navigate('/notifications')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2555a0',
                      fontFamily: 'Cairo',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    عرض جميع التنبيهات
                  </button>
                </div>
              </div>
            )}
          </div>}

          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px 6px 8px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0,
              }}>
                {userName.charAt(0)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a202c', lineHeight: '1.3' }}>
                  {userName}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.3' }}>
                  {roleLabels[role]}
                </p>
              </div>
              <ChevronDown size={14} color="#94a3b8" style={{
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }} />
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                left: '0',
                top: '54px',
                width: '200px',
                background: 'white',
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid #f0f4f8',
                overflow: 'hidden',
                zIndex: 100,
                animation: 'fadeIn 0.2s ease',
              }}>
                {role !== 'student' && (
                  <button
                    onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                    style={dropdownItemStyle}
                  >
                    <User size={15} /> الملف الشخصي
                  </button>
                )}
                {role !== 'student' && (
                  <button
                    onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                    style={dropdownItemStyle}
                  >
                    <Settings size={15} /> الإعدادات
                  </button>
                )}
                <div style={{ height: '1px', background: '#f0f4f8', margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{ ...dropdownItemStyle, color: '#e74c3c' }}
                >
                  <LogOut size={15} /> تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '11px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif',
  fontSize: '13px',
  color: '#334155',
  fontWeight: '500',
  transition: 'background 0.15s',
  textAlign: 'right',
  direction: 'rtl',
};

export default Navbar;
