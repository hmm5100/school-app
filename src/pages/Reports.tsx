// src/pages/Reports.tsx
// self-contained - no external imports - inline styles only

import { useState } from 'react';

// ─── Types ───────────────────────────────────
interface StudentResult {
  studentId: string;
  studentName: string;
  studentNumber: number;
  classId: string;
  className: string;
  score: number;
  totalScore: number;
  percentage: number;
  grade: string;
  isPresent: boolean;
}

interface ClassReport {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  passCount: number;
  averageScore: number;
  passRate: number;
  results: StudentResult[];
}

interface ExamStatistics {
  examId: string;
  title: string;
  subjectName: string;
  totalStudents: number;
  attendedCount: number;
  passCount: number;
  failCount: number;
  absentCount: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  totalScore: number;
  classReports: ClassReport[];
}

type TabKey = 'overview' | 'class' | 'attendance';

// ─── Mock Data (استبدلها ببياناتك الحقيقية) ──
const MOCK_EXAMS: { id: string; title: string; subjectName: string }[] = [
  { id: 'e1', title: 'امتحان الجبر',  subjectName: 'رياضيات' },
  { id: 'e2', title: 'امتحان النحو',  subjectName: 'عربي'    },
];

const MOCK_STATS: Record<string, ExamStatistics> = {
  e1: {
    examId: 'e1', title: 'امتحان الجبر', subjectName: 'رياضيات',
    totalStudents: 60, attendedCount: 55, passCount: 48, failCount: 7, absentCount: 5,
    averageScore: 73.5, passRate: 87.3, highestScore: 98, lowestScore: 41, totalScore: 100,
    classReports: [
      {
        classId: 'c1', className: 'الصف الثالث أ', totalStudents: 30, presentCount: 28, passCount: 25, averageScore: 76, passRate: 89,
        results: [
          { studentId: 's1', studentName: 'أحمد محمود',  studentNumber: 1, classId: 'c1', className: 'الصف الثالث أ', score: 95, totalScore: 100, percentage: 95, grade: 'A+', isPresent: true },
          { studentId: 's2', studentName: 'سارة خالد',   studentNumber: 2, classId: 'c1', className: 'الصف الثالث أ', score: 88, totalScore: 100, percentage: 88, grade: 'A',  isPresent: true },
          { studentId: 's3', studentName: 'محمد علي',    studentNumber: 3, classId: 'c1', className: 'الصف الثالث أ', score: 72, totalScore: 100, percentage: 72, grade: 'B',  isPresent: true },
          { studentId: 's4', studentName: 'نور أحمد',    studentNumber: 4, classId: 'c1', className: 'الصف الثالث أ', score:  0, totalScore: 100, percentage:  0, grade: '-',  isPresent: false },
          { studentId: 's5', studentName: 'يوسف حسن',   studentNumber: 5, classId: 'c1', className: 'الصف الثالث أ', score: 55, totalScore: 100, percentage: 55, grade: 'C',  isPresent: true },
        ],
      },
      {
        classId: 'c2', className: 'الصف الثالث ب', totalStudents: 30, presentCount: 27, passCount: 23, averageScore: 70, passRate: 85,
        results: [
          { studentId: 's6', studentName: 'فاطمة عبدالله', studentNumber: 1, classId: 'c2', className: 'الصف الثالث ب', score: 91, totalScore: 100, percentage: 91, grade: 'A+', isPresent: true },
          { studentId: 's7', studentName: 'عمر إبراهيم',  studentNumber: 2, classId: 'c2', className: 'الصف الثالث ب', score: 45, totalScore: 100, percentage: 45, grade: 'F',  isPresent: true },
          { studentId: 's8', studentName: 'ريم سالم',     studentNumber: 3, classId: 'c2', className: 'الصف الثالث ب', score:  0, totalScore: 100, percentage:  0, grade: '-',  isPresent: false },
        ],
      },
    ],
  },
  e2: {
    examId: 'e2', title: 'امتحان النحو', subjectName: 'عربي',
    totalStudents: 30, attendedCount: 29, passCount: 26, failCount: 3, absentCount: 1,
    averageScore: 81, passRate: 93, highestScore: 100, lowestScore: 52, totalScore: 90,
    classReports: [
      {
        classId: 'c3', className: 'الصف الثاني أ', totalStudents: 30, presentCount: 29, passCount: 26, averageScore: 81, passRate: 93,
        results: [
          { studentId: 't1', studentName: 'لينا مصطفى', studentNumber: 1, classId: 'c3', className: 'الصف الثاني أ', score: 88, totalScore: 90, percentage: 98, grade: 'A+', isPresent: true },
          { studentId: 't2', studentName: 'كريم عادل',  studentNumber: 2, classId: 'c3', className: 'الصف الثاني أ', score: 60, totalScore: 90, percentage: 67, grade: 'C',  isPresent: true },
          { studentId: 't3', studentName: 'منى حسين',   studentNumber: 3, classId: 'c3', className: 'الصف الثاني أ', score:  0, totalScore: 90, percentage:  0, grade: '-',  isPresent: false },
        ],
      },
    ],
  },
};

// ─── Helpers ─────────────────────────────────
function gradeColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 75) return '#2563eb';
  if (p >= 60) return '#d97706';
  return '#dc2626';
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

function StatCard({ label, value, icon, bg, color }: { label: string; value: string | number; icon: string; bg: string; color: string }) {
  return (
    <div style={{ borderRadius: 12, padding: 16, background: bg, color }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
      <p style={{ fontSize: 14 }}>{message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────
export default function Reports() {
  const [selectedExamId, setSelectedExamId]   = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab]             = useState<TabKey>('overview');
  const [attendanceMap, setAttendanceMap]     = useState<Record<string, boolean>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const examStats    = selectedExamId ? MOCK_STATS[selectedExamId] : null;
  const classReport  = examStats?.classReports.find(c => c.classId === selectedClassId) ?? null;

  const handleExamChange = (id: string) => {
    setSelectedExamId(id);
    setSelectedClassId('');
    setAttendanceMap({});
    setActiveTab('overview');
    // اذا فصل واحد بس، اختاره تلقائياً
    if (id && MOCK_STATS[id]?.classReports.length === 1) {
      const cr = MOCK_STATS[id].classReports[0];
      setSelectedClassId(cr.classId);
      const map: Record<string, boolean> = {};
      cr.results.forEach(r => { map[r.studentId] = r.isPresent; });
      setAttendanceMap(map);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (classId && examStats) {
      const cr = examStats.classReports.find(c => c.classId === classId);
      if (cr) {
        const map: Record<string, boolean> = {};
        cr.results.forEach(r => { map[r.studentId] = r.isPresent; });
        setAttendanceMap(map);
      }
    }
  };

  const saveAttendance = () => {
    // اربط هنا بـ API الحقيقية
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 3000);
  };

  const presentCount = classReport
    ? Object.values(attendanceMap).filter(Boolean).length
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '1.5rem', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0 }}>📊 التقارير والإحصائيات</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>عرض نتائج الامتحانات وإحصائيات الفصول</p>
      </div>

      {/* Exam Selector */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', padding: 16, marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>اختر الامتحان</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedExamId}
            onChange={e => handleExamChange(e.target.value)}
            style={{ flex: 1, border: '0.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#111827' }}
          >
            <option value="">-- اختر امتحان --</option>
            {MOCK_EXAMS.map(e => (
              <option key={e.id} value={e.id}>{e.title} - {e.subjectName}</option>
            ))}
          </select>

          {examStats && (
            <select
              value={selectedClassId}
              onChange={e => handleClassChange(e.target.value)}
              style={{ border: '0.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', color: '#111827' }}
            >
              <option value="">-- كل الفصول --</option>
              {examStats.classReports.map(cr => (
                <option key={cr.classId} value={cr.classId}>{cr.className}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!examStats && (
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#6b7280', margin: '0 0 6px' }}>اختر امتحاناً للبدء</h3>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>اختر امتحاناً من القائمة أعلاه لعرض إحصائياته وتقاريره</p>
        </div>
      )}

      {/* Tabs + Content */}
      {examStats && (
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #e5e7eb' }}>
            <TabButton active={activeTab === 'overview'}    onClick={() => setActiveTab('overview')}>📈 نظرة عامة</TabButton>
            <TabButton active={activeTab === 'class'}       onClick={() => setActiveTab('class')}>📋 تقرير الفصل</TabButton>
            <TabButton active={activeTab === 'attendance'}  onClick={() => setActiveTab('attendance')}>✅ الحضور</TabButton>
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div style={{ padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: '0 0 4px' }}>{examStats.title}</h2>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{examStats.subjectName}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 10, marginBottom: 20 }}>
                <StatCard label="إجمالي الطلاب"  value={examStats.totalStudents}  icon="👥" bg="#eff6ff" color="#1d4ed8" />
                <StatCard label="الحاضرون"        value={examStats.attendedCount}  icon="✅" bg="#f0fdf4" color="#15803d" />
                <StatCard label="ناجحون"          value={examStats.passCount}      icon="🎯" bg="#f0fdf4" color="#15803d" />
                <StatCard label="راسبون"          value={examStats.failCount}      icon="❌" bg="#fef2f2" color="#b91c1c" />
                <StatCard label="المتوسط"         value={examStats.averageScore}   icon="📊" bg="#fffbeb" color="#b45309" />
                <StatCard label="نسبة النجاح"     value={`${examStats.passRate}%`} icon="📈" bg="#faf5ff" color="#7e22ce" />
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: '0 0 10px' }}>تقارير الفصول</h3>
              {examStats.classReports.map(cr => (
                <div key={cr.classId} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{cr.className}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{cr.presentCount}/{cr.totalStudents} حاضر · {cr.passCount} ناجح</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 18, fontWeight: 500, color: gradeColor(cr.averageScore), margin: 0 }}>{cr.averageScore}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>متوسط</p>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => console.log('export all')}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '0.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                >
                  💾 تصدير الكل Excel
                </button>
              </div>
            </div>
          )}

          {/* ── Class Report ── */}
          {activeTab === 'class' && (
            <div style={{ padding: 20 }}>
              {!classReport ? (
                <EmptyState message="اختر فصلاً لعرض التقرير التفصيلي" />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: 0 }}>نتائج: {classReport.className}</h2>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        حاضر {classReport.presentCount} · ناجح {classReport.passCount} · متوسط {classReport.averageScore}
                      </p>
                    </div>
                    <button
                      onClick={() => console.log('export class')}
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '0.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                    >
                      💾 تصدير Excel
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['#', 'الطالب', 'الدرجة', 'النسبة', 'التقدير', 'النتيجة'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, fontSize: 12, color: '#6b7280', borderBottom: '0.5px solid #e5e7eb' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classReport.results.map((r, idx) => (
                          <tr key={r.studentId} style={{ opacity: r.isPresent ? 1 : 0.5 }}>
                            <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
                              {r.isPresent ? <strong>{idx + 1}</strong> : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 500, color: '#111827' }}>{r.studentName}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {r.isPresent
                                ? <span style={{ fontWeight: 500, color: '#111827' }}>{r.score}<span style={{ color: '#9ca3af', fontSize: 11 }}>/{r.totalScore}</span></span>
                                : <span style={{ color: '#9ca3af', fontSize: 12 }}>غائب</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {r.isPresent ? <span style={{ fontWeight: 500, color: gradeColor(r.percentage) }}>{r.percentage}%</span> : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {r.isPresent ? <span style={{ fontWeight: 500, color: gradeColor(r.percentage) }}>{r.grade}</span> : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {r.isPresent ? (
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: r.percentage >= 50 ? '#d1fae5' : '#fee2e2', color: r.percentage >= 50 ? '#065f46' : '#991b1b' }}>
                                  {r.percentage >= 50 ? 'ناجح' : 'راسب'}
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f3f4f6', color: '#4b5563' }}>غائب</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Attendance ── */}
          {activeTab === 'attendance' && (
            <div style={{ padding: 20 }}>
              {!classReport ? (
                <EmptyState message="اختر فصلاً لعرض سجل الحضور والغياب" />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: 0 }}>سجل حضور: {classReport.className}</h2>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        حاضر: {presentCount} | غائب: {classReport.results.length - presentCount}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {attendanceSaved && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}>✅ تم الحفظ</span>}
                      <button
                        onClick={saveAttendance}
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        💾 حفظ الحضور
                      </button>
                    </div>
                  </div>

                  <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    {classReport.results.map(r => (
                      <div key={r.studentId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#9ca3af', width: 20, textAlign: 'center' }}>{r.studentNumber}</span>
                          <span style={{ fontSize: 14, color: '#111827' }}>{r.studentName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [r.studentId]: true }))}
                            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid', background: attendanceMap[r.studentId] === true ? '#16a34a' : '#f9fafb', color: attendanceMap[r.studentId] === true ? '#fff' : '#6b7280', borderColor: attendanceMap[r.studentId] === true ? '#16a34a' : '#e5e7eb' }}
                          >
                            حاضر
                          </button>
                          <button
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [r.studentId]: false }))}
                            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid', background: attendanceMap[r.studentId] === false ? '#dc2626' : '#f9fafb', color: attendanceMap[r.studentId] === false ? '#fff' : '#6b7280', borderColor: attendanceMap[r.studentId] === false ? '#dc2626' : '#e5e7eb' }}
                          >
                            غائب
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
