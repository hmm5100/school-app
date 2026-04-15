export interface Notification {
  id: string;
  userId: string;
  userRole: 'admin' | 'teacher' | 'student';
  type: 'info' | 'warning' | 'success' | 'error' | 'exam' | 'material' | 'grade';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedId?: string; // ID of related exam, material, etc.
  actionUrl?: string;
}

const STORAGE_KEY = 'notifications';

// Get all notifications
export const getAllNotifications = (): Notification[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  const notifications = JSON.parse(stored);
  return notifications.map((n: any) => ({
    ...n,
    createdAt: new Date(n.createdAt)
  }));
};

// Get notifications for a specific user
export const getUserNotifications = (userId: string, userRole: string): Notification[] => {
  const all = getAllNotifications();
  return all
    .filter(n => n.userId === userId && n.userRole === userRole)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Get unread count for a user
export const getUnreadCount = (userId: string, userRole: string): number => {
  const userNotifications = getUserNotifications(userId, userRole);
  return userNotifications.filter(n => !n.read).length;
};

// Create a new notification
export const createNotification = (notification: Omit<Notification, 'id' | 'createdAt'>): Notification => {
  const all = getAllNotifications();
  
  const newNotification: Notification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  };
  
  all.push(newNotification);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  
  return newNotification;
};

// Bulk create notifications (for sending to multiple users)
export const createBulkNotifications = (
  userIds: string[],
  userRole: 'admin' | 'teacher' | 'student',
  notification: Omit<Notification, 'id' | 'userId' | 'userRole' | 'createdAt'>
): Notification[] => {
  const all = getAllNotifications();
  const created: Notification[] = [];
  
  userIds.forEach(userId => {
    const newNotification: Notification = {
      ...notification,
      userId,
      userRole,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    all.push(newNotification);
    created.push(newNotification);
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return created;
};

// Mark notification as read
export const markAsRead = (notificationId: string): void => {
  const all = getAllNotifications();
  const notification = all.find(n => n.id === notificationId);
  
  if (notification) {
    notification.read = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
};

// Mark all user notifications as read
export const markAllAsRead = (userId: string, userRole: string): void => {
  const all = getAllNotifications();
  
  all.forEach(n => {
    if (n.userId === userId && n.userRole === userRole) {
      n.read = true;
    }
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

// Delete a notification
export const deleteNotification = (notificationId: string): void => {
  const all = getAllNotifications();
  const filtered = all.filter(n => n.id !== notificationId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// Delete all notifications for a user
export const deleteAllUserNotifications = (userId: string, userRole: string): void => {
  const all = getAllNotifications();
  const filtered = all.filter(n => !(n.userId === userId && n.userRole === userRole));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// Send notification when new exam is published
export const notifyNewExam = (examId: string, examTitle: string, studentIds: string[]): void => {
  createBulkNotifications(
    studentIds,
    'student',
    {
      type: 'exam',
      title: 'امتحان جديد',
      message: `تم نشر امتحان جديد: ${examTitle}`,
      read: false,
      relatedId: examId,
      actionUrl: '/exams'
    }
  );
};

// Send notification when new material is uploaded
export const notifyNewMaterial = (materialId: string, materialTitle: string, studentIds: string[]): void => {
  createBulkNotifications(
    studentIds,
    'student',
    {
      type: 'material',
      title: 'مادة تعليمية جديدة',
      message: `تم رفع مادة تعليمية جديدة: ${materialTitle}`,
      read: false,
      relatedId: materialId,
      actionUrl: '/materials'
    }
  );
};

// Send notification when exam is graded
export const notifyExamGraded = (studentId: string, examTitle: string, score: number): void => {
  createNotification({
    userId: studentId,
    userRole: 'student',
    type: 'grade',
    title: 'تم تصحيح الامتحان',
    message: `تم تصحيح امتحان ${examTitle}. النتيجة: ${score}%`,
    read: false,
    actionUrl: '/exams'
  });
};

// Send system notification to all users
export const sendSystemNotification = (
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): void => {
  const students = JSON.parse(localStorage.getItem('students') || '[]');
  const teachers = JSON.parse(localStorage.getItem('teachers') || '[]');
  
  // Notify all students
  students.forEach((student: any) => {
    createNotification({
      userId: student.id,
      userRole: 'student',
      type,
      title: 'إشعار نظام',
      message,
      read: false
    });
  });
  
  // Notify all teachers
  teachers.forEach((teacher: any) => {
    createNotification({
      userId: teacher.id,
      userRole: 'teacher',
      type,
      title: 'إشعار نظام',
      message,
      read: false
    });
  });
  
  // Notify admin
  createNotification({
    userId: 'admin',
    userRole: 'admin',
    type,
    title: 'إشعار نظام',
    message,
    read: false
  });
};
