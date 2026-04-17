// src/services/auditLogService.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────
type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'other';
type AuditEntity =
  | 'exam'
  | 'student'
  | 'grade'
  | 'retake_request'
  | 'user'
  | 'other';

interface LogParams {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student';
  description: string;
  details?: Record<string, unknown>;
}

// ─── Main Function ────────────────────────────────────────────────────────────
/**
 * تسجيل حدث في auditLogs
 *
 * استخدام:
 *  await logAuditEvent({
 *    action: 'create',
 *    entity: 'exam',
 *    entityId: exam.id,
 *    entityName: exam.title,
 *    userId: userProfile.uid,
 *    userName: userProfile.displayName,
 *    userRole: userRole,
 *    description: `تم إنشاء امتحان "${exam.title}"`,
 *  });
 */
export async function logAuditEvent(params: LogParams): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      entityName: params.entityName,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      description: params.description,
      details: params.details ?? null,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // لا نوقف التطبيق بسبب خطأ في التسجيل — فقط نسجّله في الـ console
    console.error('logAuditEvent error:', err);
  }
}

// ─── Convenience Helpers ──────────────────────────────────────────────────────

/** إنشاء امتحان */
export const logExamCreated = (
  examId: string,
  examTitle: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'create',
    entity: 'exam',
    entityId: examId,
    entityName: examTitle,
    userId,
    userName,
    userRole,
    description: `تم إنشاء امتحان "${examTitle}"`,
  });

/** تعديل امتحان */
export const logExamUpdated = (
  examId: string,
  examTitle: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher',
  changes?: Record<string, unknown>
) =>
  logAuditEvent({
    action: 'update',
    entity: 'exam',
    entityId: examId,
    entityName: examTitle,
    userId,
    userName,
    userRole,
    description: `تم تعديل امتحان "${examTitle}"`,
    details: changes,
  });

/** حذف امتحان */
export const logExamDeleted = (
  examId: string,
  examTitle: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'delete',
    entity: 'exam',
    entityId: examId,
    entityName: examTitle,
    userId,
    userName,
    userRole,
    description: `تم حذف امتحان "${examTitle}"`,
  });

/** إضافة طالب */
export const logStudentCreated = (
  studentId: string,
  studentName: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'create',
    entity: 'student',
    entityId: studentId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تم إضافة طالب "${studentName}"`,
  });

/** تعديل بيانات طالب */
export const logStudentUpdated = (
  studentId: string,
  studentName: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'update',
    entity: 'student',
    entityId: studentId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تم تعديل بيانات الطالب "${studentName}"`,
  });

/** حذف طالب */
export const logStudentDeleted = (
  studentId: string,
  studentName: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'delete',
    entity: 'student',
    entityId: studentId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تم حذف الطالب "${studentName}"`,
  });

/** تعديل درجة */
export const logGradeUpdated = (
  gradeId: string,
  studentName: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher',
  oldScore?: number,
  newScore?: number
) =>
  logAuditEvent({
    action: 'update',
    entity: 'grade',
    entityId: gradeId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تم تعديل درجة الطالب "${studentName}"${oldScore !== undefined ? ` من ${oldScore} إلى ${newScore}` : ''}`,
    details: { oldScore, newScore },
  });

/** الموافقة على طلب إعادة امتحان */
export const logRetakeApproved = (
  requestId: string,
  studentName: string,
  examTitle: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'approve',
    entity: 'retake_request',
    entityId: requestId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تمت الموافقة على طلب إعادة امتحان "${examTitle}" للطالب "${studentName}"`,
  });

/** رفض طلب إعادة امتحان */
export const logRetakeRejected = (
  requestId: string,
  studentName: string,
  examTitle: string,
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher'
) =>
  logAuditEvent({
    action: 'reject',
    entity: 'retake_request',
    entityId: requestId,
    entityName: studentName,
    userId,
    userName,
    userRole,
    description: `تم رفض طلب إعادة امتحان "${examTitle}" للطالب "${studentName}"`,
  });

/** إضافة / تعديل مستخدم */
export const logUserUpdated = (
  targetUserId: string,
  targetName: string,
  userId: string,
  userName: string,
  action: 'create' | 'update' | 'delete' = 'update'
) =>
  logAuditEvent({
    action,
    entity: 'user',
    entityId: targetUserId,
    entityName: targetName,
    userId,
    userName,
    userRole: 'admin',
    description:
      action === 'create'
        ? `تم إنشاء حساب "${targetName}"`
        : action === 'delete'
        ? `تم حذف حساب "${targetName}"`
        : `تم تعديل بيانات "${targetName}"`,
  });
