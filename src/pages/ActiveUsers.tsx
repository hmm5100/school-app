// src/pages/ActiveUsers.tsx
import { useState, useEffect } from 'react';
import {
  Users, Clock, Activity, Eye, User, BookOpen, Award,
  Filter, Search, RefreshCw, TrendingUp, Circle,
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ────────────────────────────────────
type UserStatus = 'online' | 'offline' | 'in_exam' | 'reviewing';
type UserRole = 'admin' | 'teacher' | 'student';

interface ActiveUser {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastSeen: Date;
  currentActivity?: string;
  subject?: string;
  className?: string;
  examName?: string;
  loginTime?: Date;
  sessionDuration?: number; // بالدقائق
}

const ActiveUsers = () => {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadActiveUsers = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const activeThreshold = new Date(now.getTime() - 30 * 60 * 1000); // آخر 30 دقيقة

      const usersData: ActiveUser[] = [];

      // 1. جلب المدرسين النشطين
      const teachersSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'teacher'))
      );

      for (const doc of teachersSnap.docs) {
        const data = doc.data();
        const lastSeen = data.lastSeen instanceof Timestamp ? data.lastSeen.toDate() : new Date();
        const isActive = lastSeen >= activeThreshold;

        if (isActive || data.isOnline) {
          usersData.push({
            id: doc.id,
            name: data.displayName || 'مدرس غير معروف',
            role: 'teacher',
            status: data.isOnline ? 'online' : 'offline',
            lastSeen,
            currentActivity: data.currentActivity || undefined,
            subject: data.subject || undefined,
            loginTime: data.loginTime instanceof Timestamp ? data.loginTime.toDate() : undefined,
            sessionDuration: data.loginTime
              ? Math.floor((now.getTime() - (data.loginTime instanceof Timestamp ? data.loginTime.toDate() : new Date()).getTime()) / 60000)
              : undefined,
          });
        }
      }

      // 2. جلب الطلاب النشطين (داخل امتحان أو نشطين)
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentsMap = new Map(
        studentsSnap.docs.map(doc => [doc.id, doc.data()])
      );

      // جلب الامتحانات النشطة
      const examsSnap = await getDocs(collection(db, 'exams'));
      const activeExams = examsSnap.docs.filter(doc => {
        const data = doc.data();
        const start = data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate);
        const end = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
        return start <= now && now <= end;
      });

      // جلب الطلاب داخل امتحان
      for (const examDoc of activeExams) {
        const examData = examDoc.data();
        const answersSnap = await getDocs(
          query(
            collection(db, 'studentAnswers'),
            where('examId', '==', examDoc.id),
            where('isSubmitted', '==', false)
          )
        );

        answersSnap.docs.forEach(answerDoc => {
          const answerData = answerDoc.data();
          const student = studentsMap.get(answerData.studentId);
          if (student) {
            const startedAt = answerData.startedAt instanceof Timestamp ? answerData.startedAt.toDate() : new Date();
            usersData.push({
              id: answerData.studentId,
              name: answerData.studentName || student.name || 'طالب غير معروف',
              role: 'student',
              status: 'in_exam',
              lastSeen: now,
              currentActivity: `يؤدي امتحان ${examData.title}`,
              examName: examData.title,
              className: student.className || 'غير محدد',
              loginTime: startedAt,
              sessionDuration: Math.floor((now.getTime() - startedAt.getTime()) / 60000),
            });
          }
        });
      }

      // جلب الطلاب الذين يراجعون النتائج (من notifications مثلاً)
      // هنا يمكن تحسينه بناءً على tracking أفضل

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error('خطأ في تحميل المستخدمين النشطين:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveUsers();
    // تحديث كل دقيقة
    const interval = setInterval(loadActiveUsers, 60000);
    return () => clearInterval(interval);
  }, []);

  // ═══ Filter Logic ═══
  useEffect(() => {
    let result = [...users];

    // بحث
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(q) ||
        user.currentActivity?.toLowerCase().includes(q) ||
        user.className?.toLowerCase().includes(q)
      );
    }

    // فلتر بالدور
    if (filterRole !== 'all') {
      result = result.filter(user => user.role === filterRole);
    }

    // فلتر بالحالة
    if (filterStatus !== 'all') {
      result = result.filter(user => user.status === filterStatus);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, filterRole, filterStatus]);

  // ═══ Status Badge ═══
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return { label: 'متصل', color: '#059669', bg: '#ecfdf5', icon: <Circle size={8} fill="#059669" /> };
      case 'offline':
        return { label: 'غير متصل', color: '#94a3b8', bg: '#f8fafc', icon: <Circle size={8} fill="#94a3b8" /> };
      case 'in_exam':
        return { label: 'داخل امتحان', color: '#d97706', bg: '#fffbeb', icon: <Activity size={12} /> };
      case 'reviewing':
        return { label: 'يراجع النتائج', color: '#2555a0', bg: '#eff6ff', icon: <Eye size={12} /> };
      default:
        return { label: 'غير معروف', color: '#64748b', bg: '#f8fafc', icon: <Circle size={8} fill="#64748b" /> };
    }
  };

  // ═══ Role Label ═══
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'مسؤول';
      case 'teacher': return 'مدرس';
      case 'student': return 'طالب';
      default: return 'غير محدد';
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
    return `منذ ${days} يوم`;
  };

  // ═══ Stats ═══
  const stats = {
    total: users.length,
    online: users.filter(u => u.status === 'online').length,
    inExam: users.filter(u => u.status === 'in_exam').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
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
          <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل المستخدمين النشطين...</p>
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
            <Activity size={28} />
            المستخدمون النشطون
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            المستخدمون المتصلون حالياً أو النشطون في آخر 30 دقيقة
          </p>
        </div>

        <button
          onClick={loadActiveUsers}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: loading ? '#94a3b8' : '#2555a0',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Users size={18} color="#2555a0" />
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>إجمالي النشطين</p>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '900', color: '#0f2244' }}>{stats.total}</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Circle size={18} fill="#059669" color="#059669" />
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>متصلون الآن</p>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '900', color: '#059669' }}>{stats.online}</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Activity size={18} color="#d97706" />
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>داخل امتحان</p>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '900', color: '#d97706' }}>{stats.inExam}</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <BookOpen size={18} color="#7c3aed" />
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>مدرسين / طلاب</p>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '900', color: '#7c3aed' }}>
            {stats.teachers} / {stats.students}
          </p>
        </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
                placeholder="بحث بالاسم أو النشاط..."
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

          {/* فلتر بالدور */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              نوع المستخدم
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

          {/* فلتر بالحالة */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              الحالة
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="online">متصل</option>
              <option value="in_exam">داخل امتحان</option>
              <option value="reviewing">يراجع</option>
              <option value="offline">غير متصل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 24px',
          textAlign: 'center',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Users size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2244', marginBottom: '8px' }}>
            لا يوجد مستخدمون نشطون
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {users.length === 0 ? 'لا يوجد أي مستخدم متصل حالياً' : 'لا توجد نتائج مطابقة للفلاتر المحددة'}
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
            {filteredUsers.map(user => {
              const statusBadge = getStatusBadge(user.status);
              return (
                <div
                  key={user.id}
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
                  {/* Avatar */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2555a0 0%, #1a4480 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '900',
                    flexShrink: 0,
                  }}>
                    {user.name.charAt(0)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244', marginBottom: '4px' }}>
                          {user.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#f1f5f9',
                            color: '#64748b',
                          }}>
                            {getRoleLabel(user.role)}
                          </span>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                          {user.className && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {user.className}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <p style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          {getTimeAgo(user.lastSeen)}
                        </p>
                        {user.sessionDuration && (
                          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            الجلسة: {user.sessionDuration} دقيقة
                          </p>
                        )}
                      </div>
                    </div>

                    {user.currentActivity && (
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                        {user.currentActivity}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsers;
