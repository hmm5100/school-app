// src/pages/AdminExamReview.tsx
// صفحة مراجعة حل طالب معين — للأدمن والمدرس فقط
// المسار: /exams/:id/review/:studentId

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, Award, User } from 'lucide-react';
import { getExamById, getStudentAnswers } from '../services/examService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Exam, Question } from '../types';

// ─── حساب درجة سؤال (نفس المنطق المستخدم في examService) ───
function calcQuestionScore(q: Question, studentAnswer: string | string[] | undefined): number {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return 0;
  if (q.type === 'multiple_choice' || q.type === 'true_false') {
    return studentAnswer === q.correctAnswer ? q.score : 0;
  }
  if (q.type === 'fill_blank' || q.type === 'short_answer') {
    const c = (q.correctAnswer as string || '').trim().toLowerCase();
    const s = (studentAnswer as string || '').trim().toLowerCase();
    return s && s === c ? q.score : 0;
  }
  if (q.type === 'compare') {
    if (Array.isArray(studentAnswer) && q.correctAnswer) {
      let correctArr: string[] = [];
      try { correctArr = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : (q.correctAnswer as unknown as string[]); }
      catch { correctArr = (q.correctAnswer as string).split('|'); }
      const totalParts   = correctArr.length;
      const correctParts = (studentAnswer as string[]).filter(
        (a, i) => (a || '').trim().toLowerCase() === (correctArr[i] || '').trim().toLowerCase()
      ).length;
      return totalParts > 0 ? Math.round((correctParts / totalParts) * q.score) : 0;
    }
    return 0;
  }
  return 0;
}

// ─── Question Card ────────────────────────────────
function QuestionCard({ question, index, studentAnswer }: {
  question: Question;
  index: number;
  studentAnswer: string | string[] | undefined;
}) {
  const correct = question.correctAnswer;
  const earnedScore = calcQuestionScore(question, studentAnswer);
  const isCorrect = earnedScore > 0;

  const correctStr = Array.isArray(correct) ? correct.join(' / ') : correct;
  const studentStr = studentAnswer
    ? (Array.isArray(studentAnswer) ? studentAnswer.join(' / ') : studentAnswer)
    : null;

  const letters     = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  const borderColor = !studentAnswer ? '#d1d5db' : isCorrect ? '#059669' : '#dc2626';
  const headerBg    = !studentAnswer ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff5f5';

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', background: headerBg, borderBottom: `1px solid ${borderColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>السؤال {index + 1}</span>
          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: '#f3f4f6', color: '#374151' }}>
            {question.type === 'multiple_choice' ? 'اختيار من متعدد'
            : question.type === 'true_false'      ? 'صح / خطأ'
            : question.type === 'fill_blank'      ? 'أكمل الفراغ'
            : question.type === 'compare'         ? 'مقارنة'
            : question.type === 'short_answer'    ? 'إجابة قصيرة'
            : 'مقالي'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{earnedScore}/{question.score} درجة</span>
          {!studentAnswer ? (
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>لم يجب</span>
          ) : isCorrect ? (
            <CheckCircle2 size={20} color="#059669" />
          ) : (
            <XCircle size={20} color="#dc2626" />
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 20 }}>
        {question.imageURL && (
          <img src={question.imageURL} alt="صورة السؤال"
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, marginBottom: 14, border: '1px solid #f3f4f6' }} />
        )}
        <p style={{ fontSize: 15, color: '#111827', fontWeight: 600, lineHeight: 1.8, marginBottom: 16 }}>{question.text}</p>

        {/* Options */}
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
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: isRightAnswer ? '#059669' : isStudentPick ? '#dc2626' : '#e5e7eb', color: (isRightAnswer || isStudentPick) ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {letters[i] || i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, color, fontWeight: (isRightAnswer || isStudentPick) ? 600 : 400 }}>{opt}</span>
                  {isRightAnswer  && <CheckCircle2 size={16} color="#059669" />}
                  {isStudentPick && !isRightAnswer && <XCircle size={16} color="#dc2626" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>إجابة الطالب</p>
            <div style={{ padding: '8px 12px', borderRadius: 10, background: !studentAnswer ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff5f5', border: `1px solid ${!studentAnswer ? '#e5e7eb' : isCorrect ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, color: !studentAnswer ? '#9ca3af' : isCorrect ? '#065f46' : '#991b1b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {!studentAnswer
                ? <span>لم يجب على هذا السؤال</span>
                : <>{isCorrect ? <CheckCircle2 size={14} color="#059669" /> : <XCircle size={14} color="#dc2626" />}{studentStr}</>
              }
            </div>
          </div>
          {!isCorrect && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>الإجابة الصحيحة</p>
              <div style={{ padding: '8px 12px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color="#059669" /> {correctStr}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────
export default function AdminExamReview() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>();
  const navigate = useNavigate();

  const [exam, setExam]               = useState<Exam | null>(null);
  const [answers, setAnswers]         = useState<Record<string, string | string[]>>({});
  const [savedScore, setSavedScore]   = useState<number | undefined>(undefined);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!id || !studentId) return;
    Promise.all([
      getExamById(id),
      getStudentAnswers(id, studentId),
      getDoc(doc(db, 'students', studentId)),
    ]).then(([e, sa, studentSnap]) => {
      setExam(e);
      if (sa?.answers) setAnswers(sa.answers);
      if (sa?.score !== undefined) setSavedScore(sa.score);
      if (studentSnap.exists()) {
        setStudentName(studentSnap.data()?.name || studentId);
      } else {
        setStudentName(sa?.studentName || studentId);
      }
      setLoading(false);
    });
  }, [id, studentId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>جاري التحميل...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>الامتحان غير موجود</p>
          <button onClick={() => navigate(`/exams/${id}/results`)} style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            رجوع للنتائج
          </button>
        </div>
      </div>
    );
  }

  const localScore  = exam.questions.reduce((acc, q) => acc + calcQuestionScore(q, answers[q.id]), 0);
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
          <button onClick={() => navigate(`/exams/${id}/results`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            <ArrowRight size={15} /> النتائج
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>مراجعة حل الطالب</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{exam.title}</p>
          </div>
          <BookOpen size={22} color="#4f46e5" />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Student Info */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 20, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={22} color="#4f46e5" />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>الطالب</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>{studentName}</p>
          </div>
        </div>

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
                <span style={{ padding: '4px 14px', borderRadius: 99, background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600 }}>{earnedScore} / {exam.totalScore} درجة</span>
                <span style={{ padding: '4px 14px', borderRadius: 99, background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600 }}>{correctCount} صح من {exam.questions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {exam.questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} studentAnswer={answers[q.id]} />
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={() => navigate(`/exams/${id}/results`)}
            style={{ padding: '12px 32px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            العودة للنتائج
          </button>
        </div>
      </div>
    </div>
  );
}
