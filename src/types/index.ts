// src/types/index.ts

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  classId?: string;
  photoURL?: string;
  createdAt: Date;
  isActive: boolean;
  permissions?: TeacherPermissions; // صلاحيات المدرس (اختيارية)
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  number: number;
  nationalId?: string;       // 14-digit national ID
  allowedSubjects?: string[]; // subjects this student can access
  email?: string;
  phone?: string;
  photoURL?: string;
  createdAt: Date;
}

export interface Teacher {
  id: string;
  uid: string;
  name: string;
  email: string;
  subjects: string[];
  classes: string[];
  permissions: TeacherPermissions;
  createdAt: Date;
  isActive: boolean;
}

export interface TeacherPermissions {
  // الأساسية
  canCreateExams: boolean;        // إنشاء امتحانات
  canEditOwnExam: boolean;        // تعديل امتحاناته
  canDeleteExam: boolean;         // حذف الامتحانات
  canViewResults: boolean;        // مشاهدة النتائج
  canDownloadExcel: boolean;      // تحميل Excel للنتائج
  canEditGrades: boolean;         // تعديل درجات الطلاب
  canCreateQuestions: boolean;    // إنشاء بنك أسئلة
  canUploadWord: boolean;         // رفع ملفات Word/PDF
  canLockExams: boolean;          // فتح/قفل الامتحانات
  canReopenStudent: boolean;      // إعادة فتح للطالب
  canViewAllStudents: boolean;    // رؤية كل الفصول
  canViewStudentId: boolean;      // رؤية الرقم القومي
  canManageStudents: boolean;     // إدارة الطلاب
}

export interface RolePermissions {
  // Exam permissions
  canCreateExams: boolean;
  canEditOwnExam: boolean;
  canEditAllExams: boolean;
  canDeleteExam: boolean;
  canViewAllExams: boolean;
  canUploadWord: boolean;
  canManualCreate: boolean;
  canSetExamSettings: boolean;

  // Student permissions
  canAddStudents: boolean;
  canEditStudents: boolean;
  canDeleteStudents: boolean;
  canViewNationalId: boolean;
  canUploadStudentExcel: boolean;
  canExportStudents: boolean;

  // Results permissions
  canViewResults: boolean;
  canDeleteResults: boolean;
  canExportResults: boolean;

  // Reports permissions
  canViewReports: boolean;
  canExportReports: boolean;

  // System permissions
  canManageTeachers: boolean;
  canManageRoles: boolean;
  canViewLogs: boolean;
  canManageSettings: boolean;
}

export interface ClassRoom {
  id: string;
  name: string;         // e.g. "1/1 بنين"
  grade: string;        // e.g. "الأول"
  section: string;      // e.g. "1"
  gender: 'بنين' | 'فتيات';
  studentCount: number;
  teacherId?: string;
  subjects: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  grade: string;
  teacherId?: string;
  totalScore: number;
}

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  classIds: string[];
  teacherId: string;
  teacherName: string;
  questions: Question[];
  duration: number;       // minutes
  totalScore: number;
  startTime?: Date;
  endTime?: Date;
  isLocked: boolean;
  isPublished: boolean;
  model: 'A' | 'B' | 'C' | 'D'; // different question order per student
  createdAt: Date;
  status: 'draft' | 'active' | 'finished';
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'compare';
  text: string;
  imageURL?: string;
  options?: string[];
  correctAnswer: string | string[];
  score: number;
  order: number;
  blanks?: string[];
  compareData?: { right: string; left: string }[];
}

export interface StudentAnswer {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  answers: Record<string, string | string[]>;
  score?: number;
  submittedAt?: Date;
  startedAt: Date;
  model: 'A' | 'B' | 'C' | 'D';
  isSubmitted: boolean;
  autoGraded: boolean;
}

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  examId?: string;
  score: number;
  totalScore: number;
  percentage: number;
  grade: string;        // A, B, C, D, F
  teacherId: string;
  createdAt: Date;
  editedAt?: Date;
  editedBy?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  targetRole: UserRole | 'all';
  targetUserId?: string;
  isRead: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
}

export interface HonorRoll {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  percentage: number;
  rank: number;
  semester: string;
  year: string;
  createdAt: Date;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  type: 'honor' | 'achievement' | 'participation';
  title: string;
  description: string;
  issuedAt: Date;
  issuedBy: string;
  pdfURL?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  roomId: string;       // 'general' or specific classId
  timestamp: Date;
  isRead: boolean;
}

export interface ActiveSession {
  userId: string;
  userName: string;
  userRole: UserRole;
  lastSeen: Date;
  currentPage: string;
  isOnline: boolean;
}
