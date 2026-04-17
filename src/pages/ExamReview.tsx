// src/pages/ExamReview.tsx
// مراجعة حل الامتحان — تعرض إجابات الطالب مقارنة بالإجابات الصحيحة
// الدرجة تُقرأ من Firebase أولاً (autoGraded) ثم تُحسب محلياً احتياطياً

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getExamById, getStudentAnswers } from '../services/examService';
import type { Exam, Question } from '../types';

// ─── Score Badge ───────────────────────────────
function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  const bg    = pct >= 80 ? '#d1fae5' : pct >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <span style={{ padding: '3px 12px', borderRadius: 99, background: bg, color, fontSize: 13, fontWeight: 700 }}>
      {score}/{total}
    </span>
  );
}

// ─── حساب درجة سؤال واحد (نفس منطق examService.ts تماماً) ───
function calcQuestionScore(q: Question, studentAnswer: string | string[] | undefined): number {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return 0;

  if (q.type === 'multiple_choice' || q.type === 'true_false') {
    return studentAnswer === q.correctAnswer ? q.score : 0;

  } else if (q.type === 'fill_blank') {
    const correct = (q.correctAnswer as string || '').trim().toLowerCase();
    const given   = (studentAnswer as string || '').trim().toLowerCase();
    return given && given === correct ? q.score : 0;

  } else if (q.type === 'compare') {
    if (Array.isArray(studentAnswer) && q.correctAnswer) {
      let correctAnswers: string[] = [];
      try {
        correctAnswers = typeof q.correctAnswer === 'string'
          ? JSON.parse(q.correctAnswer)
          : (q.correctAnswer as unknown as string[]);
      } catch {
        correctAnswers = (q.correctAnswer as string).split('|');
      }
      const totalParts   = correctAnswers.length;
      const correctParts = (studentAnswer as string[]).filter(
        (ans, i) => (ans || '').trim().toLowerCase() === (correctAnswers[i] || '').trim().toLowerCase()
      ).length;
      return totalParts > 0 ? Math.round((correctParts / totalParts) * q.score) : 0;

    }
    return 0;

  } else if (q.type === 'short_answer') {
    if (q.correctAnswer) {
      const correct = (q.correctAnswer as string).trim().toLowerCase();
      const given   = (studentAnswer as string || '').trim().toLowerCase();
      return given && given === correct ? q.score : 0;
    }
    return 0; // يدوي
  }

  return 0; // essay — يدوي فقط
}

// ─── Question Card ──────────────────────────────
function QuestionCard({
  question,
  index,
  studentAnswer,
}: {
  question: Question;
  index: number;
  studentAnswer: string | string[] | undefined;
}) {
  const correct = question.correctAnswer;

  // هل الإجابة صح؟
  const isCorrect = (() => {
    if (!studentAnswer && studentAnswer !== '') return false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      return studentAnswer === correct;
    }
    if (question.type === 'fill_blank' || question.type === 'short_answer') {
      const c = (correct as string || '').trim().toLowerCase();
      const s = (studentAnswer as string || '').trim().toLowerCase();
      return !!s && s === c;
    }
    if (question.type === 'compare') {
      if (Array.isArray(studentAnswer) && correct) {
        let correctArr: string[] = [];
        try { correctArr = typeof correct === 'string' ? JSON.parse(correct) : (correct as unknown as string[]); }
        catch { correctArr = (correct as string).split('|'); }
        return (studentAnswer as string[]).every(
          (a, i) => (a || '').trim().toLowerCase() === (correctArr[i] || '').trim().toLowerCase()
        );
      }
      return false;
    }
    return false;
  })();

  const correctStr = Array.isArray(correct) ? correct.join(' / ') : correct;
  const studentStr = studentAnswer
    ? (Array.isArray(studentAnswer) ? studentAnswer.join(' / ') : studentAnswer)
    : null;

  const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  const earnedScore = calcQuestionScore(question, studentAnswer);

  const borderColor = !studentAnswer ? '#d1d5db' : isCorrect ? '#059669' : '#dc2626';
  const headerBg    = !studentAnswer ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff5f5';

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* Header */}
      <div style={{ padding: '12px 20px', background: headerBg, borderBottom: `1px solid ${borderColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>السؤال {index + 1}</span>
          <span style={{
            fontSize: 11, padding: '2px 10px', borderRadius: 99,
            background: question.type === 'multiple_choice' ? '#dbeafe' :
                        question.type === 'true_false'       ? '#fce7f3' :
                        question.type === 'fill_blank'       ? '#fef3c7' :
                        question.type === 'compare'          ? '#ede9fe' : '#f3f4f6',
            color:      question.type === 'multiple_choice' ? '#1d4ed8' :
                        question.type === 'true_false'       ? '#be185d' :
                        question.type === 'fill_blank'       ? '#b45309' :
                        question.type === 'compare'          ? '#7c3aed' : '#374151',
          }}>
            {question.type === 'multiple_choice' ? 'اختيار من متعدد'
            : question.type === 'true_false'      ? 'صح / خطأ'
            : question.type === 'fill_blank'      ? 'أكمل الفراغ'
            : question.type === 'compare'         ? 'مقارنة'
            : question.type === 'short_answer'    ? 'إجابة قصيرة'
            : 'مقالي'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {earnedScore}/{question.score} درجة
          </span>
          {!studentAnswer ? (
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>لم تجب</span>
          ) : isCorrect ? (
            <CheckCircle2 size={20} color="#059669" />
          ) : (
            <XCircle size={20} color="#dc2626" />
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {question.imageURL && (
          <img src={question.imageURL} alt="صورة السؤال"
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, marginBottom: 14, border: '1px solid #f3f4f6' }}
          />
        )}
        <p style={{ fontSize: 15, color: '#111827', fontWeight: 600, lineHeight: 1.8, marginBottom: 16 }}>
          {question.text}
        </p>

        {/* اختيار من متعدد / صح أو خطأ */}
        {question.options && question.options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {question.options.map((opt, i) => {
              const isStudentPick = studentStr === opt;
              const isRightAnswer = correctStr === opt;
              const bg     = isRightAnswer ? '#f0fdf4' : isStudentPick ? '#fff5f5' : '#f9fafb';
              const border = isRightAnswer ? '#059669'  : isStudentPick ? '#dc2626'  : '#e5e7eb';
              const color  = isRightAnswer ? '#065f46'  : isStudentPick ? '#991b1b'  : '#374151';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${border}`, background: bg }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: isRightAnswer ? '#059669' : isStudentPick ? '#dc2626' : '#e5e7eb', color: isRightAnswer || isStudentPick ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {letters[i] || i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, color, fontWeight: isRightAnswer || isStudentPick ? 600 : 400 }}>{opt}</span>
                  {isRightAnswer  && <CheckCircle2 size={16} color="#059669" />}
                  {isStudentPick && !isRightAnswer && <XCircle size={16} color="#dc2626" />}
                </div>
              );
            })}
          </div>
        )}

        {/* ملخص الإجابة */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>إجابتك</p>
            <div style={{ padding: '8px 12px', borderRadius: 10, background: !studentAnswer ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff5f5', border: `1px solid ${!studentAnswer ? '#e5e7eb' : isCorrect ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, color: !studentAnswer ? '#9ca3af' : isCorrect ? '#065f46' : '#991b1b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {!studentAnswer ? (
                <span>لم تجب على هذا السؤال</span>
              ) : (
                <>
                  {isCorrect ? <CheckCircle2 size={14} color="#059669" /> : <XCircle size={14} color="#dc2626" />}
                  {studentStr}
                </>
              )}
            </div>
          </div>

          {!isCorrect && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>الإجابة الصحيحة</p>
              <div style={{ padding: '8px 12px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color="#059669" />
                {correctStr}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────
export default function ExamReview() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { studentProfile, userProfile } = useAuth();

  const [exam, setExam]       = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [savedScore, setSavedScore] = useState<number | undefined>(undefined); // الدرجة من Firebase
  const [loading, setLoading] = useState(true);

  // studentId — يدعم حالة الطالب والمعلم (لو المعلم يراجع)
  const studentId = studentProfile?.id || userProfile?.id || '';

  useEffect(() => {
    if (!id || !studentId) return;
    Promise.all([
      getExamById(id),
      getStudentAnswers(id, studentId),
    ]).then(([e, sa]) => {
      setExam(e);
      if (sa?.answers)  setAnswers(sa.answers);
      if (sa?.score !== undefined) setSavedScore(sa.score); // ✅ الدرجة المحفوظة من Firebase
      setLoading(false);
    });
  }, [id, studentId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#6b7280' }}>جاري تحميل المراجعة...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 16 }}>الامتحان غير موجود</p>
          <button onClick={() => navigate('/exams')} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            العودة للامتحانات
          </button>
        </div>
      </div>
    );
  }

  // ── الدرجة: من Firebase أولاً، ثم حساب محلي احتياطي ──
  const localScore = exam.questions.reduce((acc, q) => acc + calcQuestionScore(q, answers[q.id]), 0);
  const earnedScore = savedScore !== undefined ? savedScore : localScore;

  const correctCount = exam.questions.filter(q => calcQuestionScore(q, answers[q.id]) > 0).length;
  const pct      = exam.totalScore > 0 ? Math.round((earnedScore / exam.totalScore) * 100) : 0;
  const pctColor = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  const pctBg    = pct >= 80 ? '#d1fae5' : pct >= 50 ? '#fef3c7' : '#fee2e2';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Cairo, sans-serif' }} dir="rtl">

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/exams')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <ArrowRight size={15} /> رجوع
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>مراجعة الحل</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{exam.title}</p>
          </div>
          <BookOpen size={22} color="#4f46e5" />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: pctBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Award size={28} color={pctColor} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>{exam.subjectName}</p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>{exam.title}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ padding: '4px 14px', borderRadius: 99, background: pctBg, color: pctColor, fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                <ScoreBadge score={earnedScore} total={exam.totalScore} />
                <span style={{ padding: '4px 14px', borderRadius: 99, background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600 }}>
                  {correctCount} صح من {exam.questions.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { color: '#059669', bg: '#f0fdf4', border: '#059669', label: 'إجابة صحيحة' },
            { color: '#dc2626', bg: '#fff5f5', border: '#dc2626', label: 'إجابة خاطئة' },
            { color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', label: 'لم تجب' },
          ].map(({ color, bg, border, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: `2px solid ${border}` }} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {exam.questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} studentAnswer={answers[q.id]} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={() => navigate('/exams')} style={{ padding: '12px 32px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            العودة للامتحانات
          </button>
        </div>
      </div>
    </div>
  );
}
