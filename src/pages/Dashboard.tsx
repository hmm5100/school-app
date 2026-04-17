// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  School,
  ClipboardList,
  TrendingUp,
  Award,
  BookOpen,
  UserCog,
  Bell,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  BarChart2,
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Exam } from '../types';

// ─── Types ───────────────────────────────────────
interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  activeExams: number;
  totalSubjects: number;
  totalTeachers: number;
  pendingRequests: number;
}

interface RecentActivity {
  id: string;
  icon: React.ReactNode;
  text: string;
  time: string;
  color: string;
}

interface UpcomingExam {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  startDate: Date;
  endDate: Date;
  studentCount: number;
  status: 'active' | 'upcoming' | 'draft';
}

const Dashboard = () => {
  const { userProfile, userRole } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClasses: 0,
    activeExams: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    pendingRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [loading, setLoading] = useState(true);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء النور';
  };

  // ═══ Load Real Data from Firestore ═══
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. عدد الطلاب
        const studentsSnap = await getDocs(collection(db, 'students'));
        const totalStudents = studentsSnap.size;

        // 2. عدد الفصول
        const classesSnap = await getDocs(collection(db, 'classes'));
        const totalClasses = classesSnap.size;

        // 3. الامتحانات النشطة
        const now = new Date();
        const examsSnap = await getDocs(collection(db, 'exams'));
        const activeExams = examsSnap.docs.filter(doc => {
          const data = doc.data();
          const start = data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate);
          const end = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
          return start <= now && now <= end;
        }).length;

        // 4. عدد المواد
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        const totalSubjects = subjectsSnap.size;

        // 5. عدد المدرسين
        const teachersSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'teacher'))
        );
        const totalTeachers = teachersSnap.size;

        // 6. طلبات إعادة الامتحان المعلقة
        const retakeSnap = await getDocs(
          query(
            collection(db, 'examRetakeRequests'),
            where('status', '==', 'pending')
          )
        );
        const pendingRequests = retakeSnap.size;

        setStats({
          totalStudents,
          totalClasses,
          activeExams,
          totalSubjects,
          totalTeachers,
          pendingRequests,
        });

        // ═══ Recent Activity ═══
        const notificationsSnap = await getDocs(
          query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        );

        const activities: RecentActivity[] = notificationsSnap.docs.map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          const timeAgo = getTimeAgo(createdAt);

          let icon = <Activity size={14} />;
          let color = '#2555a0';

          if (data.type === 'grade') {
            icon = <CheckCircle size={14} />;
            color = '#059669';
          } else if (data.type === 'exam') {
            icon = <ClipboardList size={14} />;
            color = '#d97706';
          } else if (data.type === 'warning') {
            icon = <AlertTriangle size={14} />;
            color = '#dc2626';
          }

          return {
            id: doc.id,
            icon,
            text: data.message || data.title,
            time: timeAgo,
            color,
          };
        });

        setRecentActivity(activities);

        // ═══ Upcoming Exams ═══
        const upcomingExamsData: UpcomingExam[] = [];
        
        examsSnap.docs.forEach(doc => {
          const data = doc.data();
          const start = data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate);
          const end = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
          
          let status: 'active' | 'upcoming' | 'draft' = 'draft';
          if (start <= now && now <= end) {
            status = 'active';
          } else if (start > now) {
            status = 'upcoming';
          }

          // عرض النشطة والقادمة فقط
          if (status === 'active' || status === 'upcoming') {
            upcomingExamsData.push({
              id: doc.id,
              title: data.title || 'بدون عنوان',
              subjectName: data.subjectName || 'غير محدد',
              className: Array.isArray(data.classNames) ? data.classNames.join(', ') : 'غير محدد',
              startDate: start,
              endDate: end,
              studentCount: Array.isArray(data.classIds) ? data.classIds.length * 30 : 0, // تقريبي
              status,
            });
          }
        });

        // ترتيب: النشطة أولاً ثم القادمة
        upcomingExamsData.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return a.startDate.getTime() - b.startDate.getTime();
        });

        setUpcomingExams(upcomingExamsData.slice(0, 4));
      } catch (err) {
        console.error('خطأ في تحميل بيانات Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ═══ Helper: Time Ago ═══
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

  // ═══ Format Date ═══
  const formatExamDate = (start: Date, end: Date): string => {
    const now = new Date();
    if (start <= now && now <= end) {
      return 'نشط الآن';
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    if (startDay.getTime() === tomorrow.getTime()) {
      return `غداً ${start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return start.toLocaleDateString('ar-EG', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  };

  // ═══ Stats Cards ═══
  const statsCards = [
    {
      label: 'إجمالي الطلاب',
      value: stats.totalStudents,
      icon: <Users size={22} />,
      color: '#2555a0',
      bg: '#eff6ff',
      change: `في ${stats.totalClasses} فصل`,
      positive: true,
      path: '/students',
    },
    {
      label: 'الفصول الدراسية',
      value: stats.totalClasses,
      icon: <School size={22} />,
      color: '#059669',
      bg: '#ecfdf5',
      change: 'متوزعة حسب الجنس',
      positive: true,
      path: '/classes',
    },
    {
      label: 'الامتحانات النشطة',
      value: stats.activeExams,
      icon: <ClipboardList size={22} />,
      color: '#d97706',
      bg: '#fffbeb',
      change: stats.activeExams > 0 ? 'جارية الآن' : 'لا يوجد',
      positive: stats.activeExams > 0,
      path: '/exams',
    },
    {
      label: 'المواد الدراسية',
      value: stats.totalSubjects,
      icon: <BookOpen size={22} />,
      color: '#7c3aed',
      bg: '#faf5ff',
      change: 'الفصل الدراسي الأول',
      positive: true,
      path: '/subjects',
    },
  ];

  // Admin فقط يشوف إحصائيات المدرسين
  if (userRole === 'admin') {
    statsCards.push({
      label: 'المدرسين',
      value: stats.totalTeachers,
      icon: <UserCog size={22} />,
      color: '#dc2626',
      bg: '#fef2f2',
      change: 'نشطون',
      positive: true,
      path: '/teachers',
    });
  }

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
          <p style={{ color: '#64748b', fontSize: '14px' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f2244', marginBottom: '8px' }}>
          {greeting()}، {userProfile?.displayName || 'مستخدم'} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          نظرة سريعة على أداء المدرسة اليوم
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {statsCards.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.path)}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              border: '1px solid #f0f4f8',
              transition: 'all 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}>
                {stat.icon}
              </div>
              <div style={{
                fontSize: '11px',
                color: stat.positive ? '#059669' : '#64748b',
                background: stat.positive ? '#ecfdf5' : '#f8fafc',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: '600',
              }}>
                {stat.change}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#0f2244', lineHeight: '1' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Recent Activity */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244' }}>النشاط الأخير</h3>
            <Activity size={18} color="#64748b" />
          </div>

          {recentActivity.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              لا يوجد نشاط حديث
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activity.color,
                    flexShrink: 0,
                  }}>
                    {activity.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: '#0f2244', fontWeight: '600', marginBottom: '2px' }}>
                      {activity.text}
                    </p>
                    <p style={{ fontSize: '11px', color: '#94a3b8' }}>{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244' }}>الامتحانات القادمة</h3>
            <ClipboardList size={18} color="#64748b" />
          </div>

          {upcomingExams.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              لا يوجد امتحانات قادمة
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingExams.map(exam => (
                <div
                  key={exam.id}
                  onClick={() => navigate(`/exams/${exam.id}`)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: exam.status === 'active' ? '#fffbeb' : '#f8fafc',
                    border: '1px solid',
                    borderColor: exam.status === 'active' ? '#fde68a' : '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = exam.status === 'active' ? '#fef3c7' : '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = exam.status === 'active' ? '#fffbeb' : '#f8fafc';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f2244', marginBottom: '2px' }}>
                        {exam.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>{exam.subjectName}</p>
                    </div>
                    {exam.status === 'active' && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#d97706',
                        background: '#fef3c7',
                        padding: '3px 8px',
                        borderRadius: '20px',
                      }}>
                        نشط
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                      <Clock size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                      {formatExamDate(exam.startDate, exam.endDate)}
                    </p>
                    <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {exam.className}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {stats.pendingRequests > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #fde68a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>
              <Bell size={18} style={{ display: 'inline', marginLeft: '8px' }} />
              طلبات إعادة امتحان معلقة
            </h4>
            <p style={{ fontSize: '13px', color: '#78350f' }}>
              لديك <strong>{stats.pendingRequests}</strong> طلب بحاجة للمراجعة
            </p>
          </div>
          <button
            onClick={() => navigate('/exam-retake-requests')}
            style={{
              background: '#92400e',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Eye size={15} />
            مراجعة الطلبات
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
