// src/services/examRetakeService.ts
// نظام طلبات إعادة الامتحان

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
import { createNotification } from './notificationService';

// ─── Types ────────────────────────────────────
export interface ExamRetakeRequest {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerComment?: string;
  originalScore?: number;
  originalPercentage?: number;
}

// ─── Convert Firestore doc → ExamRetakeRequest ─────
function docToRetakeRequest(id: string, data: Record<string, unknown>): ExamRetakeRequest {
  return {
    id,
    examId: (data.examId as string) || '',
    examTitle: (data.examTitle as string) || '',
    studentId: (data.studentId as string) || '',
    studentName: (data.studentName as string) || '',
    classId: (data.classId as string) || '',
    teacherId: (data.teacherId as string) || '',
    teacherName: (data.teacherName as string) || '',
    reason: (data.reason as string) || '',
    status: (data.status as 'pending' | 'approved' | 'rejected') || 'pending',
    requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(),
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : undefined,
    reviewedBy: data.reviewedBy as string | undefined,
    reviewerComment: data.reviewerComment as string | undefined,
    originalScore: data.originalScore as number | undefined,
    originalPercentage: data.originalPercentage as number | undefined,
  };
}

// ─────────────────────────────────────────────
// CREATE RETAKE REQUEST
// ─────────────────────────────────────────────
export const createRetakeRequest = async (
  request: Omit<ExamRetakeRequest, 'id' | 'requestedAt' | 'status'>
): Promise<ExamRetakeRequest> => {
  const payload = {
    ...request,
    status: 'pending',
    requestedAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'examRetakeRequests'), payload);

    // إرسال إشعار للمدرس
    createNotification({
      userId: request.teacherId,
      userRole: 'teacher',
      type: 'exam',
      title: 'طلب إعادة امتحان',
      message: `الطالب ${request.studentName} يطلب إعادة امتحان ${request.examTitle}`,
      read: false,
      relatedId: ref.id,
      actionUrl: `/exam-retake-requests`,
    });

    // إرسال إشعار للأدمن أيضاً
    createNotification({
      userId: 'admin',
      userRole: 'admin',
      type: 'exam',
      title: 'طلب إعادة امتحان جديد',
      message: `الطالب ${request.studentName} يطلب إعادة امتحان ${request.examTitle}`,
      read: false,
      relatedId: ref.id,
      actionUrl: `/exam-retake-requests`,
    });

    return {
      id: ref.id,
      ...request,
      status: 'pending',
      requestedAt: new Date(),
    };
  } catch (err) {
    console.error('createRetakeRequest error:', err);
    throw new Error('فشل إرسال طلب إعادة الامتحان.');
  }
};

// ─────────────────────────────────────────────
// GET ALL RETAKE REQUESTS
// ─────────────────────────────────────────────
export const getAllRetakeRequests = async (): Promise<ExamRetakeRequest[]> => {
  try {
    const snap = await getDocs(
      query(collection(db, 'examRetakeRequests'), orderBy('requestedAt', 'desc'))
    );
    return snap.docs.map(d => docToRetakeRequest(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getAllRetakeRequests error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET RETAKE REQUESTS BY TEACHER
// ─────────────────────────────────────────────
export const getRetakeRequestsByTeacher = async (teacherId: string): Promise<ExamRetakeRequest[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'examRetakeRequests'),
        where('teacherId', '==', teacherId),
        orderBy('requestedAt', 'desc')
      )
    );
    return snap.docs.map(d => docToRetakeRequest(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getRetakeRequestsByTeacher error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET RETAKE REQUESTS BY STUDENT
// ─────────────────────────────────────────────
export const getRetakeRequestsByStudent = async (studentId: string): Promise<ExamRetakeRequest[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'examRetakeRequests'),
        where('studentId', '==', studentId),
        orderBy('requestedAt', 'desc')
      )
    );
    return snap.docs.map(d => docToRetakeRequest(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getRetakeRequestsByStudent error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET PENDING RETAKE REQUESTS
// ─────────────────────────────────────────────
export const getPendingRetakeRequests = async (teacherId?: string): Promise<ExamRetakeRequest[]> => {
  try {
    let q;
    if (teacherId) {
      q = query(
        collection(db, 'examRetakeRequests'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'examRetakeRequests'),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc')
      );
    }
    
    const snap = await getDocs(q);
    return snap.docs.map(d => docToRetakeRequest(d.id, d.data() as Record<string, unknown>));
  } catch (err) {
    console.error('getPendingRetakeRequests error:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// APPROVE RETAKE REQUEST
// ─────────────────────────────────────────────
export const approveRetakeRequest = async (
  requestId: string,
  reviewedBy: string,
  comment?: string
): Promise<void> => {
  try {
    const requestDoc = await getDoc(doc(db, 'examRetakeRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('الطلب غير موجود.');
    }

    const requestData = requestDoc.data() as Record<string, unknown>;
    
    await updateDoc(doc(db, 'examRetakeRequests', requestId), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy,
      reviewerComment: comment || '',
    });

    // حذف إجابة الطالب السابقة ليتمكن من إعادة الامتحان
    const answerId = `ans_${requestData.examId}_${requestData.studentId}`;
    try {
      await deleteDoc(doc(db, 'studentAnswers', answerId));
    } catch (err) {
      console.log('No previous answer to delete');
    }

    // إرسال إشعار للطالب بالموافقة
    createNotification({
      userId: requestData.studentId as string,
      userRole: 'student',
      type: 'success',
      title: 'تمت الموافقة على طلبك',
      message: `تمت الموافقة على طلب إعادة امتحان ${requestData.examTitle}. يمكنك الآن البدء في الامتحان.`,
      read: false,
      relatedId: requestData.examId as string,
      actionUrl: `/exams`,
    });
  } catch (err) {
    console.error('approveRetakeRequest error:', err);
    throw new Error('فشل الموافقة على الطلب.');
  }
};

// ─────────────────────────────────────────────
// REJECT RETAKE REQUEST
// ─────────────────────────────────────────────
export const rejectRetakeRequest = async (
  requestId: string,
  reviewedBy: string,
  comment?: string
): Promise<void> => {
  try {
    const requestDoc = await getDoc(doc(db, 'examRetakeRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('الطلب غير موجود.');
    }

    const requestData = requestDoc.data() as Record<string, unknown>;
    
    await updateDoc(doc(db, 'examRetakeRequests', requestId), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy,
      reviewerComment: comment || '',
    });

    // إرسال إشعار للطالب بالرفض
    createNotification({
      userId: requestData.studentId as string,
      userRole: 'student',
      type: 'error',
      title: 'تم رفض طلبك',
      message: `تم رفض طلب إعادة امتحان ${requestData.examTitle}${comment ? `: ${comment}` : '.'}`,
      read: false,
      relatedId: requestData.examId as string,
      actionUrl: `/exams`,
    });
  } catch (err) {
    console.error('rejectRetakeRequest error:', err);
    throw new Error('فشل رفض الطلب.');
  }
};

// ─────────────────────────────────────────────
// CHECK IF STUDENT HAS PENDING REQUEST
// ─────────────────────────────────────────────
export const hasPendingRetakeRequest = async (
  examId: string,
  studentId: string
): Promise<boolean> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'examRetakeRequests'),
        where('examId', '==', examId),
        where('studentId', '==', studentId),
        where('status', '==', 'pending')
      )
    );
    return !snap.empty;
  } catch (err) {
    console.error('hasPendingRetakeRequest error:', err);
    return false;
  }
};

// ─────────────────────────────────────────────
// DELETE RETAKE REQUEST
// ─────────────────────────────────────────────
export const deleteRetakeRequest = async (requestId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'examRetakeRequests', requestId));
  } catch (err) {
    console.error('deleteRetakeRequest error:', err);
    throw new Error('فشل حذف الطلب.');
  }
};

// ─────────────────────────────────────────────
// GET REQUEST BY ID
// ─────────────────────────────────────────────
export const getRetakeRequestById = async (requestId: string): Promise<ExamRetakeRequest | null> => {
  try {
    const snap = await getDoc(doc(db, 'examRetakeRequests', requestId));
    if (!snap.exists()) return null;
    return docToRetakeRequest(snap.id, snap.data() as Record<string, unknown>);
  } catch (err) {
    console.error('getRetakeRequestById error:', err);
    return null;
  }
};
