// src/pages/Reports.tsx
import { useState, useEffect } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, Users, Award,
  CheckCircle, XCircle, Clock, FileText, Download,
  ChevronDown, Eye, AlertCircle, BookOpen,
} from 'lucide-react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import type { Exam, StudentAnswer, Grade } from '../types';

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

// ─── Helpers ─────────────────────────────────
function gradeColor(p: number): string {
  if (p >= 85) return '#059669';
  if (p >= 65) return '#2555a0';
  if (p >= 50) return '#d97706';
  return '#ef4444';
}

function getGradeLabel(p: number): string {
  if (p >= 85) return 'A';
  if (p >= 75) return 'B';
  if (p >= 65) return 'C';
  if (p >= 50) return 'D';
  return 'F';
}

// ─── Main Component ──────────────────────────
const Reports = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState<{ id: string; title: string; subjectName: string }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // ═══ Load Exams on Mount ═══
  useEffect(() => {
    const loadExams = async () => {
      try {
        const examsSnap = await getDocs(collection(db, 'exams'));
        const examsList = examsSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'بدون عنوان',
          subjectName: doc.data().subjectName || 'غير محدد',
        }));

        setExams(examsList);

        // اختيار أول امتحان تلقائياً
        if (examsList.length > 0) {
          setSelectedExamId(examsList[0].id);
        }
      } catch (err) {
        console.error('خطأ في تحميل الامتحانات:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadExams();
  }, []);

  // ═══ Load Statistics When Exam Selected ═══
  useEffect(() => {
    if (!selectedExamId) return;

    const loadStatistics = async () => {
      setLoading(true);
      try {
        // 1. جلب الامتحان
        const examDoc = await getDocs(
          query(collection(db, 'exams'), where('__name__', '==', selectedExamId))
        );

        if (examDoc.empty) {
          setStatistics(null);
          setLoading(false);
          return;
        }

        const examData = examDoc.docs[0].data() as Exam;
        const exam: Exam = {
          ...examData,
          id: selectedExamId,
          createdAt: examData.createdAt instanceof Timestamp ? examData.createdAt.toDate() : new Date(),
          startTime: examData.startTime instanceof Timestamp ? examData.startTime.toDate() : examData.startTime ? new Date(examData.startTime) : undefined,
          endTime: examData.endTime instanceof Timestamp ? examData.endTime.toDate() : examData.endTime ? new Date(examData.endTime) : undefined,
        };

        // 2. جلب الإجابات
        const answersSnap = await getDocs(
          query(collection(db, 'studentAnswers'), where('examId', '==', selectedExamId))
        );

        const answers: StudentAnswer[] = answersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            startedAt: data.startedAt instanceof Timestamp ? data.startedAt.toDate() : new Date(),
            submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt?.toDate() : undefined,
          } as StudentAnswer;
        });

        // 3. جلب الطلاب
        const studentsSnap = await getDocs(collection(db, 'students'));
        const studentsMap = new Map(
          studentsSnap.docs.map(doc => [doc.id, doc.data()])
        );

        // 4. بناء النتائج
        const classReportsMap = new Map<string, ClassReport>();

        // تحضير الفصول
        exam.classIds.forEach((classId, idx) => {
          const className = (examData as any).classNames?.[idx] as string || classId;
          classReportsMap.set(classId, {
            classId,
            className,
            totalStudents: 0,
            presentCount: 0,
            passCount: 0,
            averageScore: 0,
            passRate: 0,
            results: [],
          });
        });

        // معالجة الإجابات
        answers.forEach(answer => {
          const student = studentsMap.get(answer.studentId);
          if (!student) return;

          const classId = student.classId;
          const classReport = classReportsMap.get(classId);
          if (!classReport) return;

          const score = answer.score || 0;
          const percentage = (score / exam.totalScore) * 100;
          const grade = getGradeLabel(percentage);

          const result: StudentResult = {
            studentId: answer.studentId,
            studentName: answer.studentName || student.name,
            studentNumber: student.number || 0,
            classId,
            className: classReport.className,
            score,
            totalScore: exam.totalScore,
            percentage: Math.round(percentage * 100) / 100,
            grade,
            isPresent: answer.isSubmitted || false,
          };

          classReport.results.push(result);
          classReport.totalStudents++;
          if (answer.isSubmitted) {
            classReport.presentCount++;
            if (percentage >= 50) {
              classReport.passCount++;
            }
          }
        });

        // حساب المتوسطات
        classReportsMap.forEach(report => {
          if (report.presentCount > 0) {
            const totalScore = report.results
              .filter(r => r.isPresent)
              .reduce((sum, r) => sum + r.score, 0);
            report.averageScore = Math.round((totalScore / report.presentCount) * 100) / 100;
            report.passRate = Math.round((report.passCount / report.presentCount) * 100 * 100) / 100;
          }

          // ترتيب النتائج حسب الدرجة
          report.results.sort((a, b) => b.score - a.score);
        });

        const classReports = Array.from(classReportsMap.values());

        // 5. الإحصائيات العامة
        const totalStudents = classReports.reduce((sum, r) => sum + r.totalStudents, 0);
        const attendedCount = classReports.reduce((sum, r) => sum + r.presentCount, 0);
        const passCount = classReports.reduce((sum, r) => sum + r.passCount, 0);
        const failCount = attendedCount - passCount;
        const absentCount = totalStudents - attendedCount;

        const allScores = classReports.flatMap(r => r.results.filter(res => res.isPresent).map(res => res.score));
        const averageScore = allScores.length > 0
          ? Math.round((allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 100) / 100
          : 0;
        const passRate = attendedCount > 0
          ? Math.round((passCount / attendedCount) * 100 * 100) / 100
          : 0;
        const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
        const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0;

        setStatistics({
          examId: selectedExamId,
          title: exam.title,
          subjectName: exam.subjectName,
          totalStudents,
          attendedCount,
          passCount,
          failCount,
          absentCount,
          averageScore,
          passRate,
          highestScore,
          lowestScore,
          totalScore: exam.totalScore,
          classReports,
        });
      } catch (err) {
        console.error('خطأ في تحميل الإحصائيات:', err);
        setStatistics(null);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [selectedExamId]);

  // ═══ Download Report as CSV ═══
  const downloadCSV = () => {
    if (!statistics) return;

    let csv = 'رقم الطالب,اسم الطالب,الفصل,الدرجة,من,النسبة%,التقدير,حالة الحضور\n';

    statistics.classReports.forEach(classReport => {
      classReport.results.forEach(result => {
        csv += `${result.studentNumber},${result.studentName},${result.className},${result.score},${result.totalScore},${result.percentage},${result.grade},${result.isPresent ? 'حضر' : 'غائب'}\n`;
      });
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${statistics.title}.csv`;
    link.click();
  };

  if (initialLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2555a0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل الامتحانات...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '24px' }}>
          التقارير والإحصائيات
        </h1>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 24px',
          textAlign: 'center',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <AlertCircle size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2244', marginBottom: '8px' }}>
            لا توجد امتحانات متاحة
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
            لم يتم إنشاء أي امتحان بعد. قم بإنشاء امتحان لعرض التقارير.
          </p>
          <button
            onClick={() => navigate('/exams/new')}
            style={{
              background: '#2555a0',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            إنشاء امتحان جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>
            التقارير والإحصائيات
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            تحليل مفصل لنتائج الامتحانات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Cairo, sans-serif',
              color: '#1a202c',
              background: 'white',
              cursor: 'pointer',
              minWidth: '200px',
            }}
          >
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.title} - {exam.subjectName}
              </option>
            ))}
          </select>

          {statistics && (
            <button
              onClick={downloadCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
              }}
            >
              <Download size={15} />
              تحميل CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #2555a0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل الإحصائيات...</p>
          </div>
        </div>
      ) : !statistics ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <AlertCircle size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            لا توجد بيانات متاحة لهذا الامتحان
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #f0f4f8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Users size={18} color="#2555a0" />
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>إجمالي الطلاب</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '900', color: '#0f2244' }}>{statistics.totalStudents}</p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #f0f4f8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CheckCircle size={18} color="#059669" />
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>الحضور</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '900', color: '#059669' }}>{statistics.attendedCount}</p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #f0f4f8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Award size={18} color="#d97706" />
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>المتوسط</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '900', color: '#d97706' }}>
                {statistics.averageScore} / {statistics.totalScore}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #f0f4f8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <TrendingUp size={18} color="#7c3aed" />
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>نسبة النجاح</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '900', color: '#7c3aed' }}>{statistics.passRate}%</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #f0f4f8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #f0f4f8' }}>
              {[
                { key: 'overview', label: 'نظرة عامة', icon: <BarChart2 size={16} /> },
                { key: 'class', label: 'تفاصيل الفصول', icon: <BookOpen size={16} /> },
                { key: 'attendance', label: 'الحضور والغياب', icon: <Users size={16} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: activeTab === tab.key ? '#eff6ff' : 'transparent',
                    color: activeTab === tab.key ? '#2555a0' : '#64748b',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #2555a0' : 'none',
                    fontWeight: activeTab === tab.key ? '700' : '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif',
                    marginBottom: '-2px',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <p style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>ناجح</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#059669' }}>{statistics.passCount}</p>
                  </div>
                  <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>راسب</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>{statistics.failCount}</p>
                  </div>
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <p style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginBottom: '4px' }}>غائب</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#d97706' }}>{statistics.absentCount}</p>
                  </div>
                  <div style={{ padding: '12px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                    <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', marginBottom: '4px' }}>أعلى درجة</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#7c3aed' }}>{statistics.highestScore}</p>
                  </div>
                  <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '11px', color: '#2555a0', fontWeight: '600', marginBottom: '4px' }}>أقل درجة</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#2555a0' }}>{statistics.lowestScore}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'class' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {statistics.classReports.map(classReport => (
                  <div
                    key={classReport.classId}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244' }}>
                        {classReport.className}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>
                          الحضور: <strong style={{ color: '#059669' }}>{classReport.presentCount}</strong>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          المتوسط: <strong style={{ color: '#d97706' }}>{classReport.averageScore}</strong>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          النجاح: <strong style={{ color: '#7c3aed' }}>{classReport.passRate}%</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'white', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#64748b' }}>الرقم</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#64748b' }}>الاسم</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>الدرجة</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>النسبة</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>التقدير</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classReport.results.map(result => (
                            <tr key={result.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px', color: '#0f2244', fontWeight: '600' }}>{result.studentNumber}</td>
                              <td style={{ padding: '8px', color: '#0f2244' }}>{result.studentName}</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: result.isPresent ? gradeColor(result.percentage) : '#94a3b8' }}>
                                {result.isPresent ? `${result.score} / ${result.totalScore}` : '-'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: result.isPresent ? gradeColor(result.percentage) : '#94a3b8' }}>
                                {result.isPresent ? `${result.percentage}%` : '-'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {result.isPresent ? (
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    background: result.percentage >= 85 ? '#ecfdf5' : result.percentage >= 50 ? '#eff6ff' : '#fef2f2',
                                    color: gradeColor(result.percentage),
                                  }}>
                                    {result.grade}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {result.isPresent ? (
                                  <CheckCircle size={16} color="#059669" />
                                ) : (
                                  <XCircle size={16} color="#ef4444" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {statistics.classReports.map(classReport => {
                  const absentStudents = classReport.results.filter(r => !r.isPresent);
                  return (
                    <div
                      key={classReport.classId}
                      style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244', marginBottom: '12px' }}>
                        {classReport.className}
                      </h4>

                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px 16px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <p style={{ fontSize: '11px', color: '#059669', marginBottom: '4px' }}>حاضر</p>
                          <p style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>{classReport.presentCount}</p>
                        </div>
                        <div style={{ padding: '10px 16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>غائب</p>
                          <p style={{ fontSize: '20px', fontWeight: '900', color: '#ef4444' }}>{absentStudents.length}</p>
                        </div>
                      </div>

                      {absentStudents.length > 0 && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>
                            الطلاب الغائبون:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {absentStudents.map(student => (
                              <span
                                key={student.studentId}
                                style={{
                                  padding: '6px 12px',
                                  background: 'white',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#0f2244',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {student.studentName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
