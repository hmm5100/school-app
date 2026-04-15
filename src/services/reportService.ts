// src/services/reportService.ts
// خدمة التقارير والإحصائيات - المرحلة 6

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';
import type { Student, StudentAnswer, Exam, AuditLog, HonorRoll, Grade } from '../types';
import { getAllAnswersForExam, getAllExams } from './examService';
import { getAllStudents } from './studentService';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function isFirebaseConfigured(): boolean {
  try {
    const opts = db.app.options as { projectId?: string };
    return !!(opts.projectId && opts.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return false;
  }
}

function generateId(): string {
  return `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface StudentResult {
  studentId: string;
  studentName: string;
  studentNumber: number;
  classId: string;
  className: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  score: number;
  totalScore: number;
  percentage: number;
  grade: string;
  submittedAt?: Date;
  isPresent: boolean;
}

export interface ClassReport {
  classId: string;
  className: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  passCount: number;
  failCount: number;
  gradeDistribution: Record<string, number>;
  results: StudentResult[];
}

export interface ExamStatistics {
  examId: string;
  examTitle: string;
  subjectName: string;
  totalClasses: number;
  totalStudents: number;
  attendedCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  classReports: ClassReport[];
}

export interface AttendanceRecord {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  isPresent: boolean;
  markedAt: Date;
  markedBy: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: Date;
}

export interface ArchivedExam {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  classIds: string[];
  archivedAt: Date;
  archivedBy: string;
  statistics: ExamStatistics;
}

// ─────────────────────────────────────────────
// Local in-memory store
// ─────────────────────────────────────────────
let localAuditLogs: AuditLogEntry[] = [
  {
    id: 'log_1',
    action: 'إنشاء امتحان',
    userId: 'teacher_demo_1',
    userName: 'أ. محمد عبد الله',
    userRole: 'teacher',
    targetType: 'exam',
    targetId: 'exam_demo_1',
    details: 'تم إنشاء امتحان "علم التشريح - الفصل الأول"',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'log_2',
    action: 'تعديل درجة',
    userId: 'admin_demo_1',
    userName: 'مدير النظام',
    userRole: 'admin',
    targetType: 'grade',
    targetId: 'grade_1',
    details: 'تم تعديل درجة الطالب "أحمد محمد" من 18 إلى 20 في مادة علم التشريح',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'log_3',
    action: 'نشر امتحان',
    userId: 'teacher_demo_1',
    userName: 'أ. محمد عبد الله',
    userRole: 'teacher',
    targetType: 'exam',
    targetId: 'exam_demo_1',
    details: 'تم نشر امتحان "علم التشريح - الفصل الأول" للطلاب',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'log_4',
    action: 'إضافة طالب',
    userId: 'admin_demo_1',
    userName: 'مدير النظام',
    userRole: 'admin',
    targetType: 'student',
    targetId: 'student_1',
    details: 'تم إضافة الطالب "يوسف عمر" إلى الفصل 1/1 بنين',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'log_5',
    action: 'قفل امتحان',
    userId: 'teacher_demo_1',
    userName: 'أ. محمد عبد الله',
    userRole: 'teacher',
    targetType: 'exam',
    targetId: 'exam_demo_1',
    details: 'تم قفل الامتحان ومنع أي تعديلات إضافية',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
];

let localAttendance: AttendanceRecord[] = [];
let localArchivedExams: ArchivedExam[] = [];

// ─────────────────────────────────────────────
// Grade letter helper
// ─────────────────────────────────────────────
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'C+';
  if (percentage >= 65) return 'C';
  if (percentage >= 60) return 'D+';
  if (percentage >= 50) return 'D';
  return 'F';
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 85) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

// ─────────────────────────────────────────────
// GET EXAM STATISTICS FOR A CLASS
// ─────────────────────────────────────────────
export const getClassReport = async (
  examId: string,
  classId: string,
  students: Student[],
): Promise<ClassReport> => {
  const [exam, allAnswers] = await Promise.all([
    (async () => {
      const exams = await getAllExams();
      return exams.find(e => e.id === examId) || null;
    })(),
    getAllAnswersForExam(examId),
  ]);

  if (!exam) {
    throw new Error('الامتحان غير موجود');
  }

  const classStudents = students.filter(s => s.classId === classId);
  const classAnswers = allAnswers.filter(a =>
    classStudents.some(s => s.id === a.studentId),
  );

  const results: StudentResult[] = classStudents.map(student => {
    const answer = classAnswers.find(a => a.studentId === student.id);
    const score = answer?.score ?? 0;
    const percentage = exam.totalScore > 0 ? (score / exam.totalScore) * 100 : 0;

    return {
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.number,
      classId: student.classId,
      className: student.className,
      examId,
      examTitle: exam.title,
      subjectName: exam.subjectName,
      score,
      totalScore: exam.totalScore,
      percentage: Math.round(percentage * 10) / 10,
      grade: getGradeLetter(percentage),
      submittedAt: answer?.submittedAt,
      isPresent: !!(answer?.isSubmitted),
    };
  });

  const presentResults = results.filter(r => r.isPresent);
  const scores = presentResults.map(r => r.score);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const gradeDistribution: Record<string, number> = {};
  results.forEach(r => {
    gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
  });

  return {
    classId,
    className: classStudents[0]?.className || classId,
    examId,
    examTitle: exam.title,
    subjectName: exam.subjectName,
    totalStudents: classStudents.length,
    presentCount: presentResults.length,
    absentCount: classStudents.length - presentResults.length,
    averageScore: Math.round(averageScore * 10) / 10,
    averagePercentage: exam.totalScore > 0 ? Math.round((averageScore / exam.totalScore) * 1000) / 10 : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    passCount: presentResults.filter(r => r.percentage >= 50).length,
    failCount: presentResults.filter(r => r.percentage < 50).length,
    gradeDistribution,
    results: results.sort((a, b) => b.score - a.score),
  };
};

// ─────────────────────────────────────────────
// GET FULL EXAM STATISTICS (ALL CLASSES)
// ─────────────────────────────────────────────
export const getExamStatistics = async (examId: string): Promise<ExamStatistics> => {
  const [exams, students] = await Promise.all([getAllExams(), getAllStudents()]);
  const exam = exams.find(e => e.id === examId);
  if (!exam) throw new Error('الامتحان غير موجود');

  const classReports = await Promise.all(
    exam.classIds.map(classId => getClassReport(examId, classId, students)),
  );

  const allResults = classReports.flatMap(r => r.results);
  const presentResults = allResults.filter(r => r.isPresent);
  const scores = presentResults.map(r => r.score);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    examId,
    examTitle: exam.title,
    subjectName: exam.subjectName,
    totalClasses: exam.classIds.length,
    totalStudents: allResults.length,
    attendedCount: presentResults.length,
    averageScore: Math.round(averageScore * 10) / 10,
    averagePercentage: exam.totalScore > 0 ? Math.round((averageScore / exam.totalScore) * 1000) / 10 : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    passRate: presentResults.length > 0
      ? Math.round((presentResults.filter(r => r.percentage >= 50).length / presentResults.length) * 1000) / 10
      : 0,
    classReports,
  };
};

// ─────────────────────────────────────────────
// GET STUDENT RESULTS ACROSS ALL EXAMS
// ─────────────────────────────────────────────
export const getStudentResults = async (studentId: string): Promise<StudentResult[]> => {
  const [exams, students, allExamAnswers] = await Promise.all([
    getAllExams(),
    getAllStudents(),
    (async () => {
      const answersPerExam: StudentAnswer[] = [];
      const published = (await getAllExams()).filter(e => e.isPublished || e.status === 'finished');
      for (const exam of published) {
        const ans = await getAllAnswersForExam(exam.id);
        answersPerExam.push(...ans);
      }
      return answersPerExam;
    })(),
  ]);

  const student = students.find(s => s.id === studentId);
  if (!student) return [];

  const studentAnswers = allExamAnswers.filter(a => a.studentId === studentId);

  return studentAnswers.map(answer => {
    const exam = exams.find(e => e.id === answer.examId);
    if (!exam) return null;
    const score = answer.score ?? 0;
    const percentage = exam.totalScore > 0 ? (score / exam.totalScore) * 100 : 0;

    return {
      studentId,
      studentName: student.name,
      studentNumber: student.number,
      classId: student.classId,
      className: student.className,
      examId: exam.id,
      examTitle: exam.title,
      subjectName: exam.subjectName,
      score,
      totalScore: exam.totalScore,
      percentage: Math.round(percentage * 10) / 10,
      grade: getGradeLetter(percentage),
      submittedAt: answer.submittedAt,
      isPresent: answer.isSubmitted,
    } as StudentResult;
  }).filter(Boolean) as StudentResult[];
};

// ─────────────────────────────────────────────
// EXPORT TO EXCEL - CLASS RESULTS
// ─────────────────────────────────────────────
export const exportClassResultsToExcel = (report: ClassReport): void => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: نتائج الطلاب
  const rows = [
    ['م', 'اسم الطالب', 'الدرجة', `/${report.results[0]?.totalScore ?? 0}`, 'النسبة المئوية', 'التقدير', 'الحضور'],
    ...report.results.map((r, i) => [
      i + 1,
      r.studentName,
      r.isPresent ? r.score : 'غائب',
      '',
      r.isPresent ? `${r.percentage}%` : '-',
      r.isPresent ? r.grade : '-',
      r.isPresent ? 'حاضر' : 'غائب',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 5 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'نتائج الطلاب');

  // Sheet 2: إحصائيات الفصل
  const statsRows = [
    ['إحصائيات الفصل'],
    ['الفصل', report.className],
    ['الامتحان', report.examTitle],
    ['المادة', report.subjectName],
    ['إجمالي الطلاب', report.totalStudents],
    ['الحاضرون', report.presentCount],
    ['الغائبون', report.absentCount],
    ['أعلى درجة', report.highestScore],
    ['أدنى درجة', report.lowestScore],
    ['متوسط الدرجات', report.averageScore],
    ['متوسط النسبة', `${report.averagePercentage}%`],
    ['عدد الناجحين', report.passCount],
    ['عدد الراسبين', report.failCount],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(statsRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'إحصائيات');

  const fileName = `نتائج_${report.className}_${report.examTitle}_${new Date().toLocaleDateString('ar-EG')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ─────────────────────────────────────────────
// EXPORT TO EXCEL - ALL CLASSES FOR TEACHER
// ─────────────────────────────────────────────
export const exportAllClassesResultsToExcel = (stats: ExamStatistics): void => {
  const wb = XLSX.utils.book_new();

  // Sheet per class
  for (const classReport of stats.classReports) {
    const rows = [
      [`امتحان: ${stats.examTitle} - فصل: ${classReport.className}`],
      [],
      ['م', 'اسم الطالب', 'الدرجة', `الدرجة الكلية`, 'النسبة المئوية', 'التقدير', 'الحضور'],
      ...classReport.results.map((r, i) => [
        i + 1,
        r.studentName,
        r.isPresent ? r.score : 'غائب',
        r.totalScore,
        r.isPresent ? `${r.percentage}%` : '-',
        r.isPresent ? r.grade : '-',
        r.isPresent ? 'حاضر' : 'غائب',
      ]),
      [],
      ['الإجمالي'],
      ['عدد الطلاب', classReport.totalStudents],
      ['الحاضرون', classReport.presentCount],
      ['المتوسط', classReport.averageScore],
      ['نسبة النجاح', `${classReport.passCount} / ${classReport.presentCount}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
    ];
    const sheetName = classReport.className.replace(/\//g, '-').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Summary sheet
  const summaryRows = [
    ['ملخص الامتحان'],
    ['عنوان الامتحان', stats.examTitle],
    ['المادة', stats.subjectName],
    ['إجمالي الفصول', stats.totalClasses],
    ['إجمالي الطلاب', stats.totalStudents],
    ['الحاضرون', stats.attendedCount],
    ['الغائبون', stats.totalStudents - stats.attendedCount],
    ['متوسط الدرجات الكلي', stats.averageScore],
    ['نسبة النجاح الكلية', `${stats.passRate}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص العام');

  const fileName = `نتائج_كل_الفصول_${stats.examTitle}_${new Date().toLocaleDateString('ar-EG')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ─────────────────────────────────────────────
// HONOR ROLL - أفضل الطلاب
// ─────────────────────────────────────────────
export interface HonorRollEntry {
  rank: number;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  averagePercentage: number;
  totalExams: number;
  grade: string;
}

export const getHonorRoll = async (
  classId?: string,
  topN: number = 10,
): Promise<HonorRollEntry[]> => {
  const students = await getAllStudents();
  const exams = await getAllExams();
  const finishedExams = exams.filter(e => e.status === 'finished' || e.isPublished);

  const filteredStudents = classId
    ? students.filter(s => s.classId === classId)
    : students;

  const studentScores: HonorRollEntry[] = [];

  for (const student of filteredStudents) {
    let totalPercentage = 0;
    let examCount = 0;

    for (const exam of finishedExams) {
      if (!exam.classIds.includes(student.classId)) continue;
      const answers = await getAllAnswersForExam(exam.id);
      const answer = answers.find(a => a.studentId === student.id);
      if (answer?.isSubmitted && answer.score !== undefined) {
        const pct = exam.totalScore > 0 ? (answer.score / exam.totalScore) * 100 : 0;
        totalPercentage += pct;
        examCount++;
      }
    }

    if (examCount > 0) {
      const avg = totalPercentage / examCount;
      studentScores.push({
        rank: 0,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        averagePercentage: Math.round(avg * 10) / 10,
        totalExams: examCount,
        grade: getGradeLetter(avg),
      });
    }
  }

  // Sort by average percentage descending
  studentScores.sort((a, b) => b.averagePercentage - a.averagePercentage);

  // Assign ranks
  return studentScores.slice(0, topN).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

// ─────────────────────────────────────────────
// ATTENDANCE - سجل الحضور والغياب
// ─────────────────────────────────────────────
export const getAttendanceForExam = async (examId: string): Promise<AttendanceRecord[]> => {
  const local = localAttendance.filter(a => a.examId === examId);
  if (local.length > 0) return local;

  if (!isFirebaseConfigured()) return [];

  try {
    const snap = await getDocs(
      query(collection(db, 'attendance'), where('examId', '==', examId)),
    );
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        examId: data.examId,
        studentId: data.studentId,
        studentName: data.studentName,
        classId: data.classId,
        className: data.className,
        isPresent: data.isPresent,
        markedAt: data.markedAt instanceof Timestamp ? data.markedAt.toDate() : new Date(data.markedAt),
        markedBy: data.markedBy,
      };
    });
  } catch {
    return [];
  }
};

export const markAttendance = async (
  examId: string,
  studentId: string,
  studentName: string,
  classId: string,
  className: string,
  isPresent: boolean,
  markedBy: string,
): Promise<AttendanceRecord> => {
  const existing = localAttendance.findIndex(
    a => a.examId === examId && a.studentId === studentId,
  );

  const record: AttendanceRecord = {
    id: generateId(),
    examId,
    studentId,
    studentName,
    classId,
    className,
    isPresent,
    markedAt: new Date(),
    markedBy,
  };

  if (existing >= 0) {
    localAttendance[existing] = record;
  } else {
    localAttendance.push(record);
  }

  if (!isFirebaseConfigured()) return record;

  try {
    await addDoc(collection(db, 'attendance'), {
      ...record,
      markedAt: serverTimestamp(),
    });
  } catch {
    // local fallback already done
  }

  return record;
};

// ─────────────────────────────────────────────
// AUDIT LOGS - سجل التعديلات
// ─────────────────────────────────────────────
export const getAuditLogs = async (filters?: {
  userId?: string;
  userRole?: string;
  targetType?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<AuditLogEntry[]> => {
  let logs = [...localAuditLogs];

  if (!isFirebaseConfigured()) {
    return applyAuditFilters(logs, filters);
  }

  try {
    let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      logs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          action: data.action,
          userId: data.userId,
          userName: data.userName,
          userRole: data.userRole,
          targetType: data.targetType,
          targetId: data.targetId,
          details: data.details,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
        };
      });
    }
  } catch {
    // fallback to local
  }

  return applyAuditFilters(logs, filters);
};

function applyAuditFilters(
  logs: AuditLogEntry[],
  filters?: {
    userId?: string;
    userRole?: string;
    targetType?: string;
    fromDate?: Date;
    toDate?: Date;
  },
): AuditLogEntry[] {
  let result = [...logs];
  if (!filters) return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters.userId) result = result.filter(l => l.userId === filters.userId);
  if (filters.userRole) result = result.filter(l => l.userRole === filters.userRole);
  if (filters.targetType) result = result.filter(l => l.targetType === filters.targetType);
  if (filters.fromDate) result = result.filter(l => l.timestamp >= filters.fromDate!);
  if (filters.toDate) result = result.filter(l => l.timestamp <= filters.toDate!);

  return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export const addAuditLog = async (entry: Omit<AuditLogEntry, 'id'>): Promise<void> => {
  const newEntry: AuditLogEntry = { ...entry, id: generateId() };
  localAuditLogs.unshift(newEntry);

  if (!isFirebaseConfigured()) return;

  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch {
    // local only
  }
};

// ─────────────────────────────────────────────
// ARCHIVE EXAM - أرشفة الامتحانات
// ─────────────────────────────────────────────
export const archiveExam = async (
  examId: string,
  archivedBy: string,
): Promise<ArchivedExam> => {
  const stats = await getExamStatistics(examId);
  const exams = await getAllExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) throw new Error('الامتحان غير موجود');

  const archived: ArchivedExam = {
    id: generateId(),
    examId,
    examTitle: exam.title,
    subjectName: exam.subjectName,
    classIds: exam.classIds,
    archivedAt: new Date(),
    archivedBy,
    statistics: stats,
  };

  localArchivedExams.push(archived);

  if (isFirebaseConfigured()) {
    try {
      await addDoc(collection(db, 'archivedExams'), {
        ...archived,
        archivedAt: serverTimestamp(),
      });
    } catch {
      // local only
    }
  }

  // Log the action
  await addAuditLog({
    action: 'أرشفة امتحان',
    userId: archivedBy,
    userName: archivedBy,
    userRole: 'admin',
    targetType: 'exam',
    targetId: examId,
    details: `تم أرشفة امتحان "${exam.title}"`,
    timestamp: new Date(),
  });

  return archived;
};

export const getArchivedExams = async (): Promise<ArchivedExam[]> => {
  if (!isFirebaseConfigured()) return [...localArchivedExams];

  try {
    const snap = await getDocs(
      query(collection(db, 'archivedExams'), orderBy('archivedAt', 'desc')),
    );
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          archivedAt: data.archivedAt instanceof Timestamp
            ? data.archivedAt.toDate()
            : new Date(data.archivedAt),
        } as ArchivedExam;
      });
    }
  } catch {
    // fallback
  }

  return [...localArchivedExams];
};
