// src/services/materialService.ts
// إدارة المواد الدراسية - CRUD كامل مع Firestore + fallback محلي

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
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Subject } from '../types';

// ─── Default subjects seeded into local state when Firestore unavailable ───
export const defaultSubjects: Subject[] = [
  { id: 's1',  name: 'علم التشريح',            code: 'ANAT101', grade: 'الأول', totalScore: 100 },
  { id: 's2',  name: 'علم وظائف الأعضاء',      code: 'PHYS101', grade: 'الأول', totalScore: 100 },
  { id: 's3',  name: 'التمريض الأساسي',         code: 'NURS101', grade: 'الأول', totalScore: 100 },
  { id: 's4',  name: 'الأحياء',                 code: 'BIO101',  grade: 'الأول', totalScore: 100 },
  { id: 's5',  name: 'الكيمياء',                code: 'CHEM101', grade: 'الأول', totalScore: 100 },
  { id: 's6',  name: 'اللغة العربية',           code: 'ARB101',  grade: 'الأول', totalScore: 100 },
  { id: 's7',  name: 'اللغة الإنجليزية',        code: 'ENG101',  grade: 'الأول', totalScore: 100 },
  { id: 's8',  name: 'الرياضيات',               code: 'MATH101', grade: 'الأول', totalScore: 100 },
  { id: 's9',  name: 'الفيزياء',                code: 'PHY101',  grade: 'الأول', totalScore: 100 },
  { id: 's10', name: 'التربية الدينية',          code: 'REL101',  grade: 'الأول', totalScore: 100 },
  { id: 's11', name: 'التربية الوطنية',          code: 'CIV101',  grade: 'الأول', totalScore: 100 },
  { id: 's12', name: 'الصحة العامة والتمريض',   code: 'PH101',   grade: 'الأول', totalScore: 100 },
];

// Local in-memory store (fallback when Firebase not configured)
let localSubjects: Subject[] = [...defaultSubjects];

function isFirebaseConfigured(): boolean {
  try {
    // If projectId is placeholder, Firebase is not configured
    const app = db.app;
    const opts = app.options as { projectId?: string };
    return !!(opts.projectId && opts.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// GET ALL SUBJECTS
// ─────────────────────────────────────────────
export const getAllSubjects = async (): Promise<Subject[]> => {
  if (!isFirebaseConfigured()) return [...localSubjects];

  try {
    const snap = await getDocs(
      query(collection(db, 'subjects'), orderBy('name', 'asc')),
    );
    if (snap.empty) return [...localSubjects];
    return snap.docs.map(d => ({ ...(d.data() as Subject), id: d.id }));
  } catch {
    return [...localSubjects];
  }
};

// ─────────────────────────────────────────────
// GET SUBJECTS BY TEACHER UID
// ─────────────────────────────────────────────
export const getSubjectsByTeacher = async (teacherUid: string): Promise<Subject[]> => {
  if (!isFirebaseConfigured()) {
    return localSubjects.filter(s => s.teacherId === teacherUid);
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'subjects'), where('teacherId', '==', teacherUid)),
    );
    return snap.docs.map(d => ({ ...(d.data() as Subject), id: d.id }));
  } catch {
    return localSubjects.filter(s => s.teacherId === teacherUid);
  }
};

// ─────────────────────────────────────────────
// GET SUBJECT BY ID
// ─────────────────────────────────────────────
export const getSubjectById = async (id: string): Promise<Subject | null> => {
  if (!isFirebaseConfigured()) {
    return localSubjects.find(s => s.id === id) || null;
  }

  try {
    const snap = await getDoc(doc(db, 'subjects', id));
    if (!snap.exists()) return null;
    return { ...(snap.data() as Subject), id: snap.id };
  } catch {
    return localSubjects.find(s => s.id === id) || null;
  }
};

// ─────────────────────────────────────────────
// ADD SUBJECT
// ─────────────────────────────────────────────
export interface AddSubjectPayload {
  name: string;
  code: string;
  grade: string;
  teacherId?: string;
  totalScore: number;
  assignedClassIds?: string[];   // فصول مرتبطة بالمادة
}

export const addSubject = async (payload: AddSubjectPayload): Promise<Subject> => {
  const newSubject: Omit<Subject, 'id'> & { assignedClassIds?: string[] } = {
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    grade: payload.grade,
    teacherId: payload.teacherId || undefined,
    totalScore: payload.totalScore,
    assignedClassIds: payload.assignedClassIds || [],
  };

  if (!isFirebaseConfigured()) {
    const id = 's' + Date.now();
    const subject: Subject = { ...newSubject, id };
    localSubjects.push(subject);
    return subject;
  }

  try {
    const ref = await addDoc(collection(db, 'subjects'), {
      ...newSubject,
      createdAt: serverTimestamp(),
    });
    const subject: Subject = { ...newSubject, id: ref.id };
    localSubjects.push(subject);
    return subject;
  } catch {
    const id = 's' + Date.now();
    const subject: Subject = { ...newSubject, id };
    localSubjects.push(subject);
    return subject;
  }
};

// ─────────────────────────────────────────────
// UPDATE SUBJECT
// ─────────────────────────────────────────────
export interface UpdateSubjectPayload {
  name?: string;
  code?: string;
  grade?: string;
  teacherId?: string;
  totalScore?: number;
  assignedClassIds?: string[];
}

export const updateSubject = async (
  id: string,
  payload: UpdateSubjectPayload,
): Promise<Subject> => {
  const updates: Partial<UpdateSubjectPayload> = {};
  if (payload.name !== undefined)           updates.name = payload.name.trim();
  if (payload.code !== undefined)           updates.code = payload.code.trim().toUpperCase();
  if (payload.grade !== undefined)          updates.grade = payload.grade;
  if (payload.teacherId !== undefined)      updates.teacherId = payload.teacherId;
  if (payload.totalScore !== undefined)     updates.totalScore = payload.totalScore;
  if (payload.assignedClassIds !== undefined) updates.assignedClassIds = payload.assignedClassIds;

  // Update local
  localSubjects = localSubjects.map(s =>
    s.id === id ? { ...s, ...updates } : s,
  );

  if (!isFirebaseConfigured()) {
    return localSubjects.find(s => s.id === id)!;
  }

  try {
    await updateDoc(doc(db, 'subjects', id), { ...updates, updatedAt: serverTimestamp() });
  } catch {
    // local already updated
  }

  return localSubjects.find(s => s.id === id)!;
};

// ─────────────────────────────────────────────
// DELETE SUBJECT
// ─────────────────────────────────────────────
export const deleteSubject = async (id: string): Promise<void> => {
  localSubjects = localSubjects.filter(s => s.id !== id);

  if (!isFirebaseConfigured()) return;

  try {
    await deleteDoc(doc(db, 'subjects', id));
  } catch {
    // local already updated
  }
};

// ─────────────────────────────────────────────
// ASSIGN TEACHER TO SUBJECT
// ─────────────────────────────────────────────
export const assignTeacherToSubject = async (
  subjectId: string,
  teacherId: string,
): Promise<void> => {
  await updateSubject(subjectId, { teacherId });
};

// ─────────────────────────────────────────────
// ASSIGN SUBJECT TO CLASSES
// ─────────────────────────────────────────────
export const assignSubjectToClasses = async (
  subjectId: string,
  classIds: string[],
): Promise<void> => {
  await updateSubject(subjectId, { assignedClassIds: classIds });
};

// ─────────────────────────────────────────────
// GET SUBJECTS FOR CLASS
// ─────────────────────────────────────────────
export const getSubjectsForClass = async (classId: string): Promise<Subject[]> => {
  const all = await getAllSubjects();
  return all.filter(s => {
    const s2 = s as Subject & { assignedClassIds?: string[] };
    return !s2.assignedClassIds || s2.assignedClassIds.length === 0 || s2.assignedClassIds.includes(classId);
  });
};
