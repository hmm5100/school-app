// src/pages/ActivityLog.tsx
import { useState, useEffect } from 'react';
import {
  Activity, Clock, User, Edit, Trash2, Plus, CheckCircle,
  XCircle, AlertTriangle, FileText, Filter, Calendar,
  Search, Download, Eye,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ───────────────────────────────────
interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'other';
  entity: 'exam' | 'student' | 'grade' | 'retake_request' | 'user' | 'other';
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student';
  description: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

const ActivityLog = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        // جلب سجلات التعديلات من Firestore
        const logsSnap = await getDocs(
          query(
            collection(db, 'auditLogs'),
            orderBy('timestamp', 'desc'),
            limit(200) // آخر 200 سجل
          )
        );

        const logsData: AuditLog[] = logsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            action: data.action || 'other',
            entity: data.entity || 'other',
            entityId: data.entityId || '',
            entityName: data.entityName || 'غير محدد',
            userId: data.userId || '',
            userName: data.userName || 'مستخدم غير معروف',
            userRole: data.userRole || 'student',
            description: data.description || 'لا يوجد وصف',
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
            details: data.details,
          };
        });

        setLogs(logsData);
        setFilteredLogs(logsData);
      } catch (err) {
        console.error('خطأ في تحميل سجلات التعديلات:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  // ═══ Filter Logic ═══
  useEffect(() => {
    let result = [...logs];

    // بحث
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.userName.toLowerCase().includes(q) ||
        log.entityName.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)
      );
    }

    // فلتر بالإجراء
    if (filterAction !== 'all') {
      result = result.filter(log => log.action === filterAction);
    }

    // فلتر بالكيان
    if (filterEntity !== 'all') {
      result = result.filter(log => log.entity === filterEntity);
    }

    // فلتر بالدور
    if (filterRole !== 'all') {
      result = result.filter(log => log.userRole === filterRole);
    }

    setFilteredLogs(result);
  }, [logs, searchQuery, filterAction, filterEntity, filterRole]);

  // ═══ Action Icon ═══
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus size={16} color="#059669" />;
      case 'update': return <Edit size={16} color="#2555a0" />;
      case 'delete': return <Trash2 size={16} color="#ef4444" />;
      case 'approve': return <CheckCircle size={16} color="#059669" />;
      case 'reject': return <XCircle size={16} color="#ef4444" />;
      default: return <Activity size={16} color="#64748b" />;
    }
  };

  // ═══ Action Label ═══
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create': return 'إنشاء';
      case 'update': return 'تعديل';
      case 'delete': return 'حذف';
      case 'approve': return 'موافقة';
      case 'reject': return 'رفض';
      default: return 'آخر';
    }
  };

  // ═══ Entity Label ═══
  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'exam': return 'امتحان';
      case 'student': return 'طالب';
      case 'grade': return 'درجة';
      case 'retake_request': return 'طلب إعادة';
      case 'user': return 'مستخدم';
      default: return 'آخر';
    }
  };

  // ═══ Time Ago ═══
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'منذ لحظات';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  // ═══ Download CSV ═══
  const downloadCSV = () => {
    let csv = 'التاريخ,الوقت,المستخدم,الدور,الإجراء,الكيان,الاسم,الوصف\n';

    filteredLogs.forEach(log => {
      const date = log.timestamp.toLocaleDateString('ar-EG');
      const time = log.timestamp.toLocaleTimeString('ar-EG');
      csv += `${date},${time},${log.userName},${log.userRole},${getActionLabel(log.action)},${getEntityLabel(log.entity)},${log.entityName},"${log.description}"\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `سجل_التعديلات_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2555a0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل السجلات...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} />
            سجلات التعديلات
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            سجل كامل لجميع العمليات التي تمت على النظام ({filteredLogs.length} من أصل {logs.length})
          </p>
        </div>

        <button
          onClick={downloadCSV}
          disabled={filteredLogs.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: filteredLogs.length > 0 ? '#059669' : '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: filteredLogs.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <Download size={15} />
          تحميل CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #f0f4f8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* بحث */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              بحث
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الوصف..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontFamily: 'Cairo, sans-serif',
                  color: '#1a202c',
                  background: '#f8fafc',
                }}
              />
            </div>
          </div>

          {/* فلتر بالإجراء */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              الإجراء
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'Cairo, sans-serif',
                color: '#1a202c',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="all">الكل</option>
              <option value="create">إنشاء</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
              <option value="approve">موافقة</option>
              <option value="reject">رفض</option>
            </select>
          </div>

          {/* فلتر بالكيان */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              نوع الكيان
            </label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'Cairo, sans-serif',
                color: '#1a202c',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="all">الكل</option>
              <option value="exam">امتحان</option>
              <option value="student">طالب</option>
              <option value="grade">درجة</option>
              <option value="retake_request">طلب إعادة</option>
              <option value="user">مستخدم</option>
            </select>
          </div>

          {/* فلتر بالدور */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              دور المستخدم
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'Cairo, sans-serif',
                color: '#1a202c',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="all">الكل</option>
              <option value="admin">مسؤول</option>
              <option value="teacher">مدرس</option>
              <option value="student">طالب</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 24px',
          textAlign: 'center',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Activity size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2244', marginBottom: '8px' }}>
            لا توجد سجلات
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {logs.length === 0 ? 'لم يتم تسجيل أي نشاط بعد' : 'لا توجد نتائج مطابقة للفلاتر المحددة'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid #e2e8f0',
                }}>
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f2244', marginBottom: '4px' }}>
                        {log.description}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} />
                          {log.userName} ({log.userRole === 'admin' ? 'مسؤول' : log.userRole === 'teacher' ? 'مدرس' : 'طالب'})
                        </span>
                        <span>•</span>
                        <span>{getActionLabel(log.action)} {getEntityLabel(log.entity)}</span>
                        {log.entityName && (
                          <>
                            <span>•</span>
                            <span>{log.entityName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <p style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {getTimeAgo(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
