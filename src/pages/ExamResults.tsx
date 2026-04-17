// src/pages/ExamResults.tsx
// نتائج الامتحان — مرتبة من الأعلى درجة، مع زر "مراجعة الحل" لكل طالب

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Users, TrendingUp, Award, AlertCircle, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getExamById, getAllAnswersForExam } from '../services/examService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Exam, StudentAnswer } from '../types';

function formatDateTime(d: Date | undefined): string {
  if (!d) return '—';
  return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ExamResults() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const [exam, setExam]               = useState<Exam | null>(null);
  const [answers, setAnswers]         = useState<StudentAnswer[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; className: string; number: number }[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [sortBy, setSortBy]           = useState<'score' | 'name'>('score'); // ✅ ترتيب افتراضي بالدرجة

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getExamById(id),
      getAllAnswersForExam(id),
      getDocs(collection(db, 'students')),
    ]).then(([e, ans, studSnap]) => {
      setExam(e);
      setAnswers(ans);
      const all: { id: string; name: string; className: string; number: number }[] = [];
      studSnap.docs.forEach(d => {
        const data = d.data();
        all.push({ id: d.id, name: data.name || d.id, className: data.className || '', number: data.number || 0 });
      });
      setAllStudents(all);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#6b7280', fontSize: 14 }}>
        جاري التحميل...
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
        <p>لم يتم العثور على الامتحان.</p>
      </div>
    );
  }

  const submitted     = answers.filter(a => a.isSubmitted);
  const scores        = submitted.map(a => a.score ?? 0);
  const avg           = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
  const highest       = scores.length ? Math.max(...scores) : 0;
  const passingCount  = scores.filter(s => s >= exam.totalScore * 0.5).length;
  const uniqueClasses = [...new Set(allStudents.map(s => s.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));

  // ✅ فلترة + ترتيب
  const filtered = submitted
    .filter(ans => {
      if (!filterClass) return true;
      const student = allStudents.find(s => s.id === ans.studentId);
      return student?.className === filterClass;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        // الأعلى درجة أولاً
        return (b.score ?? 0) - (a.score ?? 0);
      } else {
        // ترتيب أبجدي بالاسم
        const sa = allStudents.find(s => s.id === a.studentId);
        const sb = allStudents.find(s => s.id === b.studentId);
        return (sa?.name || '').localeCompare(sb?.name || '', 'ar');
      }
    });

  // Excel
  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const data: unknown[][] = [['الترتيب', 'الاسم', 'الفصل', 'الدرجة', 'الدرجة الكلية', 'النسبة %', 'وقت التسليم']];
    filtered.forEach((ans, i) => {
      const student = allStudents.find(s => s.id === ans.studentId);
      const score   = ans.score ?? 0;
      data.push([
        i + 1,
        student?.name || ans.studentId,
        student?.className || '—',
        score,
        exam.totalScore,
        exam.totalScore > 0 ? Math.round((score / exam.totalScore) * 100) + '%' : '—',
        ans.submittedAt ? formatDateTime(ans.submittedAt) : '—',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'نتائج الامتحان');
    XLSX.writeFile(wb, `نتائج_${exam.title}.xlsx`);
  };

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: 20,
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/exams/${id}/settings`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
          <ArrowRight size={14} /> إعدادات الامتحان
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>نتائج الامتحان</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{exam.title} — {exam.subjectName}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <Users size={18} color="#4f46e5" />, label: 'عدد المسلّمين', value: submitted.length, bg: '#eef2ff' },
          { icon: <TrendingUp size={18} color="#059669" />, label: 'المتوسط', value: `${avg} / ${exam.totalScore}`, bg: '#f0fdf4' },
          { icon: <Award size={18} color="#d97706" />, label: 'أعلى درجة', value: `${highest} / ${exam.totalScore}`, bg: '#fffbeb' },
          { icon: <Award size={18} color="#7c3aed" />, label: 'الناجحون (≥50%)', value: `${passingCount} طالب`, bg: '#f5f3ff' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', outline: 'none', direction: 'rtl' }}>
          <option value="">كل الفصول</option>
          {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>

        {/* ✅ ترتيب */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'score' | 'name')}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', outline: 'none', direction: 'rtl' }}>
          <option value="score">ترتيب: الأعلى درجة أولاً</option>
          <option value="name">ترتيب: أبجدي بالاسم</option>
        </select>

        <button onClick={handleDownload}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, color: '#059669', border: '1px solid #6ee7b7', borderRadius: 10, background: '#f0fdf4', cursor: 'pointer', fontWeight: 600, marginRight: 'auto' }}>
          <Download size={14} /> تحميل Excel
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: 40 }}>
          لا توجد نتائج بعد.
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['#', 'الاسم', 'الفصل', 'الدرجة', 'النسبة', 'وقت التسليم', 'مراجعة'].map(h => (
                  <th key={h} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ans, i) => {
                const student = allStudents.find(s => s.id === ans.studentId);
                const score   = ans.score ?? 0;
                const percent = exam.totalScore > 0 ? Math.round((score / exam.totalScore) * 100) : 0;
                const passing = percent >= 50;

                // ✅ تمييز الأول والثاني والثالث
                const rankBg = i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fef9ec' : 'transparent';
                const rankColor = i === 0 ? '#b45309' : i === 1 ? '#6b7280' : i === 2 ? '#92400e' : '#9ca3af';
                const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;

                return (
                  <tr key={ans.id} style={{ borderBottom: '1px solid #f9fafb', background: i < 3 ? rankBg : 'white' }}>
                    <td style={{ padding: '10px 16px', color: rankColor, fontWeight: 700, fontSize: 15 }}>{rankLabel}</td>
                    <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>{student?.name || ans.studentId}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{student?.className || '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#374151', fontWeight: 600 }}>{score} / {exam.totalScore}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: passing ? '#d1fae5' : '#fee2e2', color: passing ? '#065f46' : '#991b1b' }}>
                        {percent}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 12 }}>{formatDateTime(ans.submittedAt)}</td>
                    {/* ✅ زر مراجعة حل الطالب */}
                    <td style={{ padding: '10px 16px' }}>
                      <button
                        onClick={() => navigate(`/exams/${id}/review/${ans.studentId}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 8, background: '#eef2ff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        <Eye size={13} /> مراجعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
