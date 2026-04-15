// src/pages/CreateExam.tsx
// إنشاء امتحان جديد — مع رفع Word بدل txt + إرفاق صورة لكل سؤال

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createExam,
  publishExam,
  getQuestionBank,
  generateQuestionId,
  type BankQuestion,
} from '../services/examService';
import { getAllSubjects } from '../services/materialService';
import type { Question, Subject } from '../types';
import { ProtectedPage } from '../components/ProtectedAction';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'compare';

interface DraftQuestion extends Question {
  isExpanded: boolean;
  blanks?: string[];          // إجابات أكمل الفراغ
  compareData?: { right: string; left: string }[]; // بيانات المقارنة
}

// نوع السؤال المُستخرج من Word
interface WordParsedQuestion {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  score: number;
  imageDataUrl?: string;      // صورة مضمّنة من الورد
  blanks?: string[];          // إجابات أكمل الفراغ
  compareData?: { right: string; left: string }[]; // بيانات المقارنة
}

const CLASSES = [
  { id: '1/1_بنين',  label: '1/1 بنين'  },
  { id: '1/1_فتيات', label: '1/1 فتيات' },
  { id: '1/2_بنين',  label: '1/2 بنين'  },
  { id: '1/2_فتيات', label: '1/2 فتيات' },
  { id: '1/3_بنين',  label: '1/3 بنين'  },
  { id: '1/3_فتيات', label: '1/3 فتيات' },
  { id: '1/4_بنين',  label: '1/4 بنين'  },
  { id: '1/4_فتيات', label: '1/4 فتيات' },
  { id: '1/5_بنين',  label: '1/5 بنين'  },
  { id: '1/5_فتيات', label: '1/5 فتيات' },
  { id: '1/6_بنين',  label: '1/6 بنين'  },
  { id: '1/6_فتيات', label: '1/6 فتيات' },
  { id: '1/7_بنين',  label: '1/7 بنين'  },
  { id: '1/8_بنين',  label: '1/8 بنين'  },
];

function blankQuestion(type: QuestionType, order: number): DraftQuestion {
  return {
    id: generateQuestionId(),
    type,
    text: '',
    options: type === 'multiple_choice' ? ['', '', '', ''] : type === 'true_false' ? ['صح', 'خطأ'] : [],
    correctAnswer: type === 'true_false' ? 'صح' : '',
    score: 5,
    order,
    isExpanded: true,
    blanks: type === 'fill_blank' ? [''] : undefined,
    compareData: type === 'compare' ? [{ right: '', left: '' }, { right: '', left: '' }] : undefined,
  };
}

// ─── ألوان Word المعترفة كـ "أخضر" ───────────
const GREEN_HEX = ['00B050','00FF00','70AD47','548235','375623','92D050','008000','00b050','70ad47'];
function isGreenColor(hex: string): boolean {
  const c = hex.replace('#','').toUpperCase();
  return GREEN_HEX.some(g => c === g.toUpperCase() || c.includes(g.toUpperCase()));
}

// ─── تحميل mammoth من CDN إذا مش متحمّل ──────
async function loadMammoth(): Promise<{ convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }> {
  // لو mammoth موجود كـ npm package استخدمه
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = await (Function('return import("mammoth")')() as Promise<any>);
    if (m?.convertToHtml) return m;
  } catch { /* سنجرب CDN */ }

  // لو مش موجود كـ npm، نحمّله من CDN
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).mammoth) return (window as any).mammoth;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('فشل تحميل مكتبة mammoth'));
    document.head.appendChild(s);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).mammoth;
}

// ─── قراءة ملف Word واستخراج الأسئلة (كل الأنواع + صور) ──
async function parseWordQuestions(file: File): Promise<WordParsedQuestion[]> {
  const mammoth = await loadMammoth();
  const buffer = await file.arrayBuffer();

  // استخراج HTML مع الصور كـ base64
  const { value: html } = await (mammoth as any).convertToHtml(
    { arrayBuffer: buffer },
    { convertImage: (mammoth as any).images?.imgElement
        ? (mammoth as any).images.imgElement((image: any) =>
            image.read('base64').then((b64: string) => ({
              src: `data:${image.contentType};base64,${b64}`,
            }))
          )
        : undefined,
    }
  );

  const dom = new DOMParser().parseFromString(html, 'text/html');
  const paras = Array.from(dom.querySelectorAll('p, table'));

  const questions: WordParsedQuestion[] = [];
  let curText = '';
  let curType: QuestionType = 'multiple_choice';
  let opts: Array<{ text: string; correct: boolean }> = [];
  let curImage: string | undefined;
  let pendingImage: string | undefined; // صورة قبل السؤال

  const flush = () => {
    if (!curText) return;

    // ── أكمل الفراغ ──
    if (curType === 'fill_blank') {
      questions.push({
        type: 'fill_blank',
        text: curText,
        options: [],
        correctAnswer: '',
        score: 1,
        blanks: opts.map(o => o.text),
        imageDataUrl: curImage,
      });
      curText = ''; opts = []; curImage = undefined;
      return;
    }

    if (opts.length < 2) { curText = ''; opts = []; curImage = undefined; return; }

    const cleanOpts = opts.map(o =>
      o.text.replace(/✔|✓|\[correct\]|\[صح\]|\[صواب\]/gi, '').trim()
    );
    const correctIdx = opts.findIndex(o => o.correct);
    const correctAnswer = correctIdx >= 0 ? cleanOpts[correctIdx] : cleanOpts[0];
    const isTF =
      cleanOpts.length === 2 &&
      cleanOpts.every(o => /^(صح|خطأ|صواب|خطا|true|false)$/i.test(o.trim()));

    questions.push({
      type: isTF ? 'true_false' : 'multiple_choice',
      text: curText,
      options: cleanOpts,
      correctAnswer,
      score: 1,
      imageDataUrl: curImage,
    });
    curText = ''; opts = []; curImage = undefined;
  };

  for (const el of paras) {
    // ── جدول = سؤال مقارنة ──────────────────────
    if (el.tagName === 'TABLE') {
      flush();
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length < 2) continue;

      // الصف الأول = عناوين الجدول (نص السؤال)
      const headers = Array.from(rows[0].querySelectorAll('th,td')).map(c => c.textContent?.trim() || '');
      const compareData: { right: string; left: string }[] = [];

      for (let r = 1; r < rows.length; r++) {
        const cells = Array.from(rows[r].querySelectorAll('td,th')).map(c => c.textContent?.trim() || '');
        if (cells.length >= 2) {
          compareData.push({ right: cells[0], left: cells[1] });
        }
      }

      if (compareData.length > 0) {
        questions.push({
          type: 'compare',
          text: headers.join(' | ') || 'مقارنة',
          options: [],
          correctAnswer: '',
          score: 1,
          compareData,
          imageDataUrl: pendingImage,
        });
        pendingImage = undefined;
      }
      continue;
    }

    // ── فقرة عادية ──────────────────────────────
    const raw = el.textContent?.trim() || '';

    // استخراج صورة من الفقرة
    const imgEl = el.querySelector('img');
    if (imgEl?.src) {
      pendingImage = imgEl.src;
      if (!raw) continue; // صورة بدون نص → نحتفظ بها للسؤال القادم
    }

    if (!raw) continue;

    // فحص لون أخضر
    let isGreen = false;
    el.querySelectorAll('[style]').forEach(span => {
      const m = (span.getAttribute('style') || '').match(/color:\s*#?([0-9a-fA-F]{3,6})/i);
      if (m && isGreenColor(m[1])) isGreen = true;
    });

    const hasMarker = /✔|✓|\[correct\]|\[صح\]|\[صواب\]/i.test(raw);
    const isCorrect = isGreen || hasMarker;

    // هل سؤال؟
    const isQuestion =
      /^(س\s*\d+|سؤال\s*\d+|\d+\s*[.)\-]|Q\s*\d+)/i.test(raw) &&
      !/^[أبجدهوزحطيa-d]\s*[).:\-]/i.test(raw);

    // هل خيار؟
    const isOption =
      /^[أبجدهوزحطيa-d]\s*[).:\-]/i.test(raw) || /^[-•*]\s/.test(raw);

    // هل أكمل الفراغ؟ (يحتوي نقاط + إجابة بين قوسين)
    const isFillBlank = /\.{3,}/.test(raw) && /\([^)]+\)/.test(raw);

    // ── صيغة 1: السؤال والإجابة في نفس السطر بين قوسين
    // مثال: س1: القاهرة عاصمة مصر؟ (صح) أو (✔) أو (خطأ) أو (✗)
    const tfInlineMatch = isQuestion &&
      raw.match(/\(\s*(صح|خطأ|صواب|خطا|true|false|✔|✓|✗|×)\s*\)$/i);

    // ── صيغة 2: سطر "الإجابة: صح" بعد السؤال
    const tfAnswerLineMatch = !isQuestion && curText &&
      raw.match(/^(الإجابة|الجواب)\s*[:：]\s*(صح|خطأ|صواب|خطا|true|false|✔|✓|✗|×)\s*$/i);

    // تحويل الرمز إلى نص
    const normalizeTFAnswer = (val: string): string => {
      const v = val.trim();
      if (/^(صح|صواب|true|✔|✓)$/i.test(v)) return 'صح';
      return 'خطأ';
    };

    if (tfInlineMatch) {
      // السؤال + الإجابة في نفس السطر
      flush();
      const answer = normalizeTFAnswer(tfInlineMatch[1]);
      const questionText = raw
        .replace(/^(س\s*\d+|سؤال\s*\d+|\d+\s*[.)\-]|Q\s*\d+)\s*[:.\-]?\s*/i, '')
        .replace(/\(\s*(صح|خطأ|صواب|خطا|true|false|✔|✓|✗|×)\s*\)$/i, '')
        .trim();
      questions.push({
        type: 'true_false',
        text: questionText,
        options: ['صح', 'خطأ'],
        correctAnswer: answer,
        score: 1,
        imageDataUrl: pendingImage,
      });
      pendingImage = undefined;
    } else if (tfAnswerLineMatch) {
      // سطر "الإجابة: صح" بعد السؤال
      flush();
      const answer = normalizeTFAnswer(tfAnswerLineMatch[2]);
      questions.push({
        type: 'true_false',
        text: curText,
        options: ['صح', 'خطأ'],
        correctAnswer: answer,
        score: 1,
        imageDataUrl: curImage,
      });
      curText = ''; opts = []; curImage = undefined;
    } else if (isFillBlank && !isOption) {
      flush();
      // استخرج كل الإجابات بين الأقواس
      const answers: string[] = [];
      const cleanText = raw.replace(/\(([^)]+)\)/g, (_, ans) => {
        answers.push(ans.trim());
        return '(........)';
      });
      curText = cleanText.replace(/^(س\s*\d+|سؤال\s*\d+|\d+\s*[.)\-]|Q\s*\d+)\s*[:.\-]?\s*/i, '').trim();
      curType = 'fill_blank';
      opts = answers.map(a => ({ text: a, correct: true }));
      curImage = pendingImage; pendingImage = undefined;
      flush(); // أكمل الفراغ يُحفظ فوراً
    } else if (isQuestion) {
      flush();
      curType = 'multiple_choice'; // سيُعاد تحديده لاحقاً (TF في flush)
      curText = raw.replace(/^(س\s*\d+|سؤال\s*\d+|\d+\s*[.)\-]|Q\s*\d+)\s*[:.\-]?\s*/i, '').trim();
      curImage = pendingImage; pendingImage = undefined;
    } else if (isOption && curText) {
      opts.push({ text: raw, correct: isCorrect });
    } else if (curText && !isQuestion && raw.length < 200) {
      // سطر تابع للسؤال أو خيار بدون حرف
      opts.push({ text: raw, correct: isCorrect });
    }
  }
  flush();
  return questions;
}

// ─── S = shared style tokens ──────────────────
const S = {
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    color: '#111827',
    boxSizing: 'border-box' as const,
    direction: 'rtl' as const,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    overflow: 'hidden' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};

// ─── QuestionCard ─────────────────────────────
function QuestionCard({
  q, index, onUpdate, onDelete, onToggle,
}: {
  q: DraftQuestion;
  index: number;
  onUpdate: (id: string, u: Partial<DraftQuestion>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  const updateOption = (i: number, val: string) => {
    const opts = [...(q.options || [])];
    opts[i] = val;
    onUpdate(q.id, { options: opts });
  };

  // إرفاق صورة لهذا السؤال تحديداً
  const handleImageForThisQuestion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate(q.id, { imageURL: reader.result as string });
    reader.readAsDataURL(file);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  return (
    <div style={{ ...S.card, marginBottom: 10 }}>
      {/* Header */}
      <div
        onClick={() => onToggle(q.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: '#f9fafb',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#e0e7ff', color: '#4338ca',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {q.text || 'سؤال جديد...'}
        </span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
          background: q.type === 'multiple_choice' ? '#dbeafe' : q.type === 'true_false' ? '#d1fae5' : q.type === 'fill_blank' ? '#fef3c7' : '#f3e8ff',
          color: q.type === 'multiple_choice' ? '#1d4ed8' : q.type === 'true_false' ? '#065f46' : q.type === 'fill_blank' ? '#92400e' : '#6b21a8',
        }}>
          {q.type === 'multiple_choice' ? 'اختيار متعدد' : q.type === 'true_false' ? 'صح / خطأ' : q.type === 'fill_blank' ? 'أكمل الفراغ' : 'مقارنة'}
        </span>
        {q.imageURL && <span style={{ fontSize: 11, color: '#f59e0b' }}>🖼</span>}
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{q.score} درجة</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(q.id); }}
          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4, borderRadius: 6 }}
        >✕</button>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{q.isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Body */}
      {q.isExpanded && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Question text */}
          <div>
            <label style={S.label}>نص السؤال *</label>
            <textarea
              rows={2}
              value={q.text}
              onChange={e => onUpdate(q.id, { text: e.target.value })}
              placeholder="اكتب نص السؤال هنا..."
              style={{ ...S.input, resize: 'none' }}
            />
          </div>

          {/* ── إرفاق صورة لهذا السؤال ── */}
          <div>
            <label style={S.label}>صورة السؤال (اختياري)</label>
            {q.imageURL ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={q.imageURL}
                  alt="صورة السؤال"
                  style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 10, border: '1px solid #e5e7eb', display: 'block' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#374151' }}
                  >تغيير</button>
                  <button
                    onClick={() => onUpdate(q.id, { imageURL: undefined })}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#b91c1c' }}
                  >حذف</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => imgInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px dashed #d1d5db', background: '#fafafa',
                  color: '#6b7280', fontSize: 13, cursor: 'pointer', width: '100%',
                  justifyContent: 'center',
                }}
              >
                🖼 إرفاق صورة لهذا السؤال
              </button>
            )}
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageForThisQuestion}
            />
          </div>

          {/* Score */}
          <div>
            <label style={S.label}>الدرجة</label>
            <input
              type="number" min={1} max={100}
              value={q.score}
              onChange={e => onUpdate(q.id, { score: Number(e.target.value) })}
              style={{ ...S.input, width: 100 }}
            />
          </div>

          {/* Multiple choice options */}
          {q.type === 'multiple_choice' && (
            <div>
              <label style={S.label}>الخيارات * (انقر الدائرة لتحديد الإجابة الصحيحة)</label>
              {(q.options || []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input
                    type="radio"
                    name={`correct_${q.id}`}
                    checked={q.correctAnswer === opt && opt !== ''}
                    onChange={() => opt && onUpdate(q.id, { correctAnswer: opt })}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4f46e5' }}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`الخيار ${i + 1}`}
                    style={{
                      ...S.input, flex: 1,
                      background: q.correctAnswer === opt && opt !== '' ? '#f0fdf4' : '#fff',
                      borderColor: q.correctAnswer === opt && opt !== '' ? '#86efac' : '#d1d5db',
                    }}
                  />
                  {(q.options || []).length > 2 && (
                    <button
                      onClick={() => {
                        const opts = (q.options || []).filter((_, j) => j !== i);
                        onUpdate(q.id, { options: opts, correctAnswer: '' });
                      }}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >✕</button>
                  )}
                </div>
              ))}
              {!q.correctAnswer && (
                <p style={{ fontSize: 12, color: '#d97706', marginTop: 4 }}>⚠ حدد الإجابة الصحيحة</p>
              )}
              {(q.options || []).length < 6 && (
                <button
                  onClick={() => onUpdate(q.id, { options: [...(q.options || []), ''] })}
                  style={{ marginTop: 6, fontSize: 13, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  + إضافة خيار
                </button>
              )}
            </div>
          )}

          {/* True / False */}
          {q.type === 'true_false' && (
            <div>
              <label style={S.label}>الإجابة الصحيحة *</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {['صح', 'خطأ'].map(val => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`tf_${q.id}`}
                      value={val}
                      checked={q.correctAnswer === val}
                      onChange={() => onUpdate(q.id, { correctAnswer: val })}
                      style={{ accentColor: '#4f46e5', width: 16, height: 16 }}
                    />
                    <span style={{
                      fontSize: 13, fontWeight: 500, padding: '4px 14px', borderRadius: 20,
                      background: val === 'صح' ? '#d1fae5' : '#fee2e2',
                      color: val === 'صح' ? '#065f46' : '#991b1b',
                    }}>{val}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* أكمل الفراغ */}
          {q.type === 'fill_blank' && (
            <div>
              <label style={S.label}>الإجابات الصحيحة * (بالترتيب)</label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                💡 اكتب نص السؤال بـ <strong>.........</strong> مكان الفراغات، ثم أضف الإجابة لكل فراغ
              </p>
              {(q.blanks || ['']).map((blank, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280', minWidth: 60 }}>فراغ {i + 1}:</span>
                  <input
                    type="text"
                    value={blank}
                    onChange={e => {
                      const bl = [...(q.blanks || [''])];
                      bl[i] = e.target.value;
                      onUpdate(q.id, { blanks: bl });
                    }}
                    placeholder={`الإجابة ${i + 1}`}
                    style={{ ...S.input, flex: 1, background: '#f0fdf4', borderColor: '#86efac' }}
                  />
                  {(q.blanks || []).length > 1 && (
                    <button
                      onClick={() => onUpdate(q.id, { blanks: (q.blanks || []).filter((_, j) => j !== i) })}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                onClick={() => onUpdate(q.id, { blanks: [...(q.blanks || ['']), ''] })}
                style={{ fontSize: 13, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
              >+ إضافة فراغ</button>
            </div>
          )}

          {/* مقارنة */}
          {q.type === 'compare' && (
            <div>
              <label style={S.label}>بيانات المقارنة *</label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                💡 اكتب العنوانين في نص السؤال بفاصل | مثال: <strong>الخلية النباتية | الخلية الحيوانية</strong>
              </p>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f3f4f6' }}>
                  {(q.text.includes('|') ? q.text.split('|') : ['العمود الأول', 'العمود الثاني']).slice(0, 2).map((h, i) => (
                    <div key={i} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#374151', borderLeft: i === 0 ? '1px solid #e5e7eb' : 'none' }}>{h.trim()}</div>
                  ))}
                </div>
                {(q.compareData || [{ right: '', left: '' }]).map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #f3f4f6' }}>
                    <input
                      type="text" value={row.right} placeholder={`صف ${i + 1} — عمود 1`}
                      onChange={e => {
                        const cd = [...(q.compareData || [])];
                        cd[i] = { ...cd[i], right: e.target.value };
                        onUpdate(q.id, { compareData: cd });
                      }}
                      style={{ ...S.input, borderRadius: 0, border: 'none', borderLeft: '1px solid #f3f4f6', fontSize: 13 }}
                    />
                    <input
                      type="text" value={row.left} placeholder={`صف ${i + 1} — عمود 2`}
                      onChange={e => {
                        const cd = [...(q.compareData || [])];
                        cd[i] = { ...cd[i], left: e.target.value };
                        onUpdate(q.id, { compareData: cd });
                      }}
                      style={{ ...S.input, borderRadius: 0, border: 'none', fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => onUpdate(q.id, { compareData: [...(q.compareData || []), { right: '', left: '' }] })}
                  style={{ fontSize: 13, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
                >+ إضافة صف</button>
                {(q.compareData || []).length > 1 && (
                  <button
                    onClick={() => onUpdate(q.id, { compareData: (q.compareData || []).slice(0, -1) })}
                    style={{ fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                  >− حذف آخر صف</button>
                )}
              </div>
            </div>
          )}

          {!q.text && (
            <p style={{ fontSize: 12, color: '#d97706' }}>⚠ نص السؤال مطلوب</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── نافذة معاينة أسئلة Word ──────────────────
function WordPreviewModal({
  questions,
  onConfirm,
  onClose,
}: {
  questions: WordParsedQuestion[];
  onConfirm: (qs: WordParsedQuestion[]) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', direction: 'rtl',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>معاينة الأسئلة المستخرجة</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
              تم استخراج <strong style={{ color: '#4f46e5' }}>{questions.length}</strong> سؤال من الملف
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, idx) => (
            <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              {/* نوع السؤال */}
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                  background: q.type === 'multiple_choice' ? '#dbeafe' : q.type === 'true_false' ? '#d1fae5' : q.type === 'fill_blank' ? '#fef3c7' : '#f3e8ff',
                  color: q.type === 'multiple_choice' ? '#1d4ed8' : q.type === 'true_false' ? '#065f46' : q.type === 'fill_blank' ? '#92400e' : '#6b21a8',
                }}>
                  {q.type === 'multiple_choice' ? '☑ اختيار متعدد' : q.type === 'true_false' ? '✓ صح / خطأ' : q.type === 'fill_blank' ? '✏ أكمل الفراغ' : '⇄ مقارنة'}
                </span>
              </div>

              {/* نص السؤال */}
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 10px' }}>
                <span style={{ color: '#4f46e5', marginLeft: 6 }}>س{idx + 1}.</span>
                {q.text}
              </p>

              {/* صورة مضمّنة */}
              {q.imageDataUrl && (
                <img src={q.imageDataUrl} alt="صورة السؤال" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 10, display: 'block' }} />
              )}

              {/* اختيار متعدد / صح خطأ */}
              {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 8, fontSize: 13,
                      background: opt === q.correctAnswer ? '#f0fdf4' : '#f9fafb',
                      border: `1px solid ${opt === q.correctAnswer ? '#86efac' : '#e5e7eb'}`,
                      color: opt === q.correctAnswer ? '#166534' : '#374151',
                      fontWeight: opt === q.correctAnswer ? 600 : 400,
                    }}>
                      {opt === q.correctAnswer && <span style={{ color: '#16a34a', fontSize: 12 }}>✓</span>}
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {/* أكمل الفراغ */}
              {q.type === 'fill_blank' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(q.blanks || []).map((b, bi) => (
                    <span key={bi} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', fontWeight: 600 }}>
                      ✓ {b}
                    </span>
                  ))}
                </div>
              )}

              {/* مقارنة */}
              {q.type === 'compare' && q.compareData && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f3f4f6' }}>
                    {(q.text.includes('|') ? q.text.split('|') : ['العمود الأول', 'العمود الثاني']).slice(0, 2).map((h, i) => (
                      <div key={i} style={{ padding: '6px 10px', fontWeight: 700, color: '#374151', borderLeft: i === 0 ? '1px solid #e5e7eb' : 'none' }}>{h.trim()}</div>
                    ))}
                  </div>
                  {q.compareData.map((row, ri) => (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ padding: '6px 10px', borderLeft: '1px solid #f3f4f6', color: '#374151' }}>{row.right}</div>
                      <div style={{ padding: '6px 10px', color: '#374151' }}>{row.left}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>💡 الإجابة الصحيحة مظللة بالأخضر</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 }}
            >إلغاء</button>
            <button
              onClick={() => onConfirm(questions)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >إضافة {questions.length} سؤال ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QuestionBankModal ────────────────────────
function QuestionBankModal({ subjectId, onSelect, onClose }: {
  subjectId: string;
  onSelect: (qs: BankQuestion[]) => void;
  onClose: () => void;
}) {
  const [bankQs, setBankQs] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bankUploadMsg, setBankUploadMsg] = useState('');
  const [bankUploading, setBankUploading] = useState(false);
  const bankFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getQuestionBank(subjectId || undefined).then(qs => {
      setBankQs(qs);
      setLoading(false);
    });
  }, [subjectId]);

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // رفع Word مباشرةً لبنك الأسئلة داخل الـ modal
  const handleBankWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      setBankUploadMsg('يرجى رفع ملف .docx فقط');
      return;
    }
    setBankUploading(true);
    setBankUploadMsg('جارٍ قراءة الملف...');
    try {
      const parsed = await parseWordQuestions(file);
      if (parsed.length === 0) {
        setBankUploadMsg('لم يتم العثور على أسئلة في الملف');
      } else {
        // تحويل إلى BankQuestion وإضافتها للعرض مباشرة
        const newBankQs: BankQuestion[] = parsed.map(q => ({
          id: generateQuestionId(),
          type: q.type,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          score: q.score,
          order: 0,
          subjectId: subjectId,
          subjectName: '',
          createdBy: '',
          createdAt: new Date(),
          usageCount: 0,
          imageURL: q.imageDataUrl,
        }));
        setBankQs(prev => [...prev, ...newBankQs]);
        setBankUploadMsg(`✓ تم إضافة ${parsed.length} سؤال للبنك`);
      }
    } catch {
      setBankUploadMsg('حدث خطأ أثناء قراءة الملف');
    } finally {
      setBankUploading(false);
      if (bankFileRef.current) bankFileRef.current.value = '';
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>📚 بنك الأسئلة</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* زر رفع Word للبنك */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => bankFileRef.current?.click()}
            disabled={bankUploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: 'none', background: '#7c3aed', color: '#fff',
              fontSize: 13, cursor: bankUploading ? 'not-allowed' : 'pointer',
              opacity: bankUploading ? 0.6 : 1,
            }}
          >
            {bankUploading ? '⏳ جارٍ القراءة...' : '📄 رفع Word للبنك (.docx)'}
          </button>
          <input ref={bankFileRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleBankWordUpload} />
          {bankUploadMsg && (
            <span style={{
              fontSize: 12,
              color: bankUploadMsg.startsWith('✓') ? '#065f46' : '#92400e',
              background: bankUploadMsg.startsWith('✓') ? '#d1fae5' : '#fef3c7',
              padding: '4px 10px', borderRadius: 20,
            }}>
              {bankUploadMsg}
            </span>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>جاري التحميل...</p>
          ) : bankQs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
              <p style={{ margin: '0 0 8px', fontSize: 14 }}>لا توجد أسئلة لهذه المادة</p>
              <p style={{ margin: 0, fontSize: 12 }}>ارفع ملف Word أعلاه لإضافة أسئلة للبنك</p>
            </div>
          ) : bankQs.map(q => (
            <div
              key={q.id}
              onClick={() => toggle(q.id)}
              style={{
                border: `2px solid ${selected.has(q.id) ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: 10, padding: 12, marginBottom: 8, cursor: 'pointer',
                background: selected.has(q.id) ? '#eef2ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4, border: `2px solid ${selected.has(q.id) ? '#6366f1' : '#d1d5db'}`,
                  background: selected.has(q.id) ? '#6366f1' : 'transparent',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected.has(q.id) && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>
                <div>
                  <p style={{ fontSize: 13, color: '#111827', margin: 0 }}>{q.text}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8' }}>
                      {q.type === 'multiple_choice' ? 'اختيار متعدد' : 'صح/خطأ'}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{q.score} درجة</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{selected.size} سؤال محدد</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 }}>
              إلغاء
            </button>
            <button
              onClick={() => { onSelect(bankQs.filter(q => selected.has(q.id))); onClose(); }}
              disabled={selected.size === 0}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: selected.size === 0 ? '#e5e7eb' : '#4f46e5', color: selected.size === 0 ? '#9ca3af' : '#fff', cursor: selected.size === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}
            >
              إضافة المحدد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: CreateExam
// ─────────────────────────────────────────────
function CreateExamContent() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const wordInputRef = useRef<HTMLInputElement>(null);

  const [title,           setTitle]           = useState('');
  const [subjectId,       setSubjectId]       = useState('');
  const [subjectName,     setSubjectName]     = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [duration,        setDuration]        = useState(60);
  const [questions,       setQuestions]       = useState<DraftQuestion[]>([]);
  const [subjects,        setSubjects]        = useState<Subject[]>([]);
  const [showBank,        setShowBank]        = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [errors,          setErrors]          = useState<string[]>([]);
  const [uploadMsg,       setUploadMsg]       = useState('');
  const [wordUploading,   setWordUploading]   = useState(false);
  const [wordPreview,     setWordPreview]     = useState<WordParsedQuestion[] | null>(null);
  const [showWordHelp,    setShowWordHelp]    = useState(false);

  useEffect(() => {
    getAllSubjects().then(setSubjects);
  }, []);

  const addQuestion = (type: QuestionType) =>
    setQuestions(prev => [...prev, blankQuestion(type, prev.length + 1)]);

  const updateQuestion = useCallback((id: string, u: Partial<DraftQuestion>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...u } : q)), []);

  const deleteQuestion = useCallback((id: string) =>
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i + 1 }))), []);

  const toggleQuestion = useCallback((id: string) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isExpanded: !q.isExpanded } : q)), []);

  const addFromBank = (bankQs: BankQuestion[]) => {
    const toAdd: DraftQuestion[] = bankQs.map((bq, i) => ({
      id: generateQuestionId(),
      type: bq.type,
      text: bq.text,
      options: bq.options ? [...bq.options] : ['صح', 'خطأ'],
      correctAnswer: bq.correctAnswer as string,
      score: bq.score,
      order: questions.length + i + 1,
      imageURL: bq.imageURL,
      isExpanded: false,
    }));
    setQuestions(prev => [...prev, ...toAdd]);
  };

  // ── رفع Word ──────────────────────────────────
  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setUploadMsg('يرجى رفع ملف Word بصيغة .docx فقط');
      if (wordInputRef.current) wordInputRef.current.value = '';
      return;
    }

    setWordUploading(true);
    setUploadMsg('جارٍ قراءة الملف...');

    try {
      const parsed = await parseWordQuestions(file);
      if (parsed.length === 0) {
        setUploadMsg('لم يتم العثور على أسئلة. تأكد من تنسيق الملف.');
      } else {
        setWordPreview(parsed);
        setUploadMsg('');
      }
    } catch {
      setUploadMsg('حدث خطأ أثناء قراءة الملف. تأكد أنه .docx صحيح.');
    } finally {
      setWordUploading(false);
      if (wordInputRef.current) wordInputRef.current.value = '';
    }
  };

  // تأكيد إضافة الأسئلة من Word
  const confirmWordQuestions = (parsed: WordParsedQuestion[]) => {
    const toAdd: DraftQuestion[] = parsed.map((pq, i) => ({
      id: generateQuestionId(),
      type: pq.type,
      text: pq.text,
      options: pq.options,
      correctAnswer: pq.correctAnswer,
      score: pq.score,
      order: questions.length + i + 1,
      imageURL: pq.imageDataUrl,
      blanks: pq.blanks,
      compareData: pq.compareData,
      isExpanded: false,
    }));
    setQuestions(prev => [...prev, ...toAdd]);
    setWordPreview(null);
    setUploadMsg(`✓ تم استيراد ${parsed.length} سؤال بنجاح`);
  };

  const toggleClass = (id: string) =>
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('عنوان الامتحان مطلوب');
    if (!subjectId) errs.push('المادة الدراسية مطلوبة');
    if (!subjectName) errs.push('اسم المادة الدراسية مطلوب');
    if (selectedClasses.length === 0) errs.push('يجب اختيار فصل واحد على الأقل');
    if (questions.length === 0) errs.push('يجب إضافة سؤال واحد على الأقل');
    if (duration < 1) errs.push('مدة الامتحان يجب أن تكون دقيقة واحدة على الأقل');
    
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`السؤال ${i + 1}: نص السؤال مطلوب`);
      if (q.score < 0) errs.push(`السؤال ${i + 1}: الدرجة يجب أن تكون صفر أو أكثر`);
      
      if (q.type === 'multiple_choice') {
        const valid = (q.options || []).filter(o => o.trim());
        if (valid.length < 2) errs.push(`السؤال ${i + 1}: خيارين على الأقل`);
        if (!q.correctAnswer) errs.push(`السؤال ${i + 1}: الإجابة الصحيحة مطلوبة`);
        if (q.correctAnswer && !valid.includes(q.correctAnswer as string)) {
          errs.push(`السؤال ${i + 1}: الإجابة الصحيحة يجب أن تكون من ضمن الخيارات`);
        }
      }
      
      if (q.type === 'true_false') {
        if (!q.correctAnswer) errs.push(`السؤال ${i + 1}: الإجابة الصحيحة مطلوبة`);
        if (q.correctAnswer && !['صح', 'خطأ'].includes(q.correctAnswer as string)) {
          errs.push(`السؤال ${i + 1}: الإجابة يجب أن تكون "صح" أو "خطأ"`);
        }
      }
      
      if (q.type === 'fill_blank') {
        const validBlanks = (q.blanks || []).filter(b => b.trim());
        if (validBlanks.length === 0) errs.push(`السؤال ${i + 1}: إجابة الفراغ مطلوبة`);
      }
      
      if (q.type === 'compare') {
        const validRows = (q.compareData || []).filter(r => r.right.trim() || r.left.trim());
        if (validRows.length < 1) errs.push(`السؤال ${i + 1}: بيانات المقارنة مطلوبة`);
      }
    });
    return errs;
  };

  // ── handleSave ────────────────────────────────
  const handleSave = async (publish: boolean) => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors([]);
    setSaving(true);

    try {
      const teacherId   = userProfile?.id || 'teacher_demo_1';
      const teacherName = userProfile?.displayName || 'مدرس';

      const cleanQuestions: Question[] = questions.map(({ isExpanded: _, ...q }) => ({
        ...q,
        options: q.options?.filter(o => o.trim()) || [],
      }));

      const examData = {
        title: title.trim(),
        subjectId,
        subjectName,
        classIds: selectedClasses,
        teacherId,
        teacherName,
        duration,
        totalScore: cleanQuestions.reduce((s, q) => s + q.score, 0),
        questions: cleanQuestions,
      };

      console.log('📝 Exam data to save:', examData);
      console.log('👤 Teacher ID:', teacherId);
      console.log('📚 Subject:', subjectName);
      console.log('🏫 Classes:', selectedClasses);
      console.log('❓ Questions count:', cleanQuestions.length);

      const exam = await createExam(examData);

      console.log('✅ Exam created successfully:', exam);

      if (publish) {
        console.log('📢 Publishing exam...');
        await publishExam(exam.id);
        console.log('✅ Exam published successfully');
      }

      setSaved(true);
      setTimeout(() => navigate('/exams'), 1500);
    } catch (err) {
      console.error('❌ Save error:', err);
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير معروف';
      setErrors([`حدث خطأ أثناء إنشاء الامتحان: ${errorMsg}`]);
      setSaving(false);
    }
  };

  const totalScore = questions.reduce((s, q) => s + q.score, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', direction: 'rtl' }}>

      {/* ── Sticky Header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/exams')}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', padding: 4 }}
            >←</button>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>إنشاء امتحان جديد</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{questions.length} سؤال · {totalScore} درجة إجمالية</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid #d1d5db', background: '#fff',
                color: '#374151', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              💾 حفظ مسودة
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                border: 'none', background: saving ? '#818cf8' : '#4f46e5',
                color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              👁 {saving ? 'جاري الحفظ...' : 'نشر الامتحان'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Success */}
        {saved && (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '14px 18px', color: '#065f46', fontWeight: 500, fontSize: 14 }}>
            ✅ تم حفظ الامتحان بنجاح! جاري التوجيه...
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px' }}>
            <p style={{ color: '#991b1b', fontWeight: 600, fontSize: 14, margin: '0 0 8px' }}>⚠ يرجى تصحيح الأخطاء التالية:</p>
            {errors.map((e, i) => (
              <p key={i} style={{ color: '#b91c1c', fontSize: 13, margin: '4px 0' }}>• {e}</p>
            ))}
          </div>
        )}

        {/* ── معلومات الامتحان ── */}
        <div style={S.card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>معلومات الامتحان</h2>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* العنوان */}
            <div>
              <label style={S.label}>عنوان الامتحان *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: امتحان الفصل الأول - علم التشريح"
                style={S.input}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* المادة */}
              <div>
                <label style={S.label}>المادة الدراسية *</label>
                <select
                  value={subjectId}
                  onChange={e => {
                    const sel = subjects.find(s => s.id === e.target.value);
                    setSubjectId(e.target.value);
                    setSubjectName(sel?.name || '');
                  }}
                  style={S.input}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* المدة */}
              <div>
                <label style={S.label}>مدة الامتحان (دقيقة) *</label>
                <input
                  type="number" min={5} max={300}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  style={S.input}
                />
              </div>
            </div>

            {/* الفصول */}
            <div>
              <label style={S.label}>الفصول المستهدفة *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CLASSES.map(cls => (
                  <label
                    key={cls.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      border: `1px solid ${selectedClasses.includes(cls.id) ? '#818cf8' : '#e5e7eb'}`,
                      borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      background: selectedClasses.includes(cls.id) ? '#eef2ff' : '#fff',
                      color: selectedClasses.includes(cls.id) ? '#4338ca' : '#374151',
                      fontWeight: selectedClasses.includes(cls.id) ? 600 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => toggleClass(cls.id)}
                      style={{ accentColor: '#4f46e5' }}
                    />
                    {cls.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── الأسئلة ── */}
        <div style={S.card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>الأسئلة</h2>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{questions.length} سؤال · {totalScore} درجة</span>
          </div>

          {/* أزرار إضافة */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => addQuestion('multiple_choice')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              ☑ اختيار من متعدد
            </button>
            <button
              onClick={() => addQuestion('true_false')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              ✓ صح / خطأ
            </button>
            <button
              onClick={() => addQuestion('fill_blank')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#d97706', color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              ✏ أكمل الفراغ
            </button>
            <button
              onClick={() => addQuestion('compare')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              ⇄ مقارنة
            </button>
            <button
              onClick={() => setShowBank(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              📚 من بنك الأسئلة
            </button>

            {/* ── زر رفع Word + tooltip التعليمات ── */}
            <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => wordInputRef.current?.click()}
                disabled={wordUploading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid #d1d5db', background: '#fff',
                  color: '#374151', fontSize: 13,
                  cursor: wordUploading ? 'not-allowed' : 'pointer',
                  opacity: wordUploading ? 0.6 : 1,
                }}
              >
                {wordUploading ? '⏳ جارٍ القراءة...' : '📄 رفع Word (.docx)'}
              </button>
              <button
                onClick={() => setShowWordHelp(v => !v)}
                title="تعليمات تنسيق الورد"
                style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '50%', width: 26, height: 26, fontSize: 13, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >?</button>
            </div>
            <input
              ref={wordInputRef}
              type="file"
              accept=".docx"
              style={{ display: 'none' }}
              onChange={handleWordUpload}
            />
          </div>

          {/* ── تعليمات الورد ── */}
          {showWordHelp && (
            <div style={{ margin: '0 20px 0', border: '1px solid #e0e7ff', borderRadius: 12, background: '#f5f3ff', padding: 16, fontSize: 12, color: '#3730a3', lineHeight: 1.9, direction: 'rtl' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>📋 تعليمات تنسيق ملف Word</strong>
                <button onClick={() => setShowWordHelp(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #e0e7ff' }}>
                  <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 4 }}>☑ اختيار من متعدد</strong>
                  <code style={{ fontSize: 11, whiteSpace: 'pre-line', color: '#374151' }}>
{`س1: ما عاصمة مصر؟
أ) الإسكندرية
ب) القاهرة ✔
ج) الجيزة
د) أسوان`}
                  </code>
                  <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 11 }}>الإجابة الصحيحة: علّم بـ ✔ أو لوّنها أخضر</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #d1fae5' }}>
                  <strong style={{ color: '#065f46', display: 'block', marginBottom: 4 }}>✓ صح / خطأ — 3 صيغ مقبولة</strong>
                  <code style={{ fontSize: 11, whiteSpace: 'pre-line', color: '#374151' }}>
{`❶ بخيارين:
س1: القاهرة عاصمة مصر؟
أ) صح ✔
ب) خطأ

❷ بسطر الإجابة:
س2: الشمس تدور حول الأرض؟
الإجابة: خطأ

❸ الإجابة في نفس السطر:
س3: النيل أطول نهر في أفريقيا؟ (صح)
س4: القمر نجم؟ (✗)`}
                  </code>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #fef3c7' }}>
                  <strong style={{ color: '#92400e', display: 'block', marginBottom: 4 }}>✏ أكمل الفراغ</strong>
                  <code style={{ fontSize: 11, whiteSpace: 'pre-line', color: '#374151' }}>
{`س3: عاصمة مصر هي ......... (القاهرة)
س4: ......... (النيل) أطول نهر في أفريقيا`}
                  </code>
                  <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 11 }}>الإجابة بين قوسين () بعد النقاط</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #f3e8ff' }}>
                  <strong style={{ color: '#6b21a8', display: 'block', marginBottom: 4 }}>⇄ مقارنة</strong>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#374151' }}>أنشئ جدول بعمودين في الورد مباشرة:</p>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', fontSize: 11 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f3f4f6', fontWeight: 700 }}>
                      <div style={{ padding: '4px 8px', borderLeft: '1px solid #e5e7eb' }}>الخلية النباتية</div>
                      <div style={{ padding: '4px 8px' }}>الخلية الحيوانية</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ padding: '4px 8px', borderLeft: '1px solid #f3f4f6' }}>لها جدار خلوي</div>
                      <div style={{ padding: '4px 8px' }}>لا جدار خلوي</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e0e7ff' }}>
                <strong style={{ color: '#374151' }}>🖼 إضافة صورة للسؤال:</strong>
                <span style={{ color: '#6b7280', marginRight: 6 }}>اضغط الصورة داخل ملف الورد فوق السؤال مباشرة — سيتم استيرادها تلقائياً</span>
              </div>
              <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 11 }}>
                💡 الملف يمكن أن يحتوي على مزيج من كل الأنواع — البرنامج يتعرف عليها تلقائياً
              </p>
            </div>
          )}

          {uploadMsg && (
            <div style={{
              padding: '8px 20px', fontSize: 13,
              background: uploadMsg.startsWith('✓') ? '#d1fae5' : '#fef3c7',
              color: uploadMsg.startsWith('✓') ? '#065f46' : '#92400e',
            }}>
              {uploadMsg}
            </div>
          )}

          {/* قائمة الأسئلة */}
          <div style={{ padding: 20 }}>
            {questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>لا توجد أسئلة بعد</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>استخدم الأزرار أعلاه لإضافة أسئلة</p>
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionCard
                  key={q.id} q={q} index={i}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onToggle={toggleQuestion}
                />
              ))
            )}
          </div>
        </div>

        {/* ── أزرار الحفظ السفلية ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 40 }}>
          <button
            onClick={() => navigate('/exams')}
            style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, cursor: 'pointer' }}
          >
            إلغاء
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            💾 حفظ مسودة
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: saving ? '#818cf8' : '#4f46e5', color: '#fff', fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            👁 {saving ? 'جاري الحفظ...' : 'نشر الامتحان'}
          </button>
        </div>
      </div>

      {/* Bank Modal */}
      {showBank && (
        <QuestionBankModal
          subjectId={subjectId}
          onSelect={addFromBank}
          onClose={() => setShowBank(false)}
        />
      )}

      {/* Word Preview Modal */}
      {wordPreview && (
        <WordPreviewModal
          questions={wordPreview}
          onConfirm={confirmWordQuestions}
          onClose={() => { setWordPreview(null); setUploadMsg(''); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Wrapper: التحقق من الصلاحيات قبل عرض الصفحة
// ─────────────────────────────────────────────
export default function CreateExam() {
  return (
    <ProtectedPage permission="canCreateExams">
      <CreateExamContent />
    </ProtectedPage>
  );
}
