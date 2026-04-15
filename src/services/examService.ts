// src/services/examService.ts
// نظام الامتحانات - Firebase مباشرة بدون fallback محلي

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Exam, Question, StudentAnswer } from '../types';

// ─── ID Generators ────────────────────────────
function generateId(): string {
  return `exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Convert Firestore doc → Exam ─────────────
function docToExam(id: string, data: Record<string, unknown>): Exam {
  return {
    id,
    title:       (data.title as string) || '',
    subjectId:   (data.subjectId as string) || '',
    subjectName: (data.subjectName as string) || '',
    classIds:    (data.classIds as string[]) || [],
    teacherId:   (data.teacherId as string) || '',
    teacherName: (data.teacherName as string) || '',
    duration:    (data.duration as number) || 60,
    totalScore:  (data.totalScore as number) || 0,
    isLocked:    (data.isLocked as boolean) || false,
    isPublished: (data.isPublished as boolean) || false,
    model:       (data.model as 'A' | 'B' | 'C' | 'D') || 'A',
    status:      (data.status as 'draft' | 'active' | 'finished') || 'draft',
    questions:   (data.questions as Question[]) || [],
    startTime:   data.startTime instanceof Timestamp ? data.startTime.toDate() : undefined,
    endTime:     data.endTime instanceof Timestamp ? data.endTime.toDate() : undefined,
    createdAt:   data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

// ─────────────────────────────────────────────
// GET ALL EXAMS
// ─────────────────────────────────────────────
export const getAllExams = async (): Promise<Exam[]> => {
  try {
    const snap = await getDocs(
      query(collection(db, 'exams'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map(d => docToExam(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getAllExams error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET EXAMS BY TEACHER
// ─────────────────────────────────────────────
export const getExamsByTeacher = async (teacherId: string): Promise<Exam[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'exams'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map(d => docToExam(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getExamsByTeacher error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET EXAMS BY CLASS
// ─────────────────────────────────────────────
export const getExamsByClass = async (classId: string): Promise<Exam[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'exams'),
        where('classIds', 'array-contains', classId),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map(d => docToExam(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getExamsByClass error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET SINGLE EXAM
// ─────────────────────────────────────────────
export const getExamById = async (examId: string): Promise<Exam | null> => {
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (!snap.exists()) return null;
    return docToExam(snap.id, snap.data() as Record<string, unknown>);
  } catch (err) {
    console.error('getExamById error:', err);
    return null;
  }
};

// ─────────────────────────────────────────────
// CREATE EXAM
// ─────────────────────────────────────────────
export interface CreateExamInput {
  title: string;
  subjectId: string;
  subjectName: string;
  classIds: string[];
  teacherId: string;
  teacherName: string;
  duration: number;
  totalScore: number;
  questions: Question[];
  startTime?: Date;
  endTime?: Date;
}


// ─────────────────────────────────────────────
// SANITIZE QUESTION (strip non-Firestore fields: imageDataUrl, isExpanded)
// ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeQuestion(q: any): Question {
  return {
    id:            q.id,
    type:          q.type,
    text:          q.text,
    score:         q.score,
    order:         q.order,
    correctAnswer: q.correctAnswer,
    ...(q.options     !== undefined && { options:     q.options }),
    ...(q.imageURL    !== undefined && { imageURL:    q.imageURL }),
    ...(q.blanks      !== undefined && { blanks:      q.blanks }),
    ...(q.compareData !== undefined && { compareData: q.compareData }),
  };
}

export const createExam = async (input: CreateExamInput): Promise<Exam> => {
  const totalScore = input.questions.reduce((sum, q) => sum + q.score, 0);

  const payload = {
    title:       input.title,
    subjectId:   input.subjectId,
    subjectName: input.subjectName,
    classIds:    input.classIds,
    teacherId:   input.teacherId,
    teacherName: input.teacherName,
    duration:    input.duration,
    totalScore,
    questions:   input.questions.map(sanitizeQuestion),
    isLocked:    false,
    isPublished: false,
    model:       'A',
    status:      'draft',
    createdAt:   serverTimestamp(),
    startTime:   input.startTime || null,
    endTime:     input.endTime || null,
  };

  try {
    const ref = await addDoc(collection(db, 'exams'), payload);
    return {
      id:          ref.id,
      title:       input.title,
      subjectId:   input.subjectId,
      subjectName: input.subjectName,
      classIds:    input.classIds,
      teacherId:   input.teacherId,
      teacherName: input.teacherName,
      duration:    input.duration,
      totalScore,
      questions:   input.questions,
      isLocked:    false,
      isPublished: false,
      model:       'A',
      status:      'draft',
      createdAt:   new Date(),
    };
  } catch (err) {
    console.error('createExam error:', err);
    throw new Error('فشل إنشاء الامتحان. تحقق من الاتصال بالإنترنت.');
  }
};

// ─────────────────────────────────────────────
// UPDATE EXAM
// ─────────────────────────────────────────────
export const updateExam = async (
  examId: string,
  updates: Partial<Omit<Exam, 'id' | 'createdAt'>>,
): Promise<void> => {
  if (updates.questions) {
    updates.questions = updates.questions.map(sanitizeQuestion);
    updates.totalScore = updates.questions.reduce((sum, q) => sum + q.score, 0);
  }

  try {
    await updateDoc(doc(db, 'exams', examId), {
      ...updates,
      startTime: updates.startTime || null,
      endTime:   updates.endTime || null,
    });
  } catch (err) {
    console.error('updateExam error:', err);
    throw new Error('فشل تحديث الامتحان.');
  }
};
// ─────────────────────────────────────────────
// UPDATE EXAM CLASSES
// ─────────────────────────────────────────────
export const updateExamClasses = async (examId: string, classIds: string[]): Promise<void> => {
  try {
    await updateDoc(doc(db, 'exams', examId), { classIds });
  } catch (err) {
    console.error('updateExamClasses error:', err);
    throw new Error('فشل تحديث فصول الامتحان.');
  }
};

// ─────────────────────────────────────────────
// DELETE EXAM
// ─────────────────────────────────────────────
export const deleteExam = async (examId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    console.error('deleteExam error:', err);
    throw new Error('فشل حذف الامتحان.');
  }
};

// ─────────────────────────────────────────────
// PUBLISH / UNPUBLISH EXAM
// ─────────────────────────────────────────────
export const publishExam = async (examId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      isPublished: true,
      status: 'active',
    });
  } catch (err) {
    console.error('publishExam error:', err);
    throw new Error('فشل نشر الامتحان.');
  }
};

export const unpublishExam = async (examId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      isPublished: false,
      status: 'draft',
    });
  } catch (err) {
    console.error('unpublishExam error:', err);
    throw new Error('فشل إلغاء نشر الامتحان.');
  }
};

// ─────────────────────────────────────────────
// LOCK / UNLOCK EXAM
// ─────────────────────────────────────────────
export const lockExam = async (examId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      isLocked: true,
      status: 'finished',
    });
  } catch (err) {
    console.error('lockExam error:', err);
    throw new Error('فشل قفل الامتحان.');
  }
};

export const unlockExam = async (examId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      isLocked: false,
      status: 'active',
    });
  } catch (err) {
    console.error('unlockExam error:', err);
    throw new Error('فشل فتح الامتحان.');
  }
};

// ─────────────────────────────────────────────
// GENERATE SHUFFLED MODELS (A, B, C, D)
// ─────────────────────────────────────────────
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateExamModel(
  questions: Question[],
  model: 'A' | 'B' | 'C' | 'D',
): Question[] {
  const shuffled = shuffleArray(questions).map((q, idx) => ({
    ...q,
    order: idx + 1,
    options: q.options && q.type === 'multiple_choice'
      ? shuffleArray(q.options)
      : q.options,
  }));
  return shuffled;
}

export function assignModelToStudent(
  studentId: string,
  availableModels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'],
): 'A' | 'B' | 'C' | 'D' {
  const hash = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return availableModels[hash % availableModels.length];
}

// ─────────────────────────────────────────────
// STUDENT ANSWERS - Save (مع debounce 15 ثانية)
// ─────────────────────────────────────────────
const pendingAnswers: Map<string, {
  examId: string;
  studentId: string;
  studentName?: string;
  model: 'A' | 'B' | 'C' | 'D';
  answers: Record<string, string | string[]>;
  timer: ReturnType<typeof setTimeout>;
}> = new Map();

const flushAnswersToFirebase = async (key: string): Promise<void> => {
  const pending = pendingAnswers.get(key);
  if (!pending) return;
  const { examId, studentId, model, answers } = pending;
  pendingAnswers.delete(key);

  const answerId = `ans_${examId}_${studentId}`;
  try {
    const ansRef = doc(db, 'studentAnswers', answerId);
    const snap = await getDoc(ansRef);
    if (snap.exists()) {
      const updatePayload: Record<string, string | string[]> = {};
      Object.entries(answers).forEach(([qId, ans]) => {
        updatePayload[`answers.${qId}`] = ans;
      });
      await updateDoc(ansRef, updatePayload);
    } else {
      await setDoc(ansRef, {
        examId,
        studentId,
        studentName: pending.studentName || '',
        answers,
        startedAt: serverTimestamp(),
        model,
        isSubmitted: false,
        autoGraded: false,
      });
    }
  } catch (err) {
    console.error('flushAnswersToFirebase error:', err);
  }
};

export const saveStudentAnswer = async (
  examId: string,
  studentId: string,
  questionId: string,
  answer: string | string[],
  model: 'A' | 'B' | 'C' | 'D',
): Promise<void> => {
  const key = `${examId}_${studentId}`;
  const existing = pendingAnswers.get(key);

  if (existing) {
    existing.answers[questionId] = answer;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushAnswersToFirebase(key), 15_000);
  } else {
    const timer = setTimeout(() => flushAnswersToFirebase(key), 15_000);
    pendingAnswers.set(key, { examId, studentId, model, answers: { [questionId]: answer }, timer });
  }
};

// ─────────────────────────────────────────────
// STUDENT ANSWERS - Get
// ─────────────────────────────────────────────
export const getStudentAnswers = async (
  examId: string,
  studentId: string,
): Promise<StudentAnswer | null> => {
  try {
    const answerId = `ans_${examId}_${studentId}`;
    const snap = await getDoc(doc(db, 'studentAnswers', answerId));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      id:          snap.id,
      examId:      data.examId as string,
      studentId:   data.studentId as string,
      answers:     (data.answers as Record<string, string | string[]>) || {},
      startedAt:   data.startedAt instanceof Timestamp ? data.startedAt.toDate() : new Date(),
      submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : undefined,
      model:       (data.model as 'A' | 'B' | 'C' | 'D') || 'A',
      isSubmitted: (data.isSubmitted as boolean) || false,
      autoGraded:  (data.autoGraded as boolean) || false,
      score:       data.score as number | undefined,
    };
  } catch (err) {
    console.error('getStudentAnswers error:', err);
    return null;
  }
};

// ─────────────────────────────────────────────
// STUDENT ANSWERS - Submit
// ─────────────────────────────────────────────
export const submitStudentExam = async (
  examId: string,
  studentId: string,
  exam: Exam,
): Promise<{ score: number; total: number }> => {
  const key = `${examId}_${studentId}`;
  const pending = pendingAnswers.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    await flushAnswersToFirebase(key);
  }

  const existing = await getStudentAnswers(examId, studentId);
  const answers = existing?.answers || {};

  let score = 0;
  exam.questions.forEach(q => {
    const studentAnswer = answers[q.id];
    if (studentAnswer === undefined || studentAnswer === null) return;

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      // مقارنة مباشرة
      if (studentAnswer === q.correctAnswer) score += q.score;

    } else if (q.type === 'fill_blank') {
      // إجابة fill_blank: نص — نقارن بعد تنظيف المسافات وتجاهل حالة الأحرف
      const correct = (q.correctAnswer as string || '').trim().toLowerCase();
      const given   = (studentAnswer as string || '').trim().toLowerCase();
      if (given && given === correct) score += q.score;

    } else if (q.type === 'compare') {
      // إجابة compare: مصفوفة من الإجابات لكل عنصر
      // correctAnswer مخزن كـ JSON array أو string مفصول بـ "|"
      if (Array.isArray(studentAnswer) && q.correctAnswer) {
        let correctAnswers: string[] = [];
        try {
          correctAnswers = typeof q.correctAnswer === 'string'
            ? JSON.parse(q.correctAnswer)
            : (q.correctAnswer as unknown as string[]);
        } catch {
          correctAnswers = (q.correctAnswer as string).split('|');
        }
        const totalParts   = correctAnswers.length;
        const correctParts = studentAnswer.filter(
          (ans, i) => (ans || '').trim().toLowerCase() === (correctAnswers[i] || '').trim().toLowerCase()
        ).length;
        // درجة جزئية: نسبة الأجزاء الصح
        if (totalParts > 0) {
          score += Math.round((correctParts / totalParts) * q.score);
        }
      }

    } else if (q.type === 'short_answer') {
      // short_answer: تصحيح يدوي — مش بيتحسب أوتوماتيك
      // بس لو المدرس حط correctAnswer نقارن بيه
      if (q.correctAnswer) {
        const correct = (q.correctAnswer as string).trim().toLowerCase();
        const given   = (studentAnswer as string || '').trim().toLowerCase();
        if (given && given === correct) score += q.score;
      }
      // essay: تصحيح يدوي فقط — مش بيتحسب أوتوماتيك
    }
  });

  try {
    const answerId = `ans_${examId}_${studentId}`;
    await updateDoc(doc(db, 'studentAnswers', answerId), {
      isSubmitted: true,
      submittedAt: serverTimestamp(),
      score,
      autoGraded: true,
    });
  } catch (err) {
    console.error('submitStudentExam error:', err);
  }

  return { score, total: exam.totalScore };
};

// ─────────────────────────────────────────────
// GET ALL ANSWERS FOR EXAM (teacher view)
// ─────────────────────────────────────────────
export const getAllAnswersForExam = async (examId: string): Promise<StudentAnswer[]> => {
  try {
    const snap = await getDocs(
      query(collection(db, 'studentAnswers'), where('examId', '==', examId)),
    );
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        id:          d.id,
        examId:      data.examId as string,
        studentId:   data.studentId as string,
        studentName: data.studentName as string | undefined,
        answers:     (data.answers as Record<string, string | string[]>) || {},
        startedAt:   data.startedAt instanceof Timestamp ? data.startedAt.toDate() : new Date(),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : undefined,
        model:       (data.model as 'A' | 'B' | 'C' | 'D') || 'A',
        isSubmitted: (data.isSubmitted as boolean) || false,
        autoGraded:  (data.autoGraded as boolean) || false,
        score:       data.score as number | undefined,
      };
    });
  } catch (err) {
    console.error('getAllAnswersForExam error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// QUESTION BANK
// ─────────────────────────────────────────────
export interface BankQuestion extends Question {
  subjectId: string;
  subjectName: string;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export const getQuestionBank = async (subjectId?: string): Promise<BankQuestion[]> => {
  try {
    const q = subjectId
      ? query(collection(db, 'questionBank'), where('subjectId', '==', subjectId))
      : query(collection(db, 'questionBank'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        id:          d.id,
        type:        (data.type as Question['type']) || 'multiple_choice',
        text:        (data.text as string) || '',
        options:     data.options as string[] | undefined,
        correctAnswer: (data.correctAnswer as string) || '',
        score:       (data.score as number) || 5,
        order:       (data.order as number) || 0,
        imageURL:    data.imageURL as string | undefined,
        subjectId:   (data.subjectId as string) || '',
        subjectName: (data.subjectName as string) || '',
        createdBy:   (data.createdBy as string) || '',
        createdAt:   data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        usageCount:  (data.usageCount as number) || 0,
      };
    });
  } catch (err) {
    console.error('getQuestionBank error:', err);
    return [];
  }
};

export const addQuestionToBank = async (
  question: Omit<BankQuestion, 'id' | 'createdAt' | 'usageCount'>,
): Promise<BankQuestion> => {
  try {
    const ref = await addDoc(collection(db, 'questionBank'), {
      ...question,
      createdAt: serverTimestamp(),
      usageCount: 0,
    });
    return { ...question, id: ref.id, createdAt: new Date(), usageCount: 0 };
  } catch (err) {
    console.error('addQuestionToBank error:', err);
    throw new Error('فشل إضافة السؤال للبنك.');
  }
};

export const deleteQuestionFromBank = async (questionId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'questionBank', questionId));
  } catch (err) {
    console.error('deleteQuestionFromBank error:', err);
    throw new Error('فشل حذف السؤال.');
  }
};

// ─────────────────────────────────────────────
// PARSE QUESTIONS FROM TEXT
// ─────────────────────────────────────────────
export interface ParsedQuestion {
  type: 'multiple_choice' | 'true_false';
  text: string;
  options: string[];
  correctAnswer: string;
  score: number;
}

export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: string[] = [];
  let correctIndex = -1;

  const questionRegex    = /^(\d+)[.)-]\s+(.+)$/;
  const optionRegex      = /^([أبجدABCDabcd1234])[.)-]\s+(.+)$/;
  const correctMarkRegex = /^\*|✓|✔|correct|صح/i;
  const trueFalseRegex   = /(صح|خطأ|صواب|خطا|true|false)/i;

  for (const line of lines) {
    const qMatch = questionRegex.exec(line);
    if (qMatch) {
      if (currentQuestion?.text) {
        if (currentOptions.length === 2 && trueFalseRegex.test(currentOptions[0]) && trueFalseRegex.test(currentOptions[1])) {
          questions.push({ type: 'true_false', text: currentQuestion.text, options: ['صح', 'خطأ'], correctAnswer: correctIndex >= 0 ? currentOptions[correctIndex] : 'صح', score: 5 });
        } else if (currentOptions.length >= 2) {
          questions.push({ type: 'multiple_choice', text: currentQuestion.text, options: currentOptions, correctAnswer: correctIndex >= 0 ? currentOptions[correctIndex] : currentOptions[0], score: 5 });
        }
      }
      currentQuestion = { text: qMatch[2] };
      currentOptions  = [];
      correctIndex    = -1;
      continue;
    }
    const optMatch = optionRegex.exec(line);
    if (optMatch && currentQuestion) {
      const optText = optMatch[2].replace(/\*|✓|✔/g, '').trim();
      if (correctMarkRegex.test(optMatch[2]) || line.includes('*') || line.includes('✓')) correctIndex = currentOptions.length;
      currentOptions.push(optText);
    }
  }

  if (currentQuestion?.text && currentOptions.length >= 2) {
    if (currentOptions.length === 2 && trueFalseRegex.test(currentOptions[0]) && trueFalseRegex.test(currentOptions[1])) {
      questions.push({ type: 'true_false', text: currentQuestion.text, options: ['صح', 'خطأ'], correctAnswer: correctIndex >= 0 ? currentOptions[correctIndex] : 'صح', score: 5 });
    } else {
      questions.push({ type: 'multiple_choice', text: currentQuestion.text, options: currentOptions, correctAnswer: correctIndex >= 0 ? currentOptions[correctIndex] : currentOptions[0], score: 5 });
    }
  }

  return questions;
}

// ─────────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────────
export function isExamTimeExpired(exam: Exam, startedAt: Date): boolean {
  const elapsed = (new Date().getTime() - startedAt.getTime()) / 1000 / 60;
  return elapsed >= exam.duration;
}

export function getRemainingTime(exam: Exam, startedAt: Date): number {
  const elapsed = (new Date().getTime() - startedAt.getTime()) / 1000 / 60;
  return Math.max(0, exam.duration - elapsed);
}
