// src/services/logService.ts
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
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student';
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export' | 'import';
  targetType?: 'student' | 'teacher' | 'exam' | 'material' | 'grade' | 'report' | 'setting';
  targetId?: string;
  targetName?: string;
  details?: string;
  timestamp: Date;
  ipAddress?: string;
}

export interface ActiveUser {
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student';
  lastActivity: Date;
  currentPage?: string;
  ipAddress?: string;
}

const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ─── Helper: Firestore doc → ActivityLog ───────────────────
function docToLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    ...(data as Omit<ActivityLog, 'id' | 'timestamp'>),
    id,
    timestamp:
      data.timestamp instanceof Timestamp
        ? data.timestamp.toDate()
        : new Date(data.timestamp as string),
  };
}

// ==================== Activity Logs ====================

// Get all logs (latest 500)
export const getAllLogs = async (): Promise<ActivityLog[]> => {
  try {
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => docToLog(d.id, d.data() as Record<string, unknown>));
  } catch {
    return [];
  }
};

// Get logs with filters
export const getFilteredLogs = async (filters: {
  userId?: string;
  userRole?: string;
  actionType?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}): Promise<ActivityLog[]> => {
  try {
    // Build constraints array
    const constraints: Parameters<typeof query>[1][] = [
      orderBy('timestamp', 'desc'),
      limit(500),
    ];
    if (filters.userId)     constraints.push(where('userId',     '==', filters.userId));
    if (filters.userRole)   constraints.push(where('userRole',   '==', filters.userRole));
    if (filters.actionType) constraints.push(where('actionType', '==', filters.actionType));
    if (filters.targetType) constraints.push(where('targetType', '==', filters.targetType));

    const q = query(collection(db, 'activityLogs'), ...constraints);
    const snap = await getDocs(q);
    let logs = snap.docs.map(d => docToLog(d.id, d.data() as Record<string, unknown>));

    // Client-side: date range & text search
    if (filters.startDate) logs = logs.filter(l => l.timestamp >= filters.startDate!);
    if (filters.endDate)   logs = logs.filter(l => l.timestamp <= filters.endDate!);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(s) ||
        l.userName.toLowerCase().includes(s) ||
        l.targetName?.toLowerCase().includes(s) ||
        l.details?.toLowerCase().includes(s)
      );
    }

    return logs;
  } catch {
    return [];
  }
};

// Add a log entry — fire-and-forget (never crashes the app)
export const addLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
  addDoc(collection(db, 'activityLogs'), {
    ...log,
    timestamp: serverTimestamp(),
  }).catch(() => { /* silent fail */ });
};

// ─── Convenience wrappers ───────────────────────────────────

export const logLogin = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student'
): void => addLog({
  userId, userName, userRole,
  action: 'تسجيل الدخول', actionType: 'login',
  details: `قام ${userName} بتسجيل الدخول إلى النظام`,
});

export const logLogout = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student'
): void => addLog({
  userId, userName, userRole,
  action: 'تسجيل الخروج', actionType: 'logout',
  details: `قام ${userName} بتسجيل الخروج من النظام`,
});

export const logCreate = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'], targetName: string, targetId?: string
): void => addLog({
  userId, userName, userRole,
  action: `إنشاء ${targetType}`, actionType: 'create',
  targetType, targetId, targetName,
  details: `قام ${userName} بإنشاء ${targetType}: ${targetName}`,
});

export const logUpdate = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'], targetName: string, changes: string, targetId?: string
): void => addLog({
  userId, userName, userRole,
  action: `تعديل ${targetType}`, actionType: 'update',
  targetType, targetId, targetName,
  details: `قام ${userName} بتعديل ${targetType}: ${targetName}. التغييرات: ${changes}`,
});

export const logDelete = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'], targetName: string, targetId?: string
): void => addLog({
  userId, userName, userRole,
  action: `حذف ${targetType}`, actionType: 'delete',
  targetType, targetId, targetName,
  details: `قام ${userName} بحذف ${targetType}: ${targetName}`,
});

export const logExport = (
  userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student',
  exportType: string, details: string
): void => addLog({
  userId, userName, userRole,
  action: `تصدير ${exportType}`, actionType: 'export',
  details: `قام ${userName} بتصدير ${exportType}: ${details}`,
});

// Get activity statistics
export const getActivityStats = async (
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalLogs: number;
  loginCount: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  byUser: { [userId: string]: number };
  byAction: { [action: string]: number };
}> => {
  const logs = await getFilteredLogs({ startDate, endDate });
  const stats = {
    totalLogs: logs.length,
    loginCount: 0, createCount: 0, updateCount: 0, deleteCount: 0,
    byUser: {} as { [k: string]: number },
    byAction: {} as { [k: string]: number },
  };
  logs.forEach(l => {
    if (l.actionType === 'login')  stats.loginCount++;
    if (l.actionType === 'create') stats.createCount++;
    if (l.actionType === 'update') stats.updateCount++;
    if (l.actionType === 'delete') stats.deleteCount++;
    stats.byUser[l.userId]      = (stats.byUser[l.userId]      || 0) + 1;
    stats.byAction[l.actionType] = (stats.byAction[l.actionType] || 0) + 1;
  });
  return stats;
};

// ==================== Active Users Tracking ====================
// ✅ Firestore collection "activeSessions" — doc ID = userId

// Get all active users (online in last 5 min)
export const getActiveUsers = async (): Promise<ActiveUser[]> => {
  try {
    const snap = await getDocs(collection(db, 'activeSessions'));
    const now = Date.now();
    return snap.docs
      .map(d => {
        const data = d.data();
        const lastActivity =
          data.lastActivity instanceof Timestamp
            ? data.lastActivity.toDate()
            : new Date(data.lastActivity);
        return { userId: d.id, userName: data.userName, userRole: data.userRole,
                 lastActivity, currentPage: data.currentPage } as ActiveUser;
      })
      .filter(u => now - u.lastActivity.getTime() < ACTIVITY_TIMEOUT);
  } catch {
    return [];
  }
};

// Update user activity — upsert by userId
export const updateUserActivity = (
  userId: string, userName: string,
  userRole: 'admin' | 'teacher' | 'student', currentPage?: string
): void => {
  setDoc(doc(db, 'activeSessions', userId), {
    userName, userRole,
    lastActivity: serverTimestamp(),
    currentPage: currentPage || '',
  }).catch(() => { /* silent fail */ });
};

// Remove user session on logout
export const removeActiveUser = (userId: string): void => {
  deleteDoc(doc(db, 'activeSessions', userId)).catch(() => { /* silent fail */ });
};

// Check if a specific user is online
export const isUserOnline = async (userId: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, 'activeSessions', userId));
    if (!snap.exists()) return false;
    const data = snap.data();
    const lastActivity =
      data.lastActivity instanceof Timestamp
        ? data.lastActivity.toDate()
        : new Date(data.lastActivity);
    return Date.now() - lastActivity.getTime() < ACTIVITY_TIMEOUT;
  } catch {
    return false;
  }
};

// Get active users grouped by role
export const getActiveUsersByRole = async (): Promise<{
  admin: number; teacher: number; student: number; total: number;
}> => {
  const active = await getActiveUsers();
  return {
    admin:   active.filter(u => u.userRole === 'admin').length,
    teacher: active.filter(u => u.userRole === 'teacher').length,
    student: active.filter(u => u.userRole === 'student').length,
    total:   active.length,
  };
};
