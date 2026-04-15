// src/pages/Leaderboard.tsx
// self-contained - no external imports - inline styles only

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Types ───────────────────────────────────
interface HonorRollEntry {
  rank: number;
  studentName: string;
  className: string;
  averagePercentage: number;
}

interface ClassReport {
  classId: string;
  className: string;
  presentCount: number;
  totalStudents: number;
  averageScore: number;
}

interface ArchivedExam {
  id: string;
  examTitle: string;
  subjectName: string;
  archivedAt: string;
  classIds: string[];
  statistics: {
    totalStudents: number;
    attendedCount: number;
    averageScore: number;
    passRate: number;
    classReports: ClassReport[];
  };
}

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  userRole: string;
  userName: string;
  details: string;
  timestamp: string;
}

type TabKey = 'leaderboard' | 'archive' | 'audit';

// ─── Mock Data (استبدلها ببياناتك الحقيقية) ──
const MOCK_HONOR: HonorRollEntry[] = [
  { rank: 1, studentName: 'أحمد محمود',   className: 'الصف الثالث أ', averagePercentage: 97 },
  { rank: 2, studentName: 'سارة خالد',    className: 'الصف الثاني ب', averagePercentage: 94 },
  { rank: 3, studentName: 'محمد عبدالله', className: 'الصف الثالث ب', averagePercentage: 92 },
  { rank: 4, studentName: 'نور الهدى',    className: 'الصف الأول أ',  averagePercentage: 89 },
  { rank: 5, studentName: 'يوسف إبراهيم', className: 'الصف الثاني أ', averagePercentage: 87 },
  { rank: 6, studentName: 'فاطمة علي',    className: 'الصف الثالث أ', averagePercentage: 85 },
  { rank: 7, studentName: 'عمر حسن',      className: 'الصف الأول ب',  averagePercentage: 83 },
];

const MOCK_ARCHIVED: ArchivedExam[] = [
  {
    id: 'a1', examTitle: 'امتحان الجبر النهائي', subjectName: 'رياضيات', archivedAt: '2024-09-01',
    classIds: ['c1', 'c2'],
    statistics: {
      totalStudents: 60, attendedCount: 55, averageScore: 72, passRate: 88,
      classReports: [
        { classId: 'c1', className: 'الصف الثالث أ', presentCount: 28, totalStudents: 30, averageScore: 75 },
        { classId: 'c2', className: 'الصف الثالث ب', presentCount: 27, totalStudents: 30, averageScore: 69 },
      ],
    },
  },
  {
    id: 'a2', examTitle: 'امتحان النحو الفصلي', subjectName: 'عربي', archivedAt: '2024-08-15',
    classIds: ['c1'],
    statistics: {
      totalStudents: 30, attendedCount: 29, averageScore: 81, passRate: 93,
      classReports: [
        { classId: 'c1', className: 'الصف الثاني أ', presentCount: 29, totalStudents: 30, averageScore: 81 },
      ],
    },
  },
];

const MOCK_AUDIT: AuditLogEntry[] = [
  { id: 'l1', action: 'تعديل درجات امتحان الجبر', targetType: 'grade',   userRole: 'teacher', userName: 'مدرس الرياضيات', details: 'تم تعديل درجة الطالب أحمد من 85 إلى 90',  timestamp: '2024-10-10T09:00:00' },
  { id: 'l2', action: 'إضافة طالب جديد',           targetType: 'student', userRole: 'admin',   userName: 'المدير',          details: 'تم إضافة الطالبة فاطمة علي للصف الثالث أ', timestamp: '2024-10-09T14:30:00' },
  { id: 'l3', action: 'أرشفة امتحان النحو',        targetType: 'exam',    userRole: 'admin',   userName: 'المدير',          details: 'تم أرشفة امتحان النحو الفصلي',             timestamp: '2024-10-08T11:15:00' },
  { id: 'l4', action: 'تعيين مدرس جديد',           targetType: 'teacher', userRole: 'admin',   userName: 'المدير',          details: 'تم تعيين الأستاذ محمود لمادة الفيزياء',   timestamp: '2024-10-07T08:00:00' },
];

// ─── Helpers ─────────────────────────────────
function gradeColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 75) return '#2563eb';
  if (p >= 60) return '#d97706';
  return '#dc2626';
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

function actionIcon(targetType: string): string {
  const map: Record<string, string> = { exam: '📝', grade: '✏️', student: '👤', teacher: '🧑‍🏫', attendance: '📋' };
  return map[targetType] || '🔧';
}

// ─── Sub Components ───────────────────────────
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: 500,
        border: 'none', borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        background: active ? 'rgba(37,99,235,0.04)' : 'transparent',
        color: active ? '#2563eb' : '#6b7280', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function PodiumCard({ entry }: { entry: HonorRollEntry }) {
  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';
  const isFirst = entry.rank === 1;
  return (
    <div style={{
      flex: 1, maxWidth: 140, border: `2px solid ${isFirst ? '#fde047' : '#e5e7eb'}`,
      borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 12, textAlign: 'center',
      background: isFirst ? '#fefce8' : '#f9fafb', minHeight: isFirst ? 140 : 110,
    }}>
      <div style={{ fontSize: isFirst ? 28 : 22 }}>{medal}</div>
      <div style={{ fontSize: isFirst ? 14 : 13, fontWeight: 500, color: '#111827', marginTop: 4 }}>{entry.studentName}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{entry.className}</div>
      <div style={{ fontSize: isFirst ? 18 : 16, fontWeight: 500, color: gradeColor(entry.averagePercentage), marginTop: 4 }}>
        {entry.averagePercentage}%
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────
export default function Leaderboard() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab]           = useState<TabKey>('leaderboard');
  const [classFilter, setClassFilter]       = useState('');
  const [topN, setTopN]                     = useState(10);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  const CLASSES = [...new Set(MOCK_HONOR.map(h => h.className))];

  const filteredHonor = MOCK_HONOR
    .filter(h => !classFilter || h.className === classFilter)
    .slice(0, topN);

  const top3 = filteredHonor.slice(0, 3);
  const rest  = filteredHonor.slice(3);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '1.5rem', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0 }}>🏆 لوحة الشرف والأرشيف</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>أفضل الطلاب، الامتحانات المؤرشفة، وسجل التعديلات</p>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #e5e7eb' }}>
          <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')}>🏆 لوحة الشرف</TabButton>
          {userRole !== 'student' && (
            <TabButton active={activeTab === 'archive'} onClick={() => setActiveTab('archive')}>📦 الأرشيف</TabButton>
          )}
          {userRole === 'admin' && (
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>📋 سجل التعديلات</TabButton>
          )}
        </div>

        {/* ── Tab: Leaderboard ── */}
        {activeTab === 'leaderboard' && (
          <div style={{ padding: 20 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                style={{ border: '0.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#111827' }}
              >
                <option value="">كل الفصول</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={topN}
                onChange={e => setTopN(Number(e.target.value))}
                style={{ border: '0.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#111827' }}
              >
                <option value={5}>أفضل 5</option>
                <option value={10}>أفضل 10</option>
                <option value={20}>أفضل 20</option>
                <option value={50}>أفضل 50</option>
              </select>
            </div>

            {/* Podium */}
            {top3.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: '1.5rem' }}>
                {top3.length > 1 && <PodiumCard entry={top3[1]} />}
                <PodiumCard entry={top3[0]} />
                {top3.length > 2 && <PodiumCard entry={top3[2]} />}
              </div>
            )}

            {/* Rest of list */}
            {rest.map(h => (
              <div key={h.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#6b7280', flexShrink: 0 }}>
                  #{h.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: '#111827', margin: 0 }}>{h.studentName}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{h.className}</p>
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: gradeColor(h.averagePercentage) }}>
                  {h.averagePercentage}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Archive ── */}
        {activeTab === 'archive' && userRole !== 'student' && (
          <div style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: '0 0 4px' }}>الامتحانات المؤرشفة</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>الامتحانات المنتهية والمحفوظة</p>

            {MOCK_ARCHIVED.map(a => (
              <div key={a.id} style={{ border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {/* Row */}
                <div
                  onClick={() => setExpandedArchive(expandedArchive === a.id ? null : a.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{a.examTitle}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{a.subjectName} · أُرشف {formatDate(a.archivedAt)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20 }}>{a.classIds.length} فصل</span>
                    <span style={{ color: '#9ca3af' }}>{expandedArchive === a.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded */}
                {expandedArchive === a.id && (
                  <div style={{ borderTop: '0.5px solid #f3f4f6', padding: 16, background: '#f9fafb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                      {[
                        { label: 'إجمالي الطلاب', value: a.statistics.totalStudents, color: '#111827' },
                        { label: 'الحاضرون',       value: a.statistics.attendedCount, color: '#2563eb' },
                        { label: 'متوسط الدرجات',  value: a.statistics.averageScore,  color: '#16a34a' },
                        { label: 'نسبة النجاح',    value: `${a.statistics.passRate}%`, color: '#d97706' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 10, textAlign: 'center', border: '0.5px solid #e5e7eb' }}>
                          <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {a.statistics.classReports.map(cr => (
                      <div key={cr.classId} style={{ background: '#fff', borderRadius: 8, padding: '10px 16px', border: '0.5px solid #e5e7eb', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{cr.className}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{cr.presentCount}/{cr.totalStudents} حاضر · متوسط: {cr.averageScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Audit ── */}
        {activeTab === 'audit' && userRole === 'admin' && (
          <div style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: '0 0 4px' }}>سجل التعديلات</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>جميع الإجراءات التي تمت بواسطة المشرفين والمدرسين</p>

            {MOCK_AUDIT.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{actionIcon(log.targetType)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{log.action}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: log.userRole === 'admin' ? '#f3e8ff' : '#dbeafe',
                      color:      log.userRole === 'admin' ? '#6b21a8' : '#1e40af',
                    }}>
                      {log.userRole === 'admin' ? 'مدير' : 'مدرس'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{log.details}</p>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    👤 {log.userName} &nbsp;·&nbsp; 🕐 {formatDate(log.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
