// src/services/notificationService.ts
// ✅ مكتوب على Firestore بدل localStorage

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Notification {
  id: string;
  userId: string;
  userRole: 'admin' | 'teacher' | 'student';
  type: 'info' | 'warning' | 'success' | 'error' | 'exam' | 'material' | 'grade';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedId?: string;
  actionUrl?: string;
}

// ─── Helper ────────────────────────────────────────────────
function docToNotif(id: string, data: Record<string, unknown>): Notification {
  return {
    ...(data as Omit<Notification, 'id' | 'createdAt'>),
    id,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt as string),
  };
}

// ==================== Read ====================

// Get notifications for a specific user (latest 100)
export const getUserNotifications = async (
  userId: string,
  userRole: string
): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('userRole', '==', userRole),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => docToNotif(d.id, d.data() as Record<string, unknown>));
  } catch {
    return [];
  }
};

// Get unread count
export const getUnreadCount = async (
  userId: string,
  userRole: string
): Promise<number> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('userRole', '==', userRole),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
};

// ==================== Write ====================

// Create a single notification
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification> => {
  const data = { ...notification, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db, 'notifications'), data);
  return { ...notification, id: ref.id, createdAt: new Date() };
};

// Bulk create — one Firestore batch per 500 docs
export const createBulkNotifications = async (
  userIds: string[],
  userRole: 'admin' | 'teacher' | 'student',
  notification: Omit<Notification, 'id' | 'userId' | 'userRole' | 'createdAt'>
): Promise<void> => {
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 400) {
    chunks.push(userIds.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(userId => {
      const ref = doc(collection(db, 'notifications'));
      batch.set(ref, { ...notification, userId, userRole, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
};

// ==================== Update ====================

// Mark one notification as read
export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch { /* silent fail */ }
};

// Mark all user notifications as read
export const markAllAsRead = async (
  userId: string,
  userRole: string
): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('userRole', '==', userRole),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch { /* silent fail */ }
};

// ==================== Delete ====================

// Delete a single notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch { /* silent fail */ }
};

// Delete all notifications for a user
export const deleteAllUserNotifications = async (
  userId: string,
  userRole: string
): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('userRole', '==', userRole)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch { /* silent fail */ }
};

// ==================== Convenience senders ====================

// Notify students of a new exam
export const notifyNewExam = async (
  examId: string,
  examTitle: string,
  studentIds: string[]
): Promise<void> => {
  await createBulkNotifications(studentIds, 'student', {
    type: 'exam',
    title: 'امتحان جديد',
    message: `تم نشر امتحان جديد: ${examTitle}`,
    read: false,
    relatedId: examId,
    actionUrl: '/exams',
  });
};

// Notify students of new material
export const notifyNewMaterial = async (
  materialId: string,
  materialTitle: string,
  studentIds: string[]
): Promise<void> => {
  await createBulkNotifications(studentIds, 'student', {
    type: 'material',
    title: 'مادة تعليمية جديدة',
    message: `تم رفع مادة تعليمية جديدة: ${materialTitle}`,
    read: false,
    relatedId: materialId,
    actionUrl: '/subjects',
  });
};

// Notify a student that their exam was graded
export const notifyExamGraded = async (
  studentId: string,
  examTitle: string,
  score: number
): Promise<void> => {
  await createNotification({
    userId: studentId,
    userRole: 'student',
    type: 'grade',
    title: 'تم تصحيح الامتحان',
    message: `تم تصحيح امتحان ${examTitle}. النتيجة: ${score}%`,
    read: false,
    actionUrl: '/exams',
  });
};

// Send a system notification to all users
// ✅ يجيب المستخدمين من Firestore مش localStorage
export const sendSystemNotification = async (
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): Promise<void> => {
  try {
    // جيب كل الطلاب
    const studentsSnap = await getDocs(collection(db, 'students'));
    const studentIds = studentsSnap.docs.map(d => d.id);

    // جيب كل المدرسين
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const teacherIds = teachersSnap.docs.map(d => d.id);

    // جيب الأدمن
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    const adminIds = usersSnap.docs.map(d => d.id);

    const base = { type, title: 'إشعار نظام', message, read: false };

    await Promise.all([
      studentIds.length > 0
        ? createBulkNotifications(studentIds, 'student', base)
        : Promise.resolve(),
      teacherIds.length > 0
        ? createBulkNotifications(teacherIds, 'teacher', base)
        : Promise.resolve(),
      adminIds.length > 0
        ? createBulkNotifications(adminIds, 'admin', base)
        : Promise.resolve(),
    ]);
  } catch { /* silent fail */ }
};
