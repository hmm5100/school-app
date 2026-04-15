// src/pages/ExamSettings.tsx
// صفحة إعدادات الامتحان: وقت البداية والنهاية، نماذج الطلاب، قفل الامتحان

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Lock, Unlock, Users, Shuffle, Save, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, BarChart2, Trash2, Download } from 'lucide-react';
import { getExamById, updateExam, updateExamClasses, lockExam, unlockExam, publishExam, unpublishExam, deleteExam, getAllAnswersForExam } from '../services/examService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Exam, StudentAnswer } from '../types';

function toInputDatetime(d: Date | undefined): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputDatetime(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatDateTime(d: Date | undefined): string {
  if (!d) return 'غير محدد';
  return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: Exam['status'] }) {
  const map = {
    draft:    { label: 'مسودة', bg: '#f3f4f6', color: '#4b5563' },
    active:   { label: 'نشط',   bg: '#d1fae5', color: '#065f46' },
    finished: { label: 'منتهي', bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status];
  return <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 99, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

interface ConfirmDialogProps {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel = 'تأكيد', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>إلغاء</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', fontSize: 13, color: '#fff', background: danger ? '#dc2626' : '#4f46e5', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: 24, marginBottom: 16 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const input: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box', direction: 'rtl' };

export default function ExamSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const canDelete = isAdmin || (userProfile?.permissions?.canDeleteExam === true);
  const canEditExam = isAdmin || (userProfile?.permissions?.canEditOwnExam === true);

  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; className: string; number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [enableModels, setEnableModels] = useState(false);
  const [activeModels, setActiveModels] = useState<('A' | 'B' | 'C' | 'D')[]>(['A']);
  const [confirmAction, setConfirmAction] = useState<null | 'lock' | 'unlock' | 'delete' | 'publish' | 'unpublish'>(null);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [allowedClasses, setAllowedClasses] = useState<string[]>([]);
  const [savingClasses, setSavingClasses] = useState(false);
  const [savedClasses, setSavedClasses] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getExamById(id),
      getAllAnswersForExam(id),
      getDocs(collection(db, 'students')),
    ]).then(([e, ans, studSnap]) => {
      if (e) { setExam(e); setStartTime(toInputDatetime(e.startTime)); setEndTime(toInputDatetime(e.endTime)); setDuration(e.duration); setAllowedClasses(e.classIds || []); }
      setAnswers(ans);
      const names: Record<string, string> = {};
      const all: { id: string; name: string; className: string; number: number }[] = [];
      studSnap.docs.forEach(d => {
        const data = d.data();
        names[d.id] = data.name || d.id;
        all.push({ id: d.id, name: data.name || d.id, className: data.className || '', number: data.number || 0 });
      });
      setStudentNames(names);
      setAllStudents(all);
      // استخراج كل الفصول الفريدة من الطلاب
      const uniqueClasses = [...new Set(all.map(s => s.className).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'ar')
      );
      setAllClasses(uniqueClasses);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!exam || exam.isLocked || exam.status === 'finished') return;
    const interval = setInterval(async () => {
      const now = new Date();
      if (exam.endTime && now > exam.endTime) {
        await lockExam(exam.id);
        setExam(prev => prev ? { ...prev, isLocked: true, status: 'finished' } : prev);
        clearInterval(interval);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [exam]);

  const handleSave = async () => {
    if (!exam) return;
    setSaving(true); setError('');
    const parsedStart = fromInputDatetime(startTime);
    const parsedEnd = fromInputDatetime(endTime);
    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) { setError('وقت الانتهاء يجب أن يكون بعد وقت البداية.'); setSaving(false); return; }
    try {
      await updateExam(exam.id, { startTime: parsedStart, endTime: parsedEnd, duration });
      setExam(prev => prev ? { ...prev, startTime: parsedStart, endTime: parsedEnd, duration } : prev);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('حدث خطأ أثناء الحفظ.'); }
    finally { setSaving(false); }
  };

  const handleSaveClasses = async () => {
    if (!exam) return;
    setSavingClasses(true);
    try {
      await updateExamClasses(exam.id, allowedClasses);
      setExam(prev => prev ? { ...prev, classIds: allowedClasses } : prev);
      setSavedClasses(true);
      setTimeout(() => setSavedClasses(false), 3000);
    } catch { setError('حدث خطأ أثناء حفظ الفصول.'); }
    finally { setSavingClasses(false); }
  };

  const executeAction = async () => {
    if (!exam || !confirmAction) return;
    setConfirmAction(null);
    try {
      switch (confirmAction) {
        case 'lock':      await lockExam(exam.id);      setExam(p => p ? { ...p, isLocked: true,  status: 'finished' } : p); break;
        case 'unlock':    await unlockExam(exam.id);    setExam(p => p ? { ...p, isLocked: false, status: 'active'   } : p); break;
        case 'publish':   await publishExam(exam.id);   setExam(p => p ? { ...p, isPublished: true,  status: 'active' } : p); break;
        case 'unpublish': await unpublishExam(exam.id); setExam(p => p ? { ...p, isPublished: false, status: 'draft'  } : p); break;
        case 'delete':    await deleteExam(exam.id);    navigate('/exams'); break;
      }
    } catch { setError('حدث خطأ أثناء تنفيذ العملية.'); }
  };

  const toggleModel = (m: 'A' | 'B' | 'C' | 'D') => {
    setActiveModels(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m]);
  };

  const submittedCount = answers.filter(a => a.isSubmitted).length;
  const avgScore = submittedCount > 0 ? Math.round(answers.filter(a => a.score !== undefined).reduce((s, a) => s + (a.score || 0), 0) / submittedCount) : 0;

  const exportFullExcel = () => {
    if (!exam) return;

    const answerMap: Record<string, StudentAnswer> = {};
    answers.forEach(a => { answerMap[a.studentId] = a; });

    const sorted = [...allStudents].sort((a, b) =>
      a.className.localeCompare(b.className, 'ar') || a.number - b.number
    );

    const dataRows = sorted.map((st, idx) => {
      const ans = answerMap[st.id];
      const hasSubmitted = ans && ans.isSubmitted;
      return {
        'عدد': idx + 1,
        'أسماء التلاميذ': (ans as any)?.studentName || st.name,
        'الفصل': st.className,
        'درجة الطالب': hasSubmitted ? (ans.score ?? '') : 'غ',
        'الدرجة الكلية': hasSubmitted ? exam.totalScore : '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataRows, {
      header: ['عدد', 'أسماء التلاميذ', 'الفصل', 'درجة الطالب', 'الدرجة الكلية'],
    });

    ws['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 13 }, { wch: 15 }, { wch: 15 }];
    (ws as any)['!sheetView'] = { rightToLeft: true };

    const headerStyle = {
      font: { name: 'Calibri', sz: 11 },
      fill: { fgColor: { rgb: 'C6EFCE' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
    };
    const centerStyle = {
      font: { name: 'Calibri', sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
    };
    const rightStyle = {
      font: { name: 'Calibri', sz: 11 },
      alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
    };
    const absentStyle = {
      font: { name: 'Calibri', sz: 11, color: { rgb: 'C00000' } },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
    };

    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      if (ws[`${col}1`]) ws[`${col}1`].s = headerStyle;
    });

    for (let i = 0; i < dataRows.length; i++) {
      const r = i + 2;
      const isAbsent = dataRows[i]['درجة الطالب'] === 'غ';
      if (ws[`A${r}`]) ws[`A${r}`].s = centerStyle;
      if (ws[`B${r}`]) ws[`B${r}`].s = rightStyle;
      if (ws[`C${r}`]) ws[`C${r}`].s = centerStyle;
      if (ws[`D${r}`]) ws[`D${r}`].s = isAbsent ? absentStyle : centerStyle;
      if (ws[`E${r}`]) ws[`E${r}`].s = centerStyle;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'ورقة1');
    XLSX.writeFile(wb, `نتائج_${exam.title}.xlsx`, { bookType: 'xlsx', cellStyles: true });
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!exam) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }} dir="rtl">
      <AlertCircle size={48} color="#9ca3af" />
      <p style={{ fontSize: 15, color: '#6b7280' }}>الامتحان غير موجود</p>
      <button onClick={() => navigate('/exams')} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>العودة</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100%', padding: '24px', boxSizing: 'border-box', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/exams')} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
          <ArrowRight size={18} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>{exam.title}</h1>
            <StatusBadge status={exam.status} />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            {exam.subjectName} · {exam.duration} دقيقة · {exam.totalScore} درجة
          </p>
        </div>
        <button
          onClick={exportFullExcel}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <Download size={16} /> تحميل نتائج كاملة
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { icon: <Users size={18} color="#4f46e5" />, label: 'الطلاب المشاركون', value: answers.length, bg: '#eef2ff' },
          { icon: <CheckCircle2 size={18} color="#059669" />, label: 'المسلّمون', value: submittedCount, bg: '#d1fae5' },
          { icon: <BarChart2 size={18} color="#d97706" />, label: 'متوسط الدرجة', value: submittedCount > 0 ? `${avgScore}/${exam.totalScore}` : '—', bg: '#fef3c7' },
          { icon: <Clock size={18} color="#6b7280" />, label: 'عدد الأسئلة', value: exam.questions?.length || 0, bg: '#f3f4f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{s.icon}</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Success / Error */}
      {saved && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="#059669" /> تم حفظ الإعدادات بنجاح</div>}
      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} color="#dc2626" /> {error}</div>}

      {/* ── Edit Questions ── */}
      {canEditExam && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✏️</div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>تعديل الأسئلة</h2>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            يمكنك إضافة أسئلة جديدة أو حذف أسئلة موجودة.
            {submittedCount > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}> ⚠️ يوجد {submittedCount} طالب أجرى الامتحان — أي تعديل سيؤثر على نتائجهم.</span>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(exam.questions || []).map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <span style={{ minWidth: 24, height: 24, borderRadius: 8, background: '#e0e7ff', color: '#3730a3', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <p style={{ flex: 1, fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{q.text}</p>
                <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginTop: 2 }}>{q.score} درجة</span>
                <button
                  onClick={async () => {
                    if (!window.confirm('هل تريد حذف هذا السؤال؟')) return;
                    const newQuestions = exam.questions.filter(x => x.id !== q.id);
                    const newTotal = newQuestions.reduce((s, x) => s + x.score, 0);
                    await updateExam(exam.id, { questions: newQuestions, totalScore: newTotal } as any);
                    setExam(prev => prev ? { ...prev, questions: newQuestions, totalScore: newTotal } : prev);
                  }}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 12, flexShrink: 0 }}
                  title="حذف السؤال"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(`/exams/${exam.id}/edit`)}
            style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          >
            ➕ إضافة / تعديل الأسئلة في محرر الامتحان
          </button>
        </div>
      )}

      {/* Timing */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} color="#4f46e5" /></div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>توقيت الامتحان</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={label}>وقت البداية</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={exam.isLocked} style={{ ...input, opacity: exam.isLocked ? 0.6 : 1 }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{startTime ? formatDateTime(fromInputDatetime(startTime)) : 'غير محدد'}</p>
          </div>
          <div>
            <label style={label}>وقت الانتهاء</label>
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={exam.isLocked} style={{ ...input, opacity: exam.isLocked ? 0.6 : 1 }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{endTime ? formatDateTime(fromInputDatetime(endTime)) : 'غير محدد'}</p>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={label}>مدة الامتحان (دقيقة)</label>
          <input type="number" min={5} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={exam.isLocked} style={{ ...input, width: 120, opacity: exam.isLocked ? 0.6 : 1 }} />
          {endTime && startTime && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>سيُقفل الامتحان تلقائياً بعد هذه المدة</p>}
        </div>
        <button onClick={handleSave} disabled={saving || exam.isLocked} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: saving || exam.isLocked ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: saving || exam.isLocked ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* Allowed Classes */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>الفصول المسموح بها</h2>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          اختر الفصول التي يحق لطلابها دخول هذا الامتحان. إذا لم تختر أي فصل، يمكن لجميع الطلاب الدخول.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {allClasses.map(cls => {
            const isSelected = allowedClasses.includes(cls);
            return (
              <button
                key={cls}
                onClick={() => setAllowedClasses(prev =>
                  isSelected ? prev.filter(c => c !== cls) : [...prev, cls]
                )}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 600, borderRadius: 99, cursor: 'pointer', transition: 'all 0.15s',
                  border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                  background: isSelected ? '#2563eb' : '#fff',
                  color: isSelected ? '#fff' : '#6b7280',
                }}
              >
                {cls}
              </button>
            );
          })}
        </div>
        {allowedClasses.length > 0 && (
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
            المسموح لهم: <strong style={{ color: '#111827' }}>{allowedClasses.join(' · ')}</strong>
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSaveClasses}
            disabled={savingClasses}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: savingClasses ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: savingClasses ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            <Save size={16} /> {savingClasses ? 'جاري الحفظ...' : 'حفظ الفصول'}
          </button>
          {savedClasses && <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} color="#059669" /> تم الحفظ</span>}
        </div>
      </div>

      {/* Models */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shuffle size={18} color="#7c3aed" /></div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>نماذج الامتحان</h2>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: exam.isLocked ? 'not-allowed' : 'pointer' }}>
            <div onClick={() => !exam.isLocked && setEnableModels(p => !p)} style={{ width: 44, height: 24, borderRadius: 99, background: enableModels ? '#7c3aed' : '#d1d5db', position: 'relative', cursor: exam.isLocked ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, right: enableModels ? 2 : 22, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 13, color: '#374151' }}>تفعيل النماذج المتعددة</span>
          </label>
        </div>
        {enableModels ? (
          <div>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>اختر النماذج المتاحة:</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['A', 'B', 'C', 'D'] as const).map(m => (
                <button key={m} onClick={() => !exam.isLocked && toggleModel(m)} disabled={exam.isLocked} style={{ width: 56, height: 56, borderRadius: 16, fontSize: 18, fontWeight: 700, border: `2px solid ${activeModels.includes(m) ? '#7c3aed' : '#e5e7eb'}`, background: activeModels.includes(m) ? '#7c3aed' : '#fff', color: activeModels.includes(m) ? '#fff' : '#6b7280', cursor: exam.isLocked ? 'not-allowed' : 'pointer', opacity: exam.isLocked ? 0.5 : 1 }}>
                  {m}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>النماذج المفعّلة: {activeModels.join('، ')}</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>عند التفعيل، سيحصل كل طالب على نموذج مختلف بترتيب أسئلة مختلف.</p>
        )}
      </div>

      {/* Publish & Lock */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={18} color="#dc2626" /></div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>حالة الامتحان</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Publish */}
          <div style={{ border: `1px solid ${exam.isPublished ? '#6ee7b7' : '#e5e7eb'}`, borderRadius: 16, padding: 16, background: exam.isPublished ? '#f0fdf4' : '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {exam.isPublished ? <Eye size={18} color="#059669" /> : <EyeOff size={18} color="#9ca3af" />}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>النشر</span>
              </div>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, fontWeight: 600, background: exam.isPublished ? '#d1fae5' : '#f3f4f6', color: exam.isPublished ? '#065f46' : '#6b7280' }}>
                {exam.isPublished ? 'منشور' : 'مسودة'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {exam.isPublished ? 'الامتحان مرئي للطلاب ويمكنهم البدء فيه.' : 'الامتحان مخفي عن الطلاب حتى الآن.'}
            </p>
            <button onClick={() => setConfirmAction(exam.isPublished ? 'unpublish' : 'publish')} disabled={exam.isLocked} style={{ width: '100%', padding: '8px 0', fontSize: 13, borderRadius: 10, border: exam.isPublished ? '1px solid #d1d5db' : 'none', background: exam.isPublished ? '#fff' : '#059669', color: exam.isPublished ? '#374151' : '#fff', cursor: exam.isLocked ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: exam.isLocked ? 0.5 : 1 }}>
              {exam.isPublished ? 'إلغاء النشر' : 'نشر الامتحان'}
            </button>
          </div>

          {/* Lock */}
          <div style={{ border: `1px solid ${exam.isLocked ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 16, padding: 16, background: exam.isLocked ? '#fff5f5' : '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {exam.isLocked ? <Lock size={18} color="#dc2626" /> : <Unlock size={18} color="#9ca3af" />}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>القفل</span>
              </div>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, fontWeight: 600, background: exam.isLocked ? '#fee2e2' : '#f3f4f6', color: exam.isLocked ? '#991b1b' : '#6b7280' }}>
                {exam.isLocked ? 'مقفول' : 'مفتوح'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {exam.isLocked ? 'الامتحان مقفول. لا يمكن للطلاب الإجابة أو التسليم.' : 'يمكن للطلاب الإجابة وتسليم الامتحان.'}
            </p>
            <button onClick={() => setConfirmAction(exam.isLocked ? 'unlock' : 'lock')} style={{ width: '100%', padding: '8px 0', fontSize: 13, borderRadius: 10, border: exam.isLocked ? '1px solid #d1d5db' : 'none', background: exam.isLocked ? '#fff' : '#dc2626', color: exam.isLocked ? '#374151' : '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {exam.isLocked ? 'فتح الامتحان' : 'قفل الامتحان'}
            </button>
          </div>
        </div>
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>إجابات الطلاب ({answers.length})</h2>
            <button
              onClick={() => {
                // إنشاء ملف Excel احترافي
                const wb = XLSX.utils.book_new();
                
                // تحضير البيانات مع الترتيب والتنسيق الكامل
                const excelData: any[][] = [];
                
                // الهيدر
                excelData.push(['العدد', 'الاسم', 'الفصل', 'درجة الطالب', 'الدرجة الكلية']);
                
                // ترتيب الإجابات حسب رقم الطالب
                const sortedAnswers = [...answers].sort((a, b) => {
                  const studentA = allStudents.find(s => s.id === a.studentId);
                  const studentB = allStudents.find(s => s.id === b.studentId);
                  return (studentA?.number || 0) - (studentB?.number || 0);
                });
                
                // البيانات
                sortedAnswers.forEach((ans, index) => {
                  const student = allStudents.find(s => s.id === ans.studentId);
                  excelData.push([
                    index + 1, // العدد (رقم تسلسلي)
                    student?.name || studentNames[ans.studentId] || ans.studentId, // الاسم
                    student?.className || '—', // الفصل
                    ans.score !== undefined ? ans.score : 0, // درجة الطالب
                    exam.totalScore, // الدرجة الكلية
                  ]);
                });
                
                // إنشاء الورقة
                const ws = XLSX.utils.aoa_to_sheet(excelData);
                
                // تنسيق العرض
                ws['!cols'] = [
                  { wch: 8 },  // العدد
                  { wch: 35 }, // الاسم
                  { wch: 15 }, // الفصل
                  { wch: 15 }, // درجة الطالب
                  { wch: 15 }, // الدرجة الكلية
                ];
                
                // إضافة الورقة للملف
                XLSX.utils.book_append_sheet(wb, ws, 'إجابات الطلاب');
                
                // تحميل الملف
                XLSX.writeFile(wb, `${exam.title}_إجابات_الطلاب.xlsx`);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, color: '#059669', border: '1px solid #6ee7b7', borderRadius: 10, background: '#f0fdf4', cursor: 'pointer', fontWeight: 600 }}
            >
              <Download size={14} /> تحميل Excel
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['الطالب', 'النموذج', 'الحالة', 'الدرجة', 'وقت التسليم'].map(h => (
                    <th key={h} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answers.map(ans => (
                  <tr key={ans.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>
                      {(ans as any).studentName || studentNames[ans.studentId] || ans.studentId}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>{ans.model}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: ans.isSubmitted ? '#d1fae5' : '#fef3c7', color: ans.isSubmitted ? '#065f46' : '#b45309' }}>
                        {ans.isSubmitted ? 'مسلّم' : 'جاري'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{ans.score !== undefined ? `${ans.score} / ${exam.totalScore}` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12 }}>{ans.submittedAt ? formatDateTime(ans.submittedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تعديل الأسئلة */}
      {canEditExam && (
        <div style={{ ...card, border: '1px solid #e0e7ff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>تعديل الأسئلة</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            إضافة أسئلة جديدة أو حذف أسئلة موجودة من الامتحان.
            {submittedCount > 0 && <span style={{ color: '#f59e0b', marginRight: 6 }}>⚠️ يوجد {submittedCount} طالب سبق وأجرى الامتحان — التعديل قد يؤثر على نتائجهم.</span>}
          </p>
          <button
            onClick={() => navigate(`/exams/${id}/edit`)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: 13, color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 10, background: '#eef2ff', cursor: 'pointer', fontWeight: 600 }}>
            ✏️ تعديل الأسئلة
          </button>
        </div>
      )}

      {/* Delete */}
      <div style={{ ...card, border: '1px solid #fee2e2' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>منطقة الخطر</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>حذف الامتحان يؤدي إلى إزالة جميع الأسئلة والإجابات نهائياً.</p>
        {/* لو مش عنده صلاحية حذف خالص — مخفي */}
        {!canDelete ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>ليس لديك صلاحية حذف الامتحانات.</p>
        ) : (
          <>
            <button
              onClick={() => setConfirmAction('delete')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
              <Trash2 size={15} /> حذف الامتحان
            </button>
            {submittedCount > 0 && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>⚠️ سيتم حذف نتائج {submittedCount} طالب أيضاً.</p>
            )}
          </>
        )}
      </div>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === 'delete' ? 'حذف الامتحان' : confirmAction === 'lock' ? 'قفل الامتحان' : confirmAction === 'unlock' ? 'فتح الامتحان' : confirmAction === 'publish' ? 'نشر الامتحان' : 'إلغاء نشر الامتحان'}
          message={confirmAction === 'delete' ? (isAdmin && submittedCount > 0 ? `هل أنت متأكد؟ سيتم حذف الامتحان ونتائج ${submittedCount} طالب نهائياً. لا يمكن التراجع.` : 'هل أنت متأكد من حذف هذا الامتحان؟ لا يمكن التراجع عن هذا الإجراء.') : confirmAction === 'lock' ? 'سيُقفل الامتحان ولن يتمكن الطلاب من الإجابة أو التسليم.' : confirmAction === 'unlock' ? 'سيُفتح الامتحان وسيتمكن الطلاب من الإجابة مجدداً.' : confirmAction === 'publish' ? 'سيُنشر الامتحان وسيظهر للطلاب.' : 'سيُخفى الامتحان عن الطلاب.'}
          confirmLabel={confirmAction === 'delete' ? 'نعم، احذف' : confirmAction === 'lock' ? 'نعم، اقفل' : confirmAction === 'unlock' ? 'نعم، افتح' : 'تأكيد'}
          danger={confirmAction === 'delete' || confirmAction === 'lock'}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
