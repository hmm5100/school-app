// src/pages/Teachers.tsx
// إدارة المدرسين — عرض القائمة + إحصائيات لكل مدرس

import { useState, useEffect, useMemo } from 'react';
import {
  Users, BookOpen, ClipboardList, TrendingUp,
  Search, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Calendar, Award, RefreshCw,
} from 'lucide-react';
import {
  collection, getDocs, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, Exam } from '../types';

// ─── Types ────────────────────────────────────
interface TeacherStats {
  totalExams: number;
  activeExams: number;
  finishedExams: number;
  totalStudentsTested: number;        // عدد الطلاب اللي امتحنوا معاه
  uniqueClasses: string[];            // الفصول اللي امتحنها
  uniqueSubjects: string[];           // المواد اللي امتحن فيها
  examsThisMonth: number;             // امتحانات الشهر الحالي
  avgScore: number;                   // متوسط درجات طلابه
}

interface TeacherRow {
  profile: User;
  stats: TeacherStats;
}

// ─── Helpers ──────────────────────────────────
function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function calcStats(exams: Exam[], allAnswers: { examId: string; score?: number; studentId: string }[]): TeacherStats {
  const { start, end } = thisMonthRange();

  const totalExams    = exams.length;
  const activeExams   = exams.filter(e => e.status === 'active').length;
  const finishedExams = exams.filter(e => e.status === 'finished').length;

  const examIds = new Set(exams.map(e => e.id));
  const myAnswers = allAnswers.filter(a => examIds.has(a.examId));

  const uniqueStudents = new Set(myAnswers.map(a => a.studentId));
  const scores = myAnswers.map(a => a.score ?? 0).filter(s => s > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;

  const uniqueClasses  = [...new Set(exams.flatMap(e => e.classIds))];
  const uniqueSubjects = [...new Set(exams.map(e => e.subjectName).filter(Boolean))];

  const examsThisMonth = exams.filter(e => {
    const d = e.createdAt;
    return d >= start && d <= end;
  }).length;

  return {
    totalExams,
    activeExams,
    finishedExams,
    totalStudentsTested: uniqueStudents.size,
    uniqueClasses,
    uniqueSubjects,
    examsThisMonth,
    avgScore,
  };
}

// ─── Sub-components ───────────────────────────
function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 10, background: color, minWidth: 70 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TeacherCard({ row, expanded, onToggle }: {
  row: TeacherRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { profile, stats } = row;
  const initials = profile.displayName?.slice(0, 2) || '؟';

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Header row ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', cursor: 'pointer',
          background: expanded ? '#f9fafb' : '#fff',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: profile.isActive ? '#4f46e5' : '#9ca3af',
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>
              {profile.displayName}
            </span>
            {profile.isActive
              ? <CheckCircle size={14} color="#10b981" />
              : <XCircle size={14} color="#ef4444" />
            }
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, direction: 'ltr', textAlign: 'right' }}>
            {profile.email}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatBadge label="امتحان" value={stats.totalExams}         color="#eef2ff" />
          <StatBadge label="طالب"  value={stats.totalStudentsTested} color="#f0fdf4" />
          <StatBadge label="فصل"   value={stats.uniqueClasses.length} color="#fffbeb" />
        </div>

        {/* Toggle icon */}
        <div style={{ color: '#9ca3af', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            marginTop: 16,
            marginBottom: 16,
          }}>
            {[
              { icon: <ClipboardList size={15} color="#4f46e5" />, label: 'إجمالي الامتحانات', value: stats.totalExams,            bg: '#eef2ff' },
              { icon: <TrendingUp   size={15} color="#059669" />, label: 'امتحانات نشطة',      value: stats.activeExams,           bg: '#f0fdf4' },
              { icon: <Award        size={15} color="#d97706" />, label: 'امتحانات منتهية',    value: stats.finishedExams,         bg: '#fffbeb' },
              { icon: <Users        size={15} color="#7c3aed" />, label: 'طلاب ممتحنون',       value: stats.totalStudentsTested,   bg: '#f5f3ff' },
              { icon: <Calendar     size={15} color="#0891b2" />, label: 'هذا الشهر',           value: stats.examsThisMonth,        bg: '#ecfeff' },
              { icon: <TrendingUp   size={15} color="#16a34a" />, label: 'متوسط الدرجات',      value: stats.avgScore ? `${stats.avgScore}` : '—', bg: '#f0fdf4' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: item.bg, borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* المواد والفصول */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* المواد */}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <BookOpen size={14} color="#4f46e5" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>المواد</span>
              </div>
              {stats.uniqueSubjects.length === 0
                ? <span style={{ fontSize: 12, color: '#9ca3af' }}>لا توجد مواد</span>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {stats.uniqueSubjects.map(s => (
                      <span key={s} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99,
                        background: '#e0e7ff', color: '#3730a3', fontWeight: 500,
                      }}>{s}</span>
                    ))}
                  </div>
              }
            </div>

            {/* الفصول */}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Users size={14} color="#059669" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>الفصول المُمتحَنة</span>
              </div>
              {stats.uniqueClasses.length === 0
                ? <span style={{ fontSize: 12, color: '#9ca3af' }}>لا توجد فصول</span>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {stats.uniqueClasses.map(c => (
                      <span key={c} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99,
                        background: '#d1fae5', color: '#065f46', fontWeight: 500,
                      }}>{c}</span>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* صلاحيات سريعة */}
          {profile.permissions && (
            <div style={{ marginTop: 12, background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>الصلاحيات</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.entries(profile.permissions) as [string, boolean][])
                  .filter(([, v]) => v)
                  .map(([k]) => {
                    const labels: Record<string, string> = {
                      canCreateExams:     'إنشاء امتحانات',
                      canEditOwnExam:     'تعديل امتحاناته',
                      canDeleteExam:      'حذف امتحانات',
                      canViewResults:     'عرض النتائج',
                      canDownloadExcel:   'تحميل Excel',
                      canEditGrades:      'تعديل الدرجات',
                      canCreateQuestions: 'بنك الأسئلة',
                      canUploadWord:      'رفع Word',
                      canLockExams:       'قفل/فتح امتحان',
                      canReopenStudent:   'إعادة فتح طالب',
                      canViewAllStudents: 'كل الفصول',
                      canViewStudentId:   'الرقم القومي',
                      canManageStudents:  'إدارة الطلاب',
                    };
                    return (
                      <span key={k} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99,
                        background: '#fef3c7', color: '#92400e', fontWeight: 500,
                      }}>
                        {labels[k] || k}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────
export default function Teachers() {
  const [rows, setRows]           = useState<TeacherRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy]       = useState<'name' | 'exams' | 'students'>('exams');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) جلب المدرسين من users collection
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'teacher'))
      );
      const teachers: User[] = usersSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          id:          d.id,
          uid:         (data.uid as string) || d.id,
          email:       (data.email as string) || '',
          displayName: (data.displayName as string) || 'مدرس',
          role:        'teacher',
          isActive:    (data.isActive as boolean) ?? true,
          createdAt:   data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          permissions: data.permissions as User['permissions'],
        };
      });

      // 2) جلب كل الامتحانات مرة واحدة
      const examsSnap = await getDocs(collection(db, 'exams'));
      const allExams: Exam[] = examsSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          id:          d.id,
          title:       (data.title as string) || '',
          subjectId:   (data.subjectId as string) || '',
          subjectName: (data.subjectName as string) || '',
          classIds:    (data.classIds as string[]) || [],
          teacherId:   (data.teacherId as string) || '',
          teacherName: (data.teacherName as string) || '',
          duration:    (data.duration as number) || 60,
          totalScore:  (data.totalScore as number) || 0,
          isLocked:    (data.isLocked as boolean) || false,
          isPublished: (data.isPublished as boolean) || false,
          model:       (data.model as 'A' | 'B' | 'C' | 'D') || 'A',
          status:      (data.status as 'draft' | 'active' | 'finished') || 'draft',
          questions:   [],
          createdAt:   data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });

      // 3) جلب الإجابات (score + studentId + examId بس — خفيف)
      const answersSnap = await getDocs(
        query(collection(db, 'studentAnswers'), where('isSubmitted', '==', true))
      );
      const allAnswers = answersSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          examId:    (data.examId as string) || '',
          studentId: (data.studentId as string) || '',
          score:     data.score as number | undefined,
        };
      });

      // 4) حساب إحصائيات كل مدرس
      const result: TeacherRow[] = teachers.map(t => {
        const teacherExams = allExams.filter(e => e.teacherId === t.id || e.teacherId === t.uid);
        return {
          profile: t,
          stats:   calcStats(teacherExams, allAnswers),
        };
      });

      setRows(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Teachers page error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── فلترة + ترتيب ──
  const filtered = useMemo(() => {
    let r = [...rows];

    // بحث
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(row =>
        row.profile.displayName.toLowerCase().includes(q) ||
        row.profile.email.toLowerCase().includes(q) ||
        row.stats.uniqueSubjects.some(s => s.toLowerCase().includes(q))
      );
    }

    // فلتر الحالة
    if (filterActive === 'active')   r = r.filter(row => row.profile.isActive);
    if (filterActive === 'inactive') r = r.filter(row => !row.profile.isActive);

    // ترتيب
    r.sort((a, b) => {
      if (sortBy === 'name')     return a.profile.displayName.localeCompare(b.profile.displayName, 'ar');
      if (sortBy === 'exams')    return b.stats.totalExams - a.stats.totalExams;
      if (sortBy === 'students') return b.stats.totalStudentsTested - a.stats.totalStudentsTested;
      return 0;
    });

    return r;
  }, [rows, search, filterActive, sortBy]);

  // ── إحصائيات عامة ──
  const totalTeachers   = rows.length;
  const activeTeachers  = rows.filter(r => r.profile.isActive).length;
  const totalExams      = rows.reduce((s, r) => s + r.stats.totalExams, 0);
  const totalStudents   = rows.reduce((s, r) => s + r.stats.totalStudentsTested, 0);
  const thisMonthExams  = rows.reduce((s, r) => s + r.stats.examsThisMonth, 0);

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: 20,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <RefreshCw size={28} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>جاري تحميل بيانات المدرسين...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', direction: 'rtl' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>إدارة المدرسين</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 10, background: '#eef2ff', cursor: 'pointer', fontWeight: 600 }}
        >
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* ── Stats Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <Users size={18} color="#4f46e5" />,        label: 'إجمالي المدرسين',  value: totalTeachers,  bg: '#eef2ff' },
          { icon: <CheckCircle size={18} color="#10b981" />,  label: 'مدرسين نشطين',     value: activeTeachers, bg: '#f0fdf4' },
          { icon: <ClipboardList size={18} color="#d97706" />, label: 'إجمالي الامتحانات', value: totalExams,     bg: '#fffbeb' },
          { icon: <Users size={18} color="#7c3aed" />,        label: 'طلاب ممتحنون',     value: totalStudents,  bg: '#f5f3ff' },
          { icon: <Calendar size={18} color="#0891b2" />,     label: 'امتحانات هذا الشهر', value: thisMonthExams, bg: '#ecfeff' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* بحث */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 12px' }}>
          <Search size={14} color="#9ca3af" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم المدرس أو المادة..."
            style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', flex: 1, background: 'transparent', direction: 'rtl' }}
          />
        </div>

        {/* فلتر الحالة */}
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', outline: 'none', direction: 'rtl' }}
        >
          <option value="all">كل المدرسين</option>
          <option value="active">نشطين فقط</option>
          <option value="inactive">غير نشطين</option>
        </select>

        {/* ترتيب */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'exams' | 'students')}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', outline: 'none', direction: 'rtl' }}
        >
          <option value="exams">ترتيب: الأكثر امتحاناً</option>
          <option value="students">ترتيب: الأكثر طلاباً</option>
          <option value="name">ترتيب: أبجدي</option>
        </select>
      </div>

      {/* ── نتيجة الفلتر ── */}
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
        عرض {filtered.length} من {rows.length} مدرس
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: 48 }}>
          <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>لا يوجد مدرسون مطابقون للبحث.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(row => (
            <TeacherCard
              key={row.profile.id}
              row={row}
              expanded={expandedId === row.profile.id}
              onToggle={() => setExpandedId(expandedId === row.profile.id ? null : row.profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
