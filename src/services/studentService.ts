// src/services/studentService.ts
// إدارة الطلاب - CRUD كامل مع Firestore + fallback محلي

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Student } from '../types';


// ── local in-memory store (للعمليات المؤقتة فقط) ──
let localStudents: Student[] = [];

function isFirebaseConfigured(): boolean {
  try {
    const opts = db.app.options as { projectId?: string };
    return !!(opts.projectId && opts.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// GET ALL STUDENTS
// ─────────────────────────────────────────────
export const getAllStudents = async (): Promise<Student[]> => {
  if (!isFirebaseConfigured()) return [...localStudents];

  try {
    const snap = await getDocs(
      query(collection(db, 'students'), orderBy('className', 'asc')),
    );
    if (snap.empty) return [];
    return snap.docs.map(d => ({ ...(d.data() as Student), id: d.id }));
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────
// GET STUDENTS BY CLASS
// ─────────────────────────────────────────────
export const getStudentsByClass = async (classId: string): Promise<Student[]> => {
  if (!isFirebaseConfigured()) {
    return localStudents.filter(s => s.classId === classId);
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, 'students'),
        where('classId', '==', classId),
        orderBy('number', 'asc'),
      ),
    );
    if (snap.empty) return [];
    return snap.docs.map(d => ({ ...(d.data() as Student), id: d.id }));
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────
// ADD STUDENT
// ─────────────────────────────────────────────
export interface AddStudentPayload {
  name: string;
  classId: string;
  className: string;
  number: number;
  nationalId?: string;
  phone?: string;
  email?: string;
}

export const addStudent = async (payload: AddStudentPayload): Promise<Student> => {
  const newStudent: Omit<Student, 'id'> = {
    name: payload.name.trim(),
    classId: payload.classId,
    className: payload.className,
    number: payload.number,
    nationalId: payload.nationalId?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    createdAt: new Date(),
  };

  if (!isFirebaseConfigured()) {
    const id = 'local_' + Date.now();
    const student: Student = { ...newStudent, id };
    localStudents.push(student);
    return student;
  }

  try {
    const ref = await addDoc(collection(db, 'students'), {
      ...newStudent,
      createdAt: serverTimestamp(),
    });
    const student: Student = { ...newStudent, id: ref.id };
    localStudents.push(student);
    return student;
  } catch {
    const id = 'local_' + Date.now();
    const student: Student = { ...newStudent, id };
    localStudents.push(student);
    return student;
  }
};

// ─────────────────────────────────────────────
// UPDATE STUDENT
// ─────────────────────────────────────────────
export interface UpdateStudentPayload {
  name?: string;
  classId?: string;
  className?: string;
  number?: number;
  nationalId?: string;
  phone?: string;
  email?: string;
}

export const updateStudent = async (
  id: string,
  payload: UpdateStudentPayload,
): Promise<Student> => {
  const updates: Partial<UpdateStudentPayload> = {};
  if (payload.name !== undefined)      updates.name = payload.name.trim();
  if (payload.classId !== undefined)   updates.classId = payload.classId;
  if (payload.className !== undefined) updates.className = payload.className;
  if (payload.number !== undefined)    updates.number = payload.number;
  if (payload.nationalId !== undefined) updates.nationalId = payload.nationalId.trim();
  if (payload.phone !== undefined)     updates.phone = payload.phone.trim();
  if (payload.email !== undefined)     updates.email = payload.email.trim();

  localStudents = localStudents.map(s => s.id === id ? { ...s, ...updates } : s);

  if (!isFirebaseConfigured()) {
    return localStudents.find(s => s.id === id)!;
  }

  try {
    await updateDoc(doc(db, 'students', id), { ...updates, updatedAt: serverTimestamp() });
  } catch { /* local already updated */ }

  return localStudents.find(s => s.id === id)!;
};

// ─────────────────────────────────────────────
// DELETE STUDENT
// ─────────────────────────────────────────────
export const deleteStudent = async (id: string): Promise<void> => {
  localStudents = localStudents.filter(s => s.id !== id);

  if (!isFirebaseConfigured()) return;

  try {
    await deleteDoc(doc(db, 'students', id));
  } catch { /* local already updated */ }
};

// ─────────────────────────────────────────────
// BULK IMPORT STUDENTS (from Excel)
// ─────────────────────────────────────────────
export interface BulkImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

export const bulkImportStudents = async (
  students: Omit<Student, 'id'>[],
): Promise<BulkImportResult> => {
  const result: BulkImportResult = { added: 0, skipped: 0, errors: [] };

  if (!isFirebaseConfigured()) {
    for (const s of students) {
      // Skip duplicates by name + class
      const exists = localStudents.some(
        ls => ls.name === s.name && ls.classId === s.classId,
      );
      if (exists) { result.skipped++; continue; }
      const id = 'local_' + Date.now() + '_' + Math.random();
      localStudents.push({ ...s, id });
      result.added++;
    }
    return result;
  }

  // Batch write to Firestore (max 500 per batch)
  const BATCH_SIZE = 400;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const chunk = students.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const s of chunk) {
      try {
        const ref = doc(collection(db, 'students'));
        batch.set(ref, { ...s, createdAt: serverTimestamp() });
        localStudents.push({ ...s, id: ref.id });
        result.added++;
      } catch (err: unknown) {
        result.errors.push(err instanceof Error ? err.message : 'خطأ في استيراد طالب');
        result.skipped++;
      }
    }

    try {
      await batch.commit();
    } catch (err: unknown) {
      result.errors.push('خطأ في حفظ الدفعة: ' + (err instanceof Error ? err.message : ''));
    }
  }

  return result;
};

// ─────────────────────────────────────────────
// SEARCH STUDENTS
// ─────────────────────────────────────────────
export const searchStudents = (students: Student[], query: string): Student[] => {
  const q = query.trim().toLowerCase();
  if (!q) return students;

  return students.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.className.toLowerCase().includes(q) ||
    (s.nationalId && s.nationalId.includes(q)) ||
    String(s.number).includes(q),
  );
};
