// src/services/auth.ts

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole, Student, Teacher } from '../types';
import { normalizeArabic } from '../utils/normalizeArabic';

// ─────────────────────────────────────────────
// Teacher / Admin login via Firebase Auth
// ─────────────────────────────────────────────
export const loginWithEmail = async (
  email: string,
  password: string,
): Promise<{ user: FirebaseUser; profile: User }> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);

  const userRef = doc(db, 'users', credential.user.uid);
  const userSnap = await getDoc(userRef);

  let profile: User;

  if (userSnap.exists()) {
    profile = { ...(userSnap.data() as User), id: userSnap.id };
  } else {
    profile = {
      id: credential.user.uid,
      uid: credential.user.uid,
      email: credential.user.email || '',
      displayName: credential.user.displayName || 'مدير النظام',
      role: 'admin',
      createdAt: new Date(),
      isActive: true,
    };
    await setDoc(userRef, { ...profile, createdAt: serverTimestamp() });
  }

  // لو المستخدم مدرس → جيب الـ permissions من teachers collection
  if (profile.role === 'teacher') {
    try {
      const teacherSnap = await getDoc(doc(db, 'teachers', credential.user.uid));
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data() as Teacher;
        if (teacherData.permissions) {
          profile.permissions = teacherData.permissions;
        }
      }
    } catch {
      // لو مش لاقي teacher document → خلي profile زي ما هو
    }
  }

  return { user: credential.user, profile };
};

// ─────────────────────────────────────────────
// Student login
// الطالب يدخل: الاسم + (رقم قومي أو تاريخ ميلاد)
// البحث بالاسم مرن: همزات / ألف مقصورة / مسافات
// ─────────────────────────────────────────────

export interface StudentLoginResult {
  student: Student;
  allowedSubjects: string[];
}

// تحقق من تطابق تاريخ الميلاد بأي صيغة
function birthDateMatch(input: string, stored: string): boolean {
  // نظّف المدخل من أي رموز
  const clean = (s: string) => s.replace(/[^\d]/g, '');
  const ci = clean(input);
  const cs = clean(stored); // مخزون بصيغة DD/MM/YYYY → digits فقط: DDMMYYYY

  if (!ci || !cs) return false;

  // مقارنة مباشرة بعد إزالة الرموز (17012010 === 17012010)
  if (ci === cs) return true;

  // لو أدخل YYYY/MM/DD أو YYYYMMDD → اقلبها
  if (ci.length === 8) {
    const ddmmyyyy = ci.slice(4) + ci.slice(2, 4) + ci.slice(0, 4); // YYYYMMDD→DDMMYYYY
    if (ddmmyyyy === cs) return true;
    const ddmmyyyy2 = ci.slice(0, 2) + ci.slice(2, 4) + ci.slice(4); // already DDMMYYYY
    if (ddmmyyyy2 === cs) return true;
  }

  return false;
}

export const loginStudent = async (
  name: string,
  credential: string, // رقم قومي أو تاريخ ميلاد
): Promise<StudentLoginResult> => {
  const trimmedName = name.trim();
  const trimmedCred = credential.trim();

  if (!trimmedCred) {
    throw new Error('يرجى إدخال الرقم القومي أو تاريخ الميلاد');
  }

  const hasName = trimmedName.length > 0;
  const normInput = hasName ? normalizeArabic(trimmedName) : '';
  const isNationalId = /^\d{7,14}$/.test(trimmedCred.replace(/[^\d]/g, '')) &&
                       trimmedCred.replace(/[^\d]/g, '').length >= 9;

  // ── 1. Firestore ──────────────────────────────────────────
  try {
    const studentsRef = collection(db, 'students');
    let snap;

    if (isNationalId) {
      // بحث بالرقم القومي مباشرة
      snap = await getDocs(query(studentsRef, where('nationalId', '==', trimmedCred.replace(/[^\d]/g, ''))));
    } else {
      // تاريخ ميلاد: جيب كل الطلاب وفلتر
      snap = await getDocs(studentsRef);
    }

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Student & {
        nationalId?: string;
        birthDate?: string;
        allowedSubjects?: string[];
        normalizedName?: string;
      };

      // لو في اسم → تحقق منه، لو مفيش → تجاوز التحقق من الاسم
      if (hasName) {
        const storedNorm = data.normalizedName || normalizeArabic(data.name || '');
        if (storedNorm !== normInput) continue;
      }

      // تحقق من الرقم القومي أو تاريخ الميلاد
      if (isNationalId) {
        // تم الفلترة بالرقم القومي بالفعل → نجح
        return {
          student: { ...data, id: docSnap.id },
          allowedSubjects: data.allowedSubjects || [],
        };
      } else {
        // تحقق من تاريخ الميلاد
        if (data.birthDate && birthDateMatch(trimmedCred, data.birthDate)) {
          return {
            student: { ...data, id: docSnap.id },
            allowedSubjects: data.allowedSubjects || [],
          };
        }
      }
    }
  } catch (err: unknown) {
    // Firebase error → fall through to local
    if (err instanceof Error && (
      err.message.includes('الاسم') || err.message.includes('الرقم')
    )) throw err;
  }

  throw new Error(
    isNationalId
      ? 'لم يتم العثور على الطالب. تحقق من الرقم القومي.'
      : 'لم يتم العثور على الطالب. تحقق من تاريخ الميلاد.'
  );
};

// ─────────────────────────────────────────────
// Fetch full user profile from Firestore
// ─────────────────────────────────────────────
export const fetchUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;

    const userData = { ...(userSnap.data() as User), id: userSnap.id };

    // لو المستخدم مدرس → جيب الـ permissions من teachers collection
    if (userData.role === 'teacher') {
      try {
        const teacherSnap = await getDoc(doc(db, 'teachers', uid));
        if (teacherSnap.exists()) {
          const teacherData = teacherSnap.data() as Teacher;
          if (teacherData.permissions) {
            userData.permissions = teacherData.permissions;
          }
        }
      } catch {
        // لو مش لاقي teacher document → خلي userData زي ما هو
      }
    }

    return userData;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// Fetch teacher profile from Firestore
// ─────────────────────────────────────────────
export const fetchTeacherProfile = async (uid: string): Promise<Teacher | null> => {
  try {
    const snap = await getDoc(doc(db, 'teachers', uid));
    if (snap.exists()) return { ...(snap.data() as Teacher), id: snap.id };
    return null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// ─────────────────────────────────────────────
// Role utilities
// ─────────────────────────────────────────────
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'مدير النظام',
    teacher: 'مدرس',
    student: 'طالب',
  };
  return labels[role];
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    admin: '#7c3aed',
    teacher: '#0369a1',
    student: '#047857',
  };
  return colors[role];
};
