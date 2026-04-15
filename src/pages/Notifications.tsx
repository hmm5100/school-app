// src/pages/Notifications.tsx
// صفحة الإشعارات - مرتبطة بالأحداث الحقيقية من Firebase

import { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Trash2, RefreshCw, 
  Filter, Search, BookOpen, Users, 
  FileText, Award, AlertCircle, Clock,
  Eye, ExternalLink
} from 'lucide-react';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '../services/notificationService';

// Helper: Get icon for notification type
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'exam': return <BookOpen size={20} />;
    case 'grade': return <Award size={20} />;
    case 'material': return <FileText size={20} />;
    case 'success': return <CheckCircle size={20} />;
    case 'warning': return <AlertCircle size={20} />;
    case 'error': return <AlertCircle size={20} />;
    default: return <Bell size={20} />;
  }
};

// Helper: Get color for notification type
const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'exam': return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
    case 'grade': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    case 'material': return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
    case 'success': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    case 'warning': return { bg: '#fed7aa', text: '#9a3412', border: '#fdba74' };
    case 'error': return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    default: return { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
  }
};

// Helper: Get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return new Date(date).toLocaleDateString('ar-EG');
}

// ─── Notification Card Component ───────────────────────
const NotificationCard = ({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const colors = getNotificationColor(notification.type);

  return (
    <div style={{
      background: notification.read ? 'white' : '#fafbfd',
      borderRadius: '16px',
      padding: '16px',
      border: `1px solid ${notification.read ? '#e2e8f0' : '#c7d2fe'}`,
      boxShadow: notification.read ? '0 1px 3px rgba(0,0,0,0.05)' : '0 2px 8px rgba(99,102,241,0.1)',
      position: 'relative',
      transition: 'all 0.2s',
    }}>
      {/* Unread indicator */}
      {!notification.read && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#6366f1',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          background: colors.bg,
          color: colors.text,
          borderRadius: '12px',
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: '800', 
            color: '#0f2244', 
            margin: '0 0 4px',
          }}>
            {notification.title}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#64748b', 
            margin: 0,
            lineHeight: 1.5,
          }}>
            {notification.message}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f0f4f8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
          <Clock size={14} />
          {getRelativeTime(notification.createdAt)}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {notification.actionUrl && (
            <button
              onClick={() => {
                onMarkRead(notification.id);
                window.location.href = notification.actionUrl!;
              }}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ExternalLink size={14} />
              فتح
            </button>
          )}
          
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle size={14} />
              قرأت
            </button>
          )}

          <button
            onClick={() => onDelete(notification.id)}
            style={{
              background: '#fef2f2',
              color: '#ef4444',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={14} />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────
const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<Notification['type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Replace with actual user data from context/auth
  const userId = 'admin';
  const userRole = 'admin' as const;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = getUserNotifications(userId, userRole);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    markAllAsRead(userId, userRole);
    loadNotifications();
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    loadNotifications();
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && !n.read) || 
      (filter === 'read' && n.read);
    
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    
    const matchesSearch = 
      searchTerm === '' || 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesType && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', direction: 'rtl' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>جاري تحميل الإشعارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f2244', margin: '0 0 6px' }}>
            الإشعارات
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {unreadCount > 0 ? (
              <span style={{ color: '#ef4444', fontWeight: '700' }}>
                لديك {unreadCount} إشعار غير مقروء
              </span>
            ) : (
              'لا توجد إشعارات جديدة'
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadNotifications}
            style={{
              background: '#eff6ff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontFamily: 'Cairo, sans-serif',
              fontWeight: '700',
              color: '#2555a0',
            }}
          >
            <RefreshCw size={16} />
            تحديث
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontFamily: 'Cairo, sans-serif',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              <CheckCircle size={16} />
              قرأت الكل
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ابحث في الإشعارات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 44px 11px 16px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: 'Cairo, sans-serif',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Read filter */}
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                background: filter === f ? '#6366f1' : '#f1f5f9',
                color: filter === f ? 'white' : '#64748b',
              }}
            >
              {f === 'all' ? 'الكل' : f === 'unread' ? 'غير مقروء' : 'مقروء'}
            </button>
          ))}

          <div style={{ width: '1px', background: '#e2e8f0', margin: '0 8px' }} />

          {/* Type filter */}
          {(['all', 'exam', 'grade', 'material', 'success', 'warning', 'error'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                background: typeFilter === t ? '#9333ea' : '#f1f5f9',
                color: typeFilter === t ? 'white' : '#64748b',
              }}
            >
              {t === 'all' ? 'كل الأنواع' : 
               t === 'exam' ? 'امتحانات' : 
               t === 'grade' ? 'درجات' : 
               t === 'material' ? 'مواد' :
               t === 'success' ? 'نجاح' :
               t === 'warning' ? 'تحذير' : 'خطأ'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
          }}>
            <Bell size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#64748b', margin: 0 }}>
              لا توجد إشعارات
            </p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
              {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 
               searchTerm ? 'لا توجد نتائج للبحث' : 
               'ستظهر الإشعارات هنا عند حدوث أي نشاط'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      {filteredNotifications.length > 0 && (
        <div style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            عرض <span style={{ fontWeight: '800', color: '#0f2244' }}>{filteredNotifications.length}</span> من أصل{' '}
            <span style={{ fontWeight: '800', color: '#0f2244' }}>{notifications.length}</span> إشعار
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
