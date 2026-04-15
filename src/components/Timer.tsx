// src/components/Timer.tsx
// مكون المؤقت مع تنبيه اللون الأحمر لآخر 10 ثواني

import { Clock } from 'lucide-react';

interface TimerProps {
  remaining: number; // minutes
  isDanger: boolean; // last 10 seconds
  isWarning: boolean; // last 2 minutes
  examTitle: string;
  model: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
}

function formatTime(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total > 0 ? (answered / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">
        {answered}/{total}
      </span>
    </div>
  );
}

export default function Timer({
  remaining,
  isDanger,
  isWarning,
  examTitle,
  model,
  currentQuestion,
  totalQuestions,
  answeredCount,
}: TimerProps) {
  return (
    <div
      className={`sticky top-0 z-30 border-b transition-colors ${
        isDanger
          ? 'bg-red-600 animate-pulse'
          : isWarning
          ? 'bg-amber-500'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className={`text-sm font-bold truncate ${
                isDanger || isWarning ? 'text-white' : 'text-gray-800'
              }`}
            >
              {examTitle}
            </h1>
            <p
              className={`text-xs mt-0.5 ${
                isDanger || isWarning ? 'text-white/80' : 'text-gray-400'
              }`}
            >
              نموذج {model} · السؤال {currentQuestion} من {totalQuestions}
            </p>
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
              isDanger
                ? 'bg-white/20 text-white ring-2 ring-white/50'
                : isWarning
                ? 'bg-white/20 text-white'
                : remaining < 10
                ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <Clock
              size={18}
              className={
                isDanger
                  ? 'text-white animate-pulse'
                  : isWarning
                  ? 'text-white'
                  : remaining < 10
                  ? 'text-amber-600'
                  : ''
              }
            />
            {formatTime(remaining)}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-2">
          <ProgressBar answered={answeredCount} total={totalQuestions} />
        </div>
      </div>
    </div>
  );
}
