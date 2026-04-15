// src/services/gradeService.ts
// نظام الدرجات المرتبط بالامتحانات الحقيقية

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Grade, Exam, StudentAnswer } from '../types';
import { getAllAnswersForExam } from './examService';
import { notifyExamGraded } from './notificationService';

// ─── Convert Firestore doc → Grade ─────────────
function docToGrade(id: string, data: Record<string, unknown>): Grade {
  return {
    id,
    studentId: (data.studentId as string) || '',
    studentName: (data.studentName as string) || '',
    classId: (data.classId as string) || '',
    subjectId: (data.subjectId as string) || '',
    subjectName: (data.subjectName as string) || '',
    examId: data.examId as string | undefined,
    score: (data.score as number) || 0,
    totalScore: (data.totalScore as number) || 0,
    percentage: (data.percentage as number) || 0,
    grade: (data.grade as string) || 'F',
    teacherId: (data.teacherId as string) || '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    editedAt: data.editedAt instanceof Timestamp ? data.editedAt.toDate() : undefined,
    editedBy: data.editedBy as string | undefined,
  };
}

// ─────────────────────────────────────────────
// GET ALL GRADES
// ─────────────────────────────────────────────
export const getAllGrades = async (): Promise<Grade[]> => {
  try {
    const snap = await getDocs(
      query(collection(db, 'grades'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map(d => docToGrade(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getAllGrades error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET GRADES BY STUDENT
// ─────────────────────────────────────────────
export const getGradesByStudent = async (studentId: string): Promise<Grade[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'grades'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map(d => docToGrade(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getGradesByStudent error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET GRADES BY CLASS
// ─────────────────────────────────────────────
export const getGradesByClass = async (classId: string): Promise<Grade[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'grades'),
        where('classId', '==', classId),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map(d => docToGrade(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getGradesByClass error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET GRADES BY EXAM
// ─────────────────────────────────────────────
export const getGradesByExam = async (examId: string): Promise<Grade[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'grades'),
        where('examId', '==', examId),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map(d => docToGrade(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getGradesByExam error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// CALCULATE GRADE LETTER
// ─────────────────────────────────────────────
export const calculateGradeLetter = (percentage: number): string => {
  if (percentage >= 85) return 'A';
  if (percentage >= 75) return 'B';
  if (percentage >= 65) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// ─────────────────────────────────────────────
// GENERATE GRADES FROM EXAM
// يتم استدعاؤها تلقائياً عند انتهاء الامتحان
// ─────────────────────────────────────────────
export const generateGradesFromExam = async (
  exam: Exam,
  studentAnswers: StudentAnswer[]
): Promise<Grade[]> => {
  const grades: Grade[] = [];

  for (const answer of studentAnswers) {
    if (!answer.isSubmitted || answer.score === undefined) continue;

    const percentage = (answer.score / exam.totalScore) * 100;
    const gradeLetter = calculateGradeLetter(percentage);

    const gradeData = {
      studentId: answer.studentId,
      studentName: answer.studentName || 'طالب غير معروف',
      classId: exam.classIds[0] || '', // نأخذ أول فصل
      subjectId: exam.subjectId,
      subjectName: exam.subjectName,
      examId: exam.id,
      score: answer.score,
      totalScore: exam.totalScore,
      percentage: Math.round(percentage * 100) / 100,
      grade: gradeLetter,
      teacherId: exam.teacherId,
      createdAt: serverTimestamp(),
    };

    try {
      const ref = await addDoc(collection(db, 'grades'), gradeData);
      
      const newGrade: Grade = {
        id: ref.id,
        ...gradeData,
        createdAt: new Date(),
      };
      
      grades.push(newGrade);

      // إرسال إشعار للطالب بتصحيح الامتحان
      notifyExamGraded(answer.studentId, exam.title, Math.round(percentage));
    } catch (err) {
      console.error('Error creating grade:', err);
    }
  }

  return grades;
};

// ─────────────────────────────────────────────
// UPDATE GRADE (للتصحيح اليدوي)
// ─────────────────────────────────────────────
export const updateGrade = async (
  gradeId: string,
  newScore: number,
  totalScore: number,
  editedBy: string
): Promise<void> => {
  const percentage = (newScore / totalScore) * 100;
  const gradeLetter = calculateGradeLetter(percentage);

  try {
    await updateDoc(doc(db, 'grades', gradeId), {
      score: newScore,
      percentage: Math.round(percentage * 100) / 100,
      grade: gradeLetter,
      editedAt: serverTimestamp(),
      editedBy,
    });
  } catch (err) {
    console.error('updateGrade error:', err);
    throw new Error('فشل تحديث الدرجة.');
  }
};

// ─────────────────────────────────────────────
// DELETE GRADE
// ─────────────────────────────────────────────
export const deleteGrade = async (gradeId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'grades', gradeId));
  } catch (err) {
    console.error('deleteGrade error:', err);
    throw new Error('فشل حذف الدرجة.');
  }
};

// ─────────────────────────────────────────────
// GET CLASS STATISTICS
// ─────────────────────────────────────────────
export interface ClassStatistics {
  classId: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

export const getClassStatistics = async (
  classId: string,
  examId?: string
): Promise<ClassStatistics> => {
  let grades: Grade[];
  
  if (examId) {
    grades = await getGradesByExam(examId);
    grades = grades.filter(g => g.classId === classId);
  } else {
    grades = await getGradesByClass(classId);
  }

  if (grades.length === 0) {
    return {
      classId,
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    };
  }

  const scores = grades.map(g => g.score);
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const averageScore = totalScore / grades.length;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passedCount = grades.filter(g => g.percentage >= 50).length;
  const passRate = (passedCount / grades.length) * 100;

  const gradeDistribution = {
    A: grades.filter(g => g.grade === 'A').length,
    B: grades.filter(g => g.grade === 'B').length,
    C: grades.filter(g => g.grade === 'C').length,
    D: grades.filter(g => g.grade === 'D').length,
    F: grades.filter(g => g.grade === 'F').length,
  };

  return {
    classId,
    totalStudents: grades.length,
    averageScore: Math.round(averageScore * 100) / 100,
    highestScore,
    lowestScore,
    passRate: Math.round(passRate * 100) / 100,
    gradeDistribution,
  };
};

// ─────────────────────────────────────────────
// GET STUDENT STATISTICS
// ─────────────────────────────────────────────
export interface StudentStatistics {
  studentId: string;
  totalExams: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  mostCommonGrade: string;
  subjectPerformance: {
    subjectId: string;
    subjectName: string;
    averagePercentage: number;
    examCount: number;
  }[];
}

export const getStudentStatistics = async (studentId: string): Promise<StudentStatistics> => {
  const grades = await getGradesByStudent(studentId);

  if (grades.length === 0) {
    return {
      studentId,
      totalExams: 0,
      averageScore: 0,
      averagePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      mostCommonGrade: 'N/A',
      subjectPerformance: [],
    };
  }

  const scores = grades.map(g => g.score);
  const percentages = grades.map(g => g.percentage);
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
  const averageScore = totalScore / grades.length;
  const averagePercentage = totalPercentage / grades.length;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  // Most common grade
  const gradeCounts = grades.reduce((acc, g) => {
    acc[g.grade] = (acc[g.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostCommonGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Subject performance
  const subjectMap = new Map<string, { total: number; count: number; name: string }>();
  grades.forEach(g => {
    if (!subjectMap.has(g.subjectId)) {
      subjectMap.set(g.subjectId, { total: 0, count: 0, name: g.subjectName });
    }
    const subject = subjectMap.get(g.subjectId)!;
    subject.total += g.percentage;
    subject.count += 1;
  });

  const subjectPerformance = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
    subjectId,
    subjectName: data.name,
    averagePercentage: Math.round((data.total / data.count) * 100) / 100,
    examCount: data.count,
  }));

  return {
    studentId,
    totalExams: grades.length,
    averageScore: Math.round(averageScore * 100) / 100,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    highestScore,
    lowestScore,
    mostCommonGrade,
    subjectPerformance,
  };
};
