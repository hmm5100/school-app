// src/pages/TakeExam.tsx
// صفحة أداء الامتحان للطالب: مؤقت، حفظ تلقائي، قفل تلقائي، تنبيه الأسئلة غير المجابة

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getExamById,
  getStudentAnswers,
  saveStudentAnswer,
  submitStudentExam,
  generateExamModel,
  assignModelToStudent,
  isExamTimeExpired,
  getRemainingTime,
} from '../services/examService';
import type { Exam, Question } from '../types';
import { createRetakeRequest, hasPendingRetakeRequest } from '../services/examRetakeService';

function formatTime(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total > 0 ? (answered / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#4f46e5', borderRadius: 99, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{answered}/{total}</span>
    </div>
  );
}

interface SubmitModalProps {
  unanswered: number[];
  totalQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function SubmitModal({ unanswered, totalQuestions, onConfirm, onCancel }: SubmitModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: 24 }}>
          {unanswered.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={24} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>أسئلة غير مجابة</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{unanswered.length} من {totalQuestions}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>لم تجب على الأسئلة التالية:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {unanswered.map(n => (
                  <span key={n} style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#b45309', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {n}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>هل تريد تسليم الامتحان رغم وجود أسئلة غير مجابة؟</p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={24} color="#059669" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>جاهز للتسليم</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>أجبت على جميع الأسئلة</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 20 }}>هل تريد تسليم الامتحان؟ لن تتمكن من تغيير إجاباتك بعد التسليم.</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', cursor: 'pointer' }}>
              {unanswered.length > 0 ? 'مراجعة' : 'إلغاء'}
            </button>
            <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#fff', background: '#4f46e5', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              تسليم نهائي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RetakeModalProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function RetakeModal({ onConfirm, onCancel, loading }: RetakeModalProps) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={22} color="#7c3aed" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>طلب إعادة امتحان</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>اذكر سبب طلب الإعادة</p>
            </div>
          </div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب سبب طلب إعادة الامتحان هنا..."
            style={{ width: '100%', minHeight: 96, padding: 12, borderRadius: 12, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'Cairo, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', cursor: 'pointer' }}>
              إلغاء
            </button>
            <button
              onClick={() => reason.trim() && onConfirm(reason.trim())}
              disabled={!reason.trim() || loading}
              style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#fff', background: reason.trim() && !loading ? '#7c3aed' : '#c4b5fd', borderRadius: 12, border: 'none', cursor: reason.trim() && !loading ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { studentProfile, userProfile } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [model, setModel] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [startedAt] = useState(new Date());
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeLoading, setRetakeLoading] = useState(false);
  const [retakeSent, setRetakeSent] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const studentId = studentProfile?.id || userProfile?.id || 'demo_student';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getExamById(id), getStudentAnswers(id, studentId)]).then(([e, existing]) => {
      if (!e) { setLoading(false); return; }
      if (e.isLocked) { setAutoLocked(true); setLoading(false); return; }
      // تحقق إن فصل الطالب مسموح له
      const studentClassId = studentProfile?.classId || '';
      const studentClassName = studentProfile?.className || '';
      const isAllowed = !e.classIds || e.classIds.length === 0 ||
        e.classIds.includes(studentClassId) ||
        e.classIds.includes(studentClassName);
      if (!isAllowed) {
        setNotAllowed(true);
        setExam(e);
        setLoading(false);
        return;
      }
      const assignedModel = assignModelToStudent(studentId, ['A', 'B', 'C', 'D']);
      setModel(assignedModel);
      const shuffled = generateExamModel(e.questions, assignedModel);
      setExam(e);
      setQuestions(shuffled);
      if (existing?.answers) {
        const restored: Record<string, string> = {};
        Object.entries(existing.answers).forEach(([k, v]) => { restored[k] = Array.isArray(v) ? v[0] : v; });
        setAnswers(restored);
      }
      if (existing?.isSubmitted) {
        setSubmitted(true);
        if (existing.score !== undefined) setResult({ score: existing.score, total: e.totalScore });
      }
      setRemaining(getRemainingTime(e, startedAt));
      setLoading(false);
    });
  }, [id, studentId]);

  useEffect(() => {
    if (!exam || submitted || autoLocked) return;
    timerRef.current = setInterval(() => {
      const rem = getRemainingTime(exam, startedAt);
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current!);
        handleConfirmSubmit();
      }
    }, 10000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [exam, submitted, autoLocked]);

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: answer };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        await saveStudentAnswer(id!, studentId, questionId, answer, model);
        setSaving(false);
        setLastSaved(new Date());
      }, 1000);
      return updated;
    });
  }, [id, studentId, model]);

  const handleSubmitClick = () => setShowSubmitModal(true);

  const handleConfirmSubmit = async () => {
    if (!exam || !id) return;
    setShowSubmitModal(false);
    try {
      const res = await submitStudentExam(id, studentId, exam);
      setSubmitted(true);
      setResult(res);
    } catch {
      // handle error
    }
  };

  const handleRequestRetake = async (reasonText: string) => {
    if (!exam || !id) return;
    setRetakeLoading(true);
    try {
      const hasPending = await hasPendingRetakeRequest(id, studentId);
      if (hasPending) {
        alert('لديك طلب معلق بالفعل');
        setShowRetakeModal(false);
        setRetakeLoading(false);
        return;
      }
      const studentName = studentProfile?.name || userProfile?.displayName || 'طالب';
      await createRetakeRequest({
        examId: id,
        examTitle: exam.title,
        studentId,
        studentName,
        classId: studentProfile?.classId || '',
        teacherId: exam.teacherId || '',
        teacherName: exam.teacherName || '',
        reason: reasonText,
        originalScore: result?.score,
        originalPercentage: result ? Math.round((result.score / result.total) * 100) : undefined,
      });
      setRetakeSent(true);
      setShowRetakeModal(false);
    } catch {
      alert('حدث خطأ، حاول مرة أخرى');
    } finally {
      setRetakeLoading(false);
    }
  };

  const answeredCount = questions.filter(q => answers[q.id]).length;
  const unansweredIndices = questions.map((q, i) => !answers[q.id] ? i + 1 : null).filter(Boolean) as number[];
  const currentQ = questions[currentIdx];
  const isDanger = remaining < 5 && remaining > 0;
  const isWarning = remaining < 10 && remaining >= 5;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#6b7280' }}>جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  // ── Not Allowed ──
  if (notAllowed && exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} color="#d97706" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>غير مسموح لفصلك</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>هذا الامتحان مخصص للفصول التالية فقط:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {exam.classIds.map(cls => (
              <span key={cls} style={{ padding: '4px 14px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontSize: 13, fontWeight: 600 }}>{cls}</span>
            ))}
          </div>
          <button onClick={() => navigate('/exams')} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            العودة للامتحانات
          </button>
        </div>
      </div>
    );
  }

  // ── Locked ──
  if (autoLocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>الامتحان مقفول</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>هذا الامتحان مقفول ولا يمكن الإجابة عليه.</p>
          <button onClick={() => navigate('/exams')} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            العودة للامتحانات
          </button>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>الامتحان غير موجود</h2>
          <button onClick={() => navigate('/exams')} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            العودة للامتحانات
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted ──
  if (submitted && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: pct >= 50 ? '#d1fae5' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={36} color={pct >= 50 ? '#059669' : '#dc2626'} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>تم تسليم الامتحان</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{exam.title}</p>
          <div style={{ background: '#f9fafb', borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <p style={{ fontSize: 40, fontWeight: 800, color: pct >= 50 ? '#059669' : '#dc2626', margin: 0 }}>{result.score}</p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>من {result.total} درجة</p>
            <p style={{ fontSize: 14, color: '#374151', marginTop: 8, fontWeight: 600 }}>{pct}%</p>
          </div>
          <button onClick={() => navigate('/exams')} style={{ width: '100%', padding: '12px 0', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            العودة للامتحانات
          </button>
          {/* زر مراجعة الحل */}
          <button
            onClick={() => navigate(`/exams/${id}/review`)}
            style={{ width: '100%', marginTop: 12, padding: '12px 0', background: '#fff', color: '#4f46e5', border: '1.5px solid #4f46e5', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Cairo, sans-serif' }}
          >
            📋 مراجعة الحل والإجابات الصحيحة
          </button>
          {/* زر طلب إعادة الامتحان */}
          {retakeSent ? (
            <div style={{ marginTop: 12, padding: '10px 16px', background: '#d1fae5', borderRadius: 12, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              ✓ تم إرسال طلب إعادة الامتحان بنجاح
            </div>
          ) : (
            <button
              onClick={() => setShowRetakeModal(true)}
              style={{ width: '100%', marginTop: 12, padding: '12px 0', background: '#fff', color: '#7c3aed', border: '1.5px solid #7c3aed', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              طلب إعادة الامتحان
            </button>
          )}
        </div>
        {showRetakeModal && (
          <RetakeModal
            onConfirm={handleRequestRetake}
            onCancel={() => setShowRetakeModal(false)}
            loading={retakeLoading}
          />
        )}
      </div>
    );
  }

  const topBarBg = isDanger ? '#dc2626' : isWarning ? '#f59e0b' : '#fff';
  const topBarColor = isDanger || isWarning ? '#fff' : '#111827';

  return (
    <div style={{ width: '100%', minHeight: '100%', background: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, borderBottom: '1px solid #e5e7eb', background: topBarBg, transition: 'background 0.3s' }}>
        <div style={{ padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: topBarColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</h1>
              <p style={{ fontSize: 12, color: isDanger || isWarning ? 'rgba(255,255,255,0.8)' : '#9ca3af', margin: '2px 0 0' }}>
                نموذج {model} · السؤال {currentIdx + 1} من {questions.length}
                {exam.classIds && exam.classIds.length > 0 && (
                  <span style={{ marginRight: 8 }}>· {exam.classIds.join('، ')}</span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: isDanger || isWarning ? 'rgba(255,255,255,0.2)' : '#f3f4f6', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: isDanger || isWarning ? '#fff' : '#111827' }}>
              <Clock size={18} color={isDanger || isWarning ? '#fff' : '#374151'} />
              {formatTime(remaining)}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar answered={answeredCount} total={questions.length} />
          </div>
        </div>
      </div>

      {/* Auto-save */}
      <div style={{ padding: '8px 24px 0' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'left', margin: 0 }}>
          {saving ? '⟳ جاري الحفظ التلقائي...' : lastSaved ? `✓ محفوظ ${lastSaved.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: '24px' }}>
        {currentQ && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Question header */}
            <div style={{ padding: '16px 24px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>السؤال {currentIdx + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const typeMap: Record<string, { label: string; bg: string; color: string }> = {
                    multiple_choice: { label: 'اختيار من متعدد', bg: '#dbeafe', color: '#1d4ed8' },
                    true_false:      { label: 'صح / خطأ',        bg: '#d1fae5', color: '#065f46' },
                    fill_blank:      { label: 'أكمل الفراغ',     bg: '#fef3c7', color: '#b45309' },
                    compare:         { label: 'مقارنة',           bg: '#ede9fe', color: '#6d28d9' },
                    short_answer:    { label: 'إجابة قصيرة',     bg: '#fce7f3', color: '#be185d' },
                    essay:           { label: 'مقال',             bg: '#f3f4f6', color: '#374151' },
                  };
                  const t = typeMap[currentQ.type] || { label: currentQ.type, bg: '#f3f4f6', color: '#374151' };
                  return <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: t.bg, color: t.color, fontWeight: 600 }}>{t.label}</span>;
                })()}
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{currentQ.score} درجة</span>
              </div>
            </div>

            {/* Question body */}
            <div style={{ padding: '24px' }}>
              {currentQ.imageURL && (
                <img src={currentQ.imageURL} alt="صورة السؤال" style={{ width: '100%', maxHeight: 256, objectFit: 'contain', borderRadius: 12, marginBottom: 16, border: '1px solid #f3f4f6' }} />
              )}
              <p style={{ fontSize: 15, color: '#111827', lineHeight: 1.8, marginBottom: 24, fontWeight: 600 }}>{currentQ.text}</p>

              {/* Options / Answer Input — حسب نوع السؤال */}
              {(currentQ.type === 'multiple_choice') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(currentQ.id, opt)}
                        style={{
                          width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 16px', borderRadius: 14,
                          border: `2px solid ${isSelected ? '#4f46e5' : '#e5e7eb'}`,
                          background: isSelected ? '#eef2ff' : '#fff',
                          color: isSelected ? '#3730a3' : '#374151',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isSelected ? '#4f46e5' : '#f3f4f6', color: isSelected ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
                          {letters[optIdx] || optIdx + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{opt}</span>
                        {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'true_false' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  {['صح', 'خطأ'].map(opt => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(currentQ.id, opt)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '14px 0', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                          border: `2px solid ${isSelected ? (opt === 'صح' ? '#059669' : '#dc2626') : '#e5e7eb'}`,
                          background: isSelected ? (opt === 'صح' ? '#d1fae5' : '#fee2e2') : '#fff',
                          color: isSelected ? (opt === 'صح' ? '#065f46' : '#991b1b') : '#374151',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt === 'صح' ? '✓' : '✗'}</span> {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {(currentQ.type === 'fill_blank' || currentQ.type === 'short_answer' || currentQ.type === 'compare' || currentQ.type === 'essay') && (
                <div>
                  {currentQ.type === 'compare' && currentQ.options && currentQ.options.length >= 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {currentQ.options.slice(0, 2).map((opt, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#f5f3ff', borderRadius: 10, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#6d28d9' }}>{opt}</div>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={answers[currentQ.id] || ''}
                    onChange={e => handleAnswer(currentQ.id, e.target.value)}
                    placeholder={
                      currentQ.type === 'fill_blank' ? 'أكمل الفراغ هنا...' :
                      currentQ.type === 'compare' ? 'اكتب المقارنة هنا...' :
                      currentQ.type === 'essay' ? 'اكتب إجابتك المفصلة هنا...' :
                      'اكتب إجابتك القصيرة هنا...'
                    }
                    style={{
                      width: '100%',
                      minHeight: currentQ.type === 'essay' ? 140 : currentQ.type === 'compare' ? 110 : 80,
                      padding: '12px 14px',
                      border: `2px solid ${answers[currentQ.id] ? '#4f46e5' : '#e5e7eb'}`,
                      borderRadius: 12, fontSize: 14, fontFamily: 'Cairo, sans-serif',
                      color: '#111827', background: answers[currentQ.id] ? '#eef2ff' : '#fff',
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box', direction: 'rtl',
                    }}
                  />
                  {answers[currentQ.id] && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'left' }}>✓ تم كتابة الإجابة</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.4 : 1 }}
          >
            <ChevronRight size={16} /> السابق
          </button>

          {/* Question dots */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                style={{
                  width: 28, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: i === currentIdx ? '#4f46e5' : answers[q.id] ? '#059669' : '#fff',
                  color: i === currentIdx || answers[q.id] ? '#fff' : '#6b7280',
                  boxShadow: i === currentIdx ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
                  outline: i !== currentIdx && !answers[q.id] ? '1px solid #d1d5db' : 'none',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', cursor: 'pointer' }}
            >
              التالي <ChevronLeft size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              <Send size={15} /> تسليم الامتحان
            </button>
          )}
        </div>

        {/* Warning unanswered */}
        {unansweredIndices.length > 0 && currentIdx === questions.length - 1 && (
          <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: '#b45309', margin: 0 }}>
              لم تجب على {unansweredIndices.length} سؤال: {unansweredIndices.map(n => `سؤال ${n}`).join('، ')}
            </p>
          </div>
        )}

        {/* Submit button */}
        <div style={{ marginTop: 24, paddingBottom: 32 }}>
          <button
            onClick={handleSubmitClick}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}
          >
            <Send size={16} />
            تسليم الامتحان
            {unansweredIndices.length > 0 && (
              <span style={{ background: '#f59e0b', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                {unansweredIndices.length} غير مجاب
              </span>
            )}
          </button>
        </div>
      </div>

      {showSubmitModal && (
        <SubmitModal
          unanswered={unansweredIndices}
          totalQuestions={questions.length}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}
