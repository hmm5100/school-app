// src/components/Question.tsx
// مكون عرض السؤال مع الخيارات

import { CheckCircle2 } from 'lucide-react';
import type { Question } from '../types';

interface QuestionProps {
  question: Question;
  questionNumber: number;
  selectedAnswer?: string;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export default function Question({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
}: QuestionProps) {
  const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">السؤال {questionNumber}</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                question.type === 'multiple_choice'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {question.type === 'multiple_choice' ? 'اختيار من متعدد' : 'صح / خطأ'}
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

        {/* Options */}
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
      </div>
    </div>
  );
}
