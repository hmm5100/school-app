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

const LOGS_STORAGE_KEY = 'activity_logs';
const ACTIVE_USERS_KEY = 'active_users';
const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ==================== Activity Logs ====================

// Get all logs
export const getAllLogs = (): ActivityLog[] => {
  const stored = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!stored) return [];
  
  const logs = JSON.parse(stored);
  return logs.map((log: any) => ({
    ...log,
    timestamp: new Date(log.timestamp)
  }));
};

// Get logs with filters
export const getFilteredLogs = (filters: {
  userId?: string;
  userRole?: string;
  actionType?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}): ActivityLog[] => {
  let logs = getAllLogs();
  
  if (filters.userId) {
    logs = logs.filter(log => log.userId === filters.userId);
  }
  
  if (filters.userRole) {
    logs = logs.filter(log => log.userRole === filters.userRole);
  }
  
  if (filters.actionType) {
    logs = logs.filter(log => log.actionType === filters.actionType);
  }
  
  if (filters.targetType) {
    logs = logs.filter(log => log.targetType === filters.targetType);
  }
  
  if (filters.startDate) {
    logs = logs.filter(log => log.timestamp >= filters.startDate!);
  }
  
  if (filters.endDate) {
    logs = logs.filter(log => log.timestamp <= filters.endDate!);
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    logs = logs.filter(log => 
      log.action.toLowerCase().includes(search) ||
      log.userName.toLowerCase().includes(search) ||
      log.targetName?.toLowerCase().includes(search) ||
      log.details?.toLowerCase().includes(search)
    );
  }
  
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Add a log entry
export const addLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog => {
  const all = getAllLogs();
  
  const newLog: ActivityLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  };
  
  all.push(newLog);
  
  // Keep only last 10000 logs to prevent storage overflow
  if (all.length > 10000) {
    all.splice(0, all.length - 10000);
  }
  
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(all));
  
  return newLog;
};

// Log user login
export const logLogin = (userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student'): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: 'تسجيل الدخول',
    actionType: 'login',
    details: `قام ${userName} بتسجيل الدخول إلى النظام`
  });
};

// Log user logout
export const logLogout = (userId: string, userName: string, userRole: 'admin' | 'teacher' | 'student'): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: 'تسجيل الخروج',
    actionType: 'logout',
    details: `قام ${userName} بتسجيل الخروج من النظام`
  });
};

// Log creating an item
export const logCreate = (
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'],
  targetName: string,
  targetId?: string
): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: `إنشاء ${targetType}`,
    actionType: 'create',
    targetType,
    targetId,
    targetName,
    details: `قام ${userName} بإنشاء ${targetType}: ${targetName}`
  });
};

// Log updating an item
export const logUpdate = (
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'],
  targetName: string,
  changes: string,
  targetId?: string
): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: `تعديل ${targetType}`,
    actionType: 'update',
    targetType,
    targetId,
    targetName,
    details: `قام ${userName} بتعديل ${targetType}: ${targetName}. التغييرات: ${changes}`
  });
};

// Log deleting an item
export const logDelete = (
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher' | 'student',
  targetType: ActivityLog['targetType'],
  targetName: string,
  targetId?: string
): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: `حذف ${targetType}`,
    actionType: 'delete',
    targetType,
    targetId,
    targetName,
    details: `قام ${userName} بحذف ${targetType}: ${targetName}`
  });
};

// Log exporting data
export const logExport = (
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher' | 'student',
  exportType: string,
  details: string
): void => {
  addLog({
    userId,
    userName,
    userRole,
    action: `تصدير ${exportType}`,
    actionType: 'export',
    details: `قام ${userName} بتصدير ${exportType}: ${details}`
  });
};

// Clear old logs (older than specified days)
export const clearOldLogs = (daysToKeep: number = 90): void => {
  const all = getAllLogs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const filtered = all.filter(log => log.timestamp >= cutoffDate);
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(filtered));
};

// Get activity statistics
export const getActivityStats = (startDate?: Date, endDate?: Date): {
  totalLogs: number;
  loginCount: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  byUser: { [userId: string]: number };
  byAction: { [action: string]: number };
} => {
  const logs = getFilteredLogs({ startDate, endDate });
  
  const stats = {
    totalLogs: logs.length,
    loginCount: 0,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
    byUser: {} as { [userId: string]: number },
    byAction: {} as { [action: string]: number }
  };
  
  logs.forEach(log => {
    if (log.actionType === 'login') stats.loginCount++;
    if (log.actionType === 'create') stats.createCount++;
    if (log.actionType === 'update') stats.updateCount++;
    if (log.actionType === 'delete') stats.deleteCount++;
    
    stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
    stats.byAction[log.actionType] = (stats.byAction[log.actionType] || 0) + 1;
  });
  
  return stats;
};

// ==================== Active Users Tracking ====================

// Get all active users
export const getActiveUsers = (): ActiveUser[] => {
  const stored = localStorage.getItem(ACTIVE_USERS_KEY);
  if (!stored) return [];
  
  const users = JSON.parse(stored);
  const now = new Date();
  
  // Filter out inactive users (no activity in last 5 minutes)
  const active = users
    .map((u: any) => ({
      ...u,
      lastActivity: new Date(u.lastActivity)
    }))
    .filter((u: ActiveUser) => 
      now.getTime() - u.lastActivity.getTime() < ACTIVITY_TIMEOUT
    );
  
  localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(active));
  return active;
};

// Update user activity
export const updateUserActivity = (
  userId: string,
  userName: string,
  userRole: 'admin' | 'teacher' | 'student',
  currentPage?: string
): void => {
  const active = getActiveUsers();
  const existingIndex = active.findIndex(u => u.userId === userId);
  
  const userActivity: ActiveUser = {
    userId,
    userName,
    userRole,
    lastActivity: new Date(),
    currentPage
  };
  
  if (existingIndex >= 0) {
    active[existingIndex] = userActivity;
  } else {
    active.push(userActivity);
  }
  
  localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(active));
};

// Remove user from active list (on logout)
export const removeActiveUser = (userId: string): void => {
  const active = getActiveUsers();
  const filtered = active.filter(u => u.userId !== userId);
  localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(filtered));
};

// Check if user is online
export const isUserOnline = (userId: string): boolean => {
  const active = getActiveUsers();
  return active.some(u => u.userId === userId);
};

// Get count of active users by role
export const getActiveUsersByRole = (): {
  admin: number;
  teacher: number;
  student: number;
  total: number;
} => {
  const active = getActiveUsers();
  
  return {
    admin: active.filter(u => u.userRole === 'admin').length,
    teacher: active.filter(u => u.userRole === 'teacher').length,
    student: active.filter(u => u.userRole === 'student').length,
    total: active.length
  };
};
