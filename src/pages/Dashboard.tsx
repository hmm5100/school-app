// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { classesData, studentCountByClass, totalStudents, totalClasses } from '../data/students';
import {
  Users,
  School,
  ClipboardList,
  TrendingUp,
  Award,
  BookOpen,
  ArrowLeft,
  UserCog,
  Bell,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [selectedGender, setSelectedGender] = useState<'all' | 'بنين' | 'فتيات'>('all');

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء النور';
  };

  const stats = [
    {
      label: 'إجمالي الطلاب',
      value: totalStudents,
      icon: <Users size={22} />,
      color: '#2555a0',
      bg: '#eff6ff',
      change: '+3 هذا الأسبوع',
      positive: true,
      path: '/students',
    },
    {
      label: 'الفصول الدراسية',
      value: totalClasses,
      icon: <School size={22} />,
      color: '#059669',
      bg: '#ecfdf5',
      change: '8 بنين + 6 فتيات',
      positive: true,
      path: '/classes',
    },
    {
      label: 'الامتحانات النشطة',
      value: 3,
      icon: <ClipboardList size={22} />,
      color: '#d97706',
      bg: '#fffbeb',
      change: 'ينتهي آخرها غداً',
      positive: false,
      path: '/exams',
    },
    {
      label: 'المواد الدراسية',
      value: 12,
      icon: <BookOpen size={22} />,
      color: '#7c3aed',
      bg: '#faf5ff',
      change: 'الفصل الدراسي الأول',
      positive: true,
      path: '/subjects',
    },
  ];

  const recentActivity = [
    { icon: <CheckCircle size={14} />, text: 'تم رفع درجات امتحان التمريض الأساسي', time: 'منذ 10 دقائق', color: '#059669' },
    { icon: <Users size={14} />, text: 'تم تسجيل 3 طلاب جدد في فصل 1/6 فتيات', time: 'منذ ساعة', color: '#2555a0' },
    { icon: <ClipboardList size={14} />, text: 'امتحان علم التشريح تم نشره للطلاب', time: 'منذ 2 ساعة', color: '#d97706' },
    { icon: <Award size={14} />, text: 'تم إنشاء شهادات تكريم لأوائل الفصل الأول', time: 'منذ 3 ساعات', color: '#7c3aed' },
    { icon: <AlertTriangle size={14} />, text: 'امتحان الأحياء بحاجة لمراجعة الأسئلة', time: 'منذ 5 ساعات', color: '#dc2626' },
  ];

  const upcomingExams = [
    { subject: 'علم التشريح', class: '1/1 بنين', date: 'غداً 10:00 ص', students: 35, status: 'active' },
    { subject: 'التمريض الأساسي', class: '1/2 فتيات', date: 'بعد غد 9:00 ص', students: 35, status: 'pending' },
    { subject: 'علم وظائف الأعضاء', class: '1/3 بنين', date: 'الأحد 11:00 ص', students: 36, status: 'draft' },
  ];

  const filteredClasses = classesData.filter(c =>
    selectedGender === 'all' || c.gender === selectedGender
  );

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: '900',
            color: '#0f2244',
            marginBottom: '6px',
          }}>
            {greeting()}، {userProfile?.displayName?.split(' ')[0] || 'مدير النظام'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            مرحباً بك في نظام مدرسة الرواد الثانوية الفنية للتمريض
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/notifications')}
            style={quickBtnStyle('#fef9f0', '#d97706')}
          >
            <Bell size={16} /> التنبيهات
          </button>
          <button
            onClick={() => navigate('/active-users')}
            style={quickBtnStyle('#f0fdf4', '#059669')}
          >
            <Activity size={16} /> المستخدمون النشطون
            <span style={{
              background: '#059669',
              color: 'white',
              borderRadius: '20px',
              padding: '1px 7px',
              fontSize: '11px',
              fontWeight: '700',
            }}>5</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            className="stat-card"
            onClick={() => navigate(stat.path)}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #f0f4f8',
              animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}>
                {stat.icon}
              </div>
              <ArrowLeft size={16} color="#cbd5e1" style={{ transform: 'rotate(180deg)' }} />
            </div>

            <p style={{ fontSize: '32px', fontWeight: '900', color: '#0f2244', lineHeight: '1', marginBottom: '6px' }}>
              {stat.value.toLocaleString('ar-EG')}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>
              {stat.label}
            </p>
            <p style={{
              fontSize: '11px',
              color: stat.positive ? '#059669' : '#d97706',
              fontWeight: '600',
              background: stat.positive ? '#f0fdf4' : '#fffbeb',
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '20px',
            }}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '20px',
        marginBottom: '20px',
      }}>
        {/* Classes Overview */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f0f4f8',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2244' }}>
              الفصول الدراسية
            </h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'بنين', 'فتيات'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(g)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: '1.5px solid',
                    borderColor: selectedGender === g ? '#2555a0' : '#e2e8f0',
                    background: selectedGender === g ? '#2555a0' : 'transparent',
                    color: selectedGender === g ? 'white' : '#64748b',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {g === 'all' ? 'الكل' : g}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '10px',
          }}>
            {filteredClasses.map((cls, i) => {
              const count = studentCountByClass[cls.name] || 0;
              const isBoys = cls.gender === 'بنين';
              return (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/classes/${cls.id}`)}
                  style={{
                    background: isBoys ? '#eff6ff' : '#fdf2f8',
                    border: `1.5px solid ${isBoys ? '#bfdbfe' : '#fbcfe8'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      background: isBoys ? '#2555a0' : '#9333ea',
                      color: 'white',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: '700',
                    }}>
                      {cls.gender}
                    </span>
                  </div>
                  <p style={{ fontSize: '17px', fontWeight: '800', color: '#0f2244', marginBottom: '4px' }}>
                    {cls.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    <span style={{ fontWeight: '700', color: isBoys ? '#2555a0' : '#9333ea' }}>{count}</span> طالب
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Upcoming exams */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f0f4f8',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244' }}>الامتحانات القادمة</h2>
              <button onClick={() => navigate('/exams')} style={linkBtnStyle}>عرض الكل</button>
            </div>

            {upcomingExams.map((exam, i) => {
              const statusInfo = {
                active: { label: 'نشط', color: '#059669', bg: '#f0fdf4' },
                pending: { label: 'قادم', color: '#d97706', bg: '#fffbeb' },
                draft: { label: 'مسودة', color: '#64748b', bg: '#f8fafc' },
              }[exam.status];

              return (
                <div key={i} style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  marginBottom: '8px',
                  border: '1px solid #f0f4f8',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a202c' }}>{exam.subject}</p>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: statusInfo?.color,
                      background: statusInfo?.bg,
                      padding: '2px 8px',
                      borderRadius: '20px',
                    }}>
                      {statusInfo?.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      <School size={11} style={{ display: 'inline', marginLeft: '3px' }} />
                      {exam.class}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      <Clock size={11} style={{ display: 'inline', marginLeft: '3px' }} />
                      {exam.date}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      <Users size={11} style={{ display: 'inline', marginLeft: '3px' }} />
                      {exam.students}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f0f4f8',
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244', marginBottom: '14px' }}>
              إجراءات سريعة
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'إضافة طالب', icon: <Users size={16} />, path: '/students/new', color: '#2555a0', bg: '#eff6ff' },
                { label: 'امتحان جديد', icon: <ClipboardList size={16} />, path: '/exams/new', color: '#059669', bg: '#ecfdf5' },
                { label: 'رفع درجات', icon: <TrendingUp size={16} />, path: '/grades', color: '#d97706', bg: '#fffbeb' },
                { label: 'إضافة مدرس', icon: <UserCog size={16} />, path: '/teachers/new', color: '#7c3aed', bg: '#faf5ff' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 12px',
                    background: action.bg,
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: action.color,
                    fontFamily: 'Cairo, sans-serif',
                    fontSize: '12px',
                    fontWeight: '700',
                    transition: 'all 0.2s',
                    textAlign: 'right',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.filter = 'none'}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f4f8',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2244' }}>
            آخر الأنشطة
          </h2>
          <button onClick={() => navigate('/audit-logs')} style={linkBtnStyle}>
            عرض سجل كامل
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentActivity.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #f0f4f8',
              animation: `fadeIn 0.3s ease ${i * 0.07}s both`,
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <p style={{ flex: 1, fontSize: '13px', color: '#334155', fontWeight: '500', lineHeight: '1.5' }}>
                {item.text}
              </p>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const quickBtnStyle = (bg: string, color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: bg,
  border: 'none',
  borderRadius: '10px',
  color,
  fontFamily: 'Cairo, sans-serif',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer',
});

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2555a0',
  fontFamily: 'Cairo, sans-serif',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer',
  padding: '4px 8px',
};

export default Dashboard;
