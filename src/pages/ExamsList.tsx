// src/pages/ExamsList.tsx
// يجيب الامتحانات الحقيقية من Firebase حسب دور المستخدم

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAllExams,
  getExamsByTeacher,
  getExamsByClass,
} from '../services/examService';
import type { Exam } from '../types';

// ─── Helpers ─────────────────────────────────
function statusInfo(exam: Exam): {
  label: string;
  badgeBg: string;
  badgeColor: string;
  barColor: string;
} {
  if (exam.isLocked)
    return { label: 'منتهي', badgeBg: '#fee2e2', badgeColor: '#991b1b', barColor: '#f87171' };
  if (exam.isPublished)
    return { label: 'نشط', badgeBg: '#d1fae5', badgeColor: '#065f46', barColor: '#34d399' };
  return { label: 'مسودة', badgeBg: '#f3f4f6', badgeColor: '#4b5563', barColor: '#d1d5db' };
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── ExamCard ────────────────────────────────
function ExamCard({
  exam,
  isTeacher,
  onManage,
  onResults,
  onTake,
}: {
  exam: Exam;
  isTeacher: boolean;
  onManage: (id: string) => void;
  onResults: (id: string) => void;
  onTake: (id: string) => void;
}) {
  const { label, badgeBg, badgeColor, barColor } = statusInfo(exam);
  const canTake = exam.isPublished && !exam.isLocked;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '0.5px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* accent bar */}
      <div style={{ height: 4, background: barColor }} />

      <div style={{ padding: 16 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
              }}
            >
              {exam.title}
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{exam.subjectName}</p>
          </div>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 20,
              background: badgeBg,
              color: badgeColor,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {label}
          </span>
        </div>

        {/* Meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { value: exam.questions.length, label: 'سؤال' },
            { value: exam.duration, label: 'دقيقة' },
            { value: exam.totalScore, label: 'درجة' },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                background: '#f9fafb',
                borderRadius: 10,
                padding: 8,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 500, color: '#111827', margin: 0 }}>
                {m.value}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Tags row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            color: '#9ca3af',
            marginBottom: 14,
          }}
        >
          <span>{exam.isLocked ? '🔒 مقفول' : '🔓 مفتوح'}</span>
          <span>{exam.isPublished ? '👁 منشور' : '🚫 مخفي'}</span>
          <span style={{ marginRight: 'auto' }}>📅 {formatDate(exam.createdAt)}</span>
        </div>

        {/* Actions */}
        {isTeacher ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onManage(exam.id)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                border: '0.5px solid #a5b4fc',
                background: 'transparent',
                color: '#4f46e5',
                cursor: 'pointer',
              }}
            >
              ⚙️ إعدادات
            </button>
            <button
              onClick={() => onResults(exam.id)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                fontSize: 13,
                border: '0.5px solid #e5e7eb',
                background: 'transparent',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              📊 النتائج
            </button>
          </div>
        ) : (
          <button
            onClick={() => onTake(exam.id)}
            disabled={!canTake}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: canTake ? 'pointer' : 'not-allowed',
              background: canTake ? '#4f46e5' : '#e5e7eb',
              color: canTake ? '#fff' : '#9ca3af',
            }}
          >
            {exam.isLocked ? 'الامتحان منتهي' : !exam.isPublished ? 'غير متاح بعد' : 'ابدأ الامتحان'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '0.5px solid #e5e7eb',
        overflow: 'hidden',
        padding: 16,
      }}
    >
      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 16 }} />
      {[80, 60, 100, 70].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            width: `${w}%`,
            background: '#f3f4f6',
            borderRadius: 6,
            marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────
type FilterStatus = 'all' | 'active' | 'draft' | 'finished';

export default function ExamsList() {
  const { userRole, userProfile, studentProfile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = userRole === 'admin' || userRole === 'teacher';

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // ─── جلب الامتحانات من Firebase ──────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const fetchExams = async () => {
      try {
        let data: Exam[] = [];

        if (userRole === 'admin') {
          // الأدمن يشوف كل الامتحانات
          data = await getAllExams();
        } else if (userRole === 'teacher' && userProfile?.id) {
          // المدرس يشوف امتحاناته بس
          data = await getExamsByTeacher(userProfile.id);
        } else if (userRole === 'student' && studentProfile?.classId) {
          // الطالب يشوف امتحانات فصله المنشورة
          data = await getExamsByClass(studentProfile.classId);
        } else {
          // fallback: جيب الكل
          data = await getAllExams();
        }

        if (!cancelled) {
          setExams(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('حدث خطأ أثناء تحميل الامتحانات');
          setLoading(false);
        }
      }
    };

    fetchExams();
    return () => { cancelled = true; };
  }, [userRole, userProfile?.id, studentProfile?.classId]);

  // ─── Filtering ────────────────────────────────
  const filtered = exams.filter(e => {
    const s = search.toLowerCase();
    const matchSearch =
      e.title.toLowerCase().includes(s) || e.subjectName.toLowerCase().includes(s);
    const matchFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && e.isPublished && !e.isLocked) ||
      (filterStatus === 'draft' && !e.isPublished && !e.isLocked) ||
      (filterStatus === 'finished' && e.isLocked);
    return matchSearch && matchFilter;
  });

  const stats = {
    total: exams.length,
    active: exams.filter(e => e.isPublished && !e.isLocked).length,
    draft: exams.filter(e => !e.isPublished && !e.isLocked).length,
    finished: exams.filter(e => e.isLocked).length,
  };

  const STAT_CARDS = [
    { label: 'إجمالي', value: stats.total, bg: '#f9fafb', color: '#111827' },
    { label: 'نشط', value: stats.active, bg: '#d1fae5', color: '#065f46' },
    { label: 'مسودة', value: stats.draft, bg: '#f9fafb', color: '#6b7280' },
    { label: 'منتهي', value: stats.finished, bg: '#fee2e2', color: '#991b1b' },
  ];

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'draft', label: 'مسودة' },
    { value: 'finished', label: 'منتهي' },
  ];

  const handleManage  = (id: string) => navigate(`/exams/${id}/settings`);
  const handleResults = (id: string) => navigate(`/exams/${id}/results`);
  const handleTake    = (id: string) => navigate(`/exams/${id}/take`);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        padding: '1.5rem',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0 }}>
            الامتحانات
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {isTeacher ? 'إدارة الامتحانات وبنك الأسئلة' : 'امتحاناتك المتاحة'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => navigate('/exams/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + امتحان جديد
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginRight: 'auto',
              background: 'transparent',
              border: '1px solid #f87171',
              borderRadius: 6,
              color: '#991b1b',
              fontSize: 12,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Stats (للمدرس فقط) */}
      {isTeacher && !loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {STAT_CARDS.map((s, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '0.5px solid #e5e7eb',
                padding: '1rem',
              }}
            >
              <p style={{ fontSize: 24, fontWeight: 500, color: s.color, margin: 0 }}>
                {s.value}
              </p>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: s.bg,
                  color: s.color,
                  marginTop: 4,
                  display: 'inline-block',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الامتحانات..."
            dir="rtl"
            style={{
              width: '100%',
              border: '0.5px solid #d1d5db',
              borderRadius: 10,
              padding: '10px 36px 10px 12px',
              fontSize: 14,
              outline: 'none',
              background: '#fff',
              color: '#111827',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {isTeacher && (
          <div
            style={{
              display: 'flex',
              background: '#fff',
              border: '0.5px solid #e5e7eb',
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}
          >
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: filterStatus === f.value ? '#4f46e5' : 'transparent',
                  color: filterStatus === f.value ? '#fff' : '#6b7280',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
            gap: '1rem',
          }}
        >
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#6b7280' }}>لا توجد امتحانات</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            {search
              ? 'لم يتم العثور على نتائج.'
              : isTeacher
              ? 'ابدأ بإنشاء امتحان جديد.'
              : 'لا توجد امتحانات متاحة لك حالياً.'}
          </p>
          {isTeacher && !search && (
            <button
              onClick={() => navigate('/exams/new')}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              + إنشاء أول امتحان
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              isTeacher={isTeacher}
              onManage={handleManage}
              onResults={handleResults}
              onTake={handleTake}
            />
          ))}
        </div>
      )}
    </div>
  );
}
