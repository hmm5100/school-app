// src/services/teacherService.ts

import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Teacher, TeacherPermissions } from '../types';

// ─── Default permissions (all false) ───────────────────────────
export const defaultPermissions: TeacherPermissions = {
  canCreateExams:     false,
  canEditOwnExam:     false,
  canDeleteExam:      false,
  canViewResults:     false,
  canDownloadExcel:   false,
  canEditGrades:      false,
  canCreateQuestions: false,
  canUploadWord:      false,
  canLockExams:       false,
  canReopenStudent:   false,
  canViewAllStudents: false,
  canViewStudentId:   false,
  canManageStudents:  false,
};

// ─── Get all teachers ───────────────────────────────────────────
export const getAllTeachers = async (): Promise<Teacher[]> => {
  const snap = await getDocs(
    query(collection(db, 'teachers'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ ...(d.data() as Teacher), id: d.id }));
};

// ─── Add teacher ────────────────────────────────────────────────
// uid (اختياري): لو بعتناه، بيُحفظ الـ document بنفس الـ uid
// عشان fetchUserProfile يلاقي teachers/{uid} صح
export const addTeacher = async (
  data: Omit<Teacher, 'id' | 'uid' | 'createdAt' | 'isActive'>,
  uid?: string,
): Promise<Teacher> => {
  // لو في uid → استخدمه كـ document ID
  // لو مفيش → اعمل document ID تلقائي (للحالات القديمة)
  const ref = uid
    ? doc(db, 'teachers', uid)
    : doc(collection(db, 'teachers'));

  const teacher: Omit<Teacher, 'id'> = {
    uid: uid || ref.id,
    name: data.name,
    email: data.email,
    subjects: data.subjects || [],
    classes: data.classes || [],
    permissions: data.permissions || { ...defaultPermissions },
    isActive: true,
    createdAt: new Date(),
  };

  await setDoc(ref, { ...teacher, createdAt: serverTimestamp() });

  return { ...teacher, id: ref.id };
};

// ─── Update teacher ─────────────────────────────────────────────
export const updateTeacher = async (
  id: string,
  data: Partial<Omit<Teacher, 'id' | 'uid' | 'createdAt'>>,
): Promise<Teacher> => {
  const ref = doc(db, 'teachers', id);
  await updateDoc(ref, { ...data });
  const snap = await getDoc(ref);
  return { ...(snap.data() as Teacher), id: snap.id };
};

// ─── Delete teacher ─────────────────────────────────────────────
export const deleteTeacher = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'teachers', id));
};

// ─── Get single teacher ─────────────────────────────────────────
export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const snap = await getDoc(doc(db, 'teachers', id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Teacher), id: snap.id };
};

// ─── Role Permissions ────────────────────────────────────────────
export type RoleKey = 'normal' | 'subject' | 'supervisor' | 'vice';

const ROLE_PERMS_DOC = 'settings/rolePermissions';

export const getRolePermissions = async (): Promise<Record<RoleKey, (keyof TeacherPermissions)[]>> => {
  const snap = await getDoc(doc(db, 'settings', 'rolePermissions'));
  if (snap.exists()) {
    return snap.data() as Record<RoleKey, (keyof TeacherPermissions)[]>;
  }
  // قيم افتراضية لو مفيش document
  return { normal: [], subject: [], supervisor: [], vice: [] };
};

export const saveRolePermissions = async (
  role: RoleKey,
  perms: (keyof TeacherPermissions)[],
): Promise<void> => {
  const ref = doc(db, 'settings', 'rolePermissions');
  await setDoc(ref, { [role]: perms }, { merge: true });
};
