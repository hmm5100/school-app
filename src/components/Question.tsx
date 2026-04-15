// src/components/Question.tsx
// مكون عرض السؤال — يدعم جميع الأنواع الستة

import { CheckCircle2, AlignLeft, GitCompare } from 'lucide-react';
import type { Question } from '../types';

interface QuestionProps {
  question: Question;
  questionNumber: number;
  selectedAnswer?: string;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

// ──────────────────────────────────────────────
// Badge label + color لكل نوع سؤال
// ──────────────────────────────────────────────
function getTypeMeta(type: Question['type']): { label: string; bg: string; color: string } {
  switch (type) {
    case 'multiple_choice': return { label: 'اختيار من متعدد', bg: '#dbeafe', color: '#1d4ed8' };
    case 'true_false':      return { label: 'صح / خطأ',        bg: '#d1fae5', color: '#065f46' };
    case 'fill_blank':      return { label: 'أكمل الفراغ',     bg: '#fef3c7', color: '#b45309' };
    case 'compare':         return { label: 'مقارنة',           bg: '#ede9fe', color: '#6d28d9' };
    case 'short_answer':    return { label: 'إجابة قصيرة',     bg: '#fce7f3', color: '#be185d' };
    case 'essay':           return { label: 'مقال',             bg: '#f3f4f6', color: '#374151' };
    default:                return { label: type,               bg: '#f3f4f6', color: '#374151' };
  }
}

export default function Question({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
}: QuestionProps) {
  const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  const { label, bg, color } = getTypeMeta(question.type);

  const textAreaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: question.type === 'essay' ? 140 : 80,
    padding: '12px 14px',
    border: `2px solid ${selectedAnswer ? '#4f46e5' : '#e5e7eb'}`,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'Cairo, sans-serif',
    color: '#111827',
    background: selectedAnswer ? '#eef2ff' : '#fff',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    direction: 'rtl',
    transition: 'border-color 0.2s',
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.7 : 1,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">السؤال {questionNumber}</span>
          <div className="flex items-center gap-2">
            <span
              style={{ background: bg, color }}
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
            >
              {label}
            </span>
            <span className="text-xs text-gray-400">{question.score} درجة</span>
          </div>
        </div>
      </div>

      {/* Question body */}
      <div className="px-6 py-6">
        {/* Image */}
        {question.imageURL && (
          <img
            src={question.imageURL}
            alt="صورة السؤال"
            className="w-full max-h-64 object-contain rounded-xl mb-4 border border-gray-100"
          />
        )}

        {/* Text */}
        <p className="text-gray-800 text-base leading-relaxed mb-6 font-medium">
          {question.text}
        </p>

        {/* ═══════════════════════════════
            MULTIPLE CHOICE
        ═══════════════════════════════ */}
        {question.type === 'multiple_choice' && (
          <div className="space-y-3">
            {(question.options || []).map((opt, optIdx) => {
              const isSelected = selectedAnswer === opt;
              return (
                <button
                  key={optIdx}
                  onClick={() => !disabled && onSelectAnswer(opt)}
                  disabled={disabled}
                  className={`w-full text-right flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {letters[optIdx] || optIdx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{opt}</span>
                  {isSelected && <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════
            TRUE / FALSE
        ═══════════════════════════════ */}
        {question.type === 'true_false' && (
          <div className="flex gap-3">
            {['صح', 'خطأ'].map((opt) => {
              const isSelected = selectedAnswer === opt;
              return (
                <button
                  key={opt}
                  onClick={() => !disabled && onSelectAnswer(opt)}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    isSelected
                      ? opt === 'صح'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <span style={{ fontSize: 18 }}>{opt === 'صح' ? '✓' : '✗'}</span>
                  {opt}
                  {isSelected && <CheckCircle2 size={16} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════
            FILL IN THE BLANK
        ═══════════════════════════════ */}
        {question.type === 'fill_blank' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlignLeft size={15} color="#b45309" />
              <span style={{ fontSize: 13, color: '#b45309', fontWeight: 700 }}>اكتب إجابتك في الفراغ</span>
            </div>
            <textarea
              value={selectedAnswer || ''}
              onChange={e => !disabled && onSelectAnswer(e.target.value)}
              disabled={disabled}
              placeholder="اكتب إجابتك هنا..."
              style={textAreaStyle}
              rows={3}
            />
            {selectedAnswer && (
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'left' }}>
                ✓ تم كتابة الإجابة
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════
            COMPARE (مقارنة)
        ═══════════════════════════════ */}
        {question.type === 'compare' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <GitCompare size={15} color="#6d28d9" />
              <span style={{ fontSize: 13, color: '#6d28d9', fontWeight: 700 }}>اكتب المقارنة بين العناصر</span>
            </div>
            {/* If we have options treat them as column headers */}
            {question.options && question.options.length >= 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {question.options.slice(0, 2).map((opt, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#f5f3ff', borderRadius: 10, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#6d28d9' }}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={selectedAnswer || ''}
              onChange={e => !disabled && onSelectAnswer(e.target.value)}
              disabled={disabled}
              placeholder="اكتب المقارنة بين العناصر هنا... (يمكنك استخدام نقاط أو جدول نصي)"
              style={{ ...textAreaStyle, minHeight: 110 }}
              rows={4}
            />
            {selectedAnswer && (
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'left' }}>
                ✓ تم كتابة الإجابة
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════
            SHORT ANSWER
        ═══════════════════════════════ */}
        {question.type === 'short_answer' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlignLeft size={15} color="#be185d" />
              <span style={{ fontSize: 13, color: '#be185d', fontWeight: 700 }}>إجابة قصيرة</span>
            </div>
            <textarea
              value={selectedAnswer || ''}
              onChange={e => !disabled && onSelectAnswer(e.target.value)}
              disabled={disabled}
              placeholder="اكتب إجابتك القصيرة هنا..."
              style={textAreaStyle}
              rows={3}
            />
          </div>
        )}

        {/* ═══════════════════════════════
            ESSAY
        ═══════════════════════════════ */}
        {question.type === 'essay' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlignLeft size={15} color="#374151" />
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>إجابة مقالية</span>
            </div>
            <textarea
              value={selectedAnswer || ''}
              onChange={e => !disabled && onSelectAnswer(e.target.value)}
              disabled={disabled}
              placeholder="اكتب إجابتك المفصلة هنا..."
              style={{ ...textAreaStyle, minHeight: 160 }}
              rows={6}
            />
            {selectedAnswer && (
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'left' }}>
                {selectedAnswer.trim().split(/\s+/).length} كلمة
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
