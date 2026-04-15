// src/services/securityService.ts
// خدمة الأمان الشاملة: تشفير البيانات الحساسة، إدارة الصلاحيات، Firestore Rules

import type { UserRole } from '../types';

// ─────────────────────────────────────────────────────────────────
// Environment Variables (بيانات البيئة)
// تُقرأ من ملف .env ولا تُخزَّن في الكود مباشرةً
// ─────────────────────────────────────────────────────────────────

export const ENV = {
  // Firebase config — يجب أن تُضاف في .env.local
  FIREBASE_API_KEY:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '',
  FIREBASE_AUTH_DOMAIN:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '',
  FIREBASE_PROJECT_ID:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '',
  FIREBASE_STORAGE_BUCKET:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '',
  FIREBASE_MESSAGING_SENDER_ID:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?? '',
  FIREBASE_APP_ID:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '',

  // مفتاح التشفير (يجب أن يكون 32 حرفًا بالضبط في البيئة الإنتاجية)
  ENCRYPTION_KEY: import.meta.env.VITE_ENCRYPTION_KEY ?? 'SchoolAppHamdy2024SecureKey32Ch!',

  // اسم المدرسة وبيانات الهوية
  SCHOOL_NAME:    import.meta.env.VITE_SCHOOL_NAME    ?? 'مدرسة النور',
  OWNER_NAME:     import.meta.env.VITE_OWNER_NAME     ?? 'Mr.Hamdy Mohamed',
  APP_VERSION:    import.meta.env.VITE_APP_VERSION    ?? '1.0.0',
} as const;

// ─────────────────────────────────────────────────────────────────
// Simple XOR-based encryption for sensitive local data
// (لتشفير البيانات الحساسة في localStorage / sessionStorage)
// ─────────────────────────────────────────────────────────────────

function getKeyBytes(key: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(key);
}

function xorEncryptDecrypt(data: string, key: string): string {
  const keyBytes = getKeyBytes(key);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ keyBytes[i % keyBytes.length]);
  }
  return result;
}

/**
 * تشفير نص باستخدام XOR + Base64
 * مناسب لتشفير البيانات الحساسة قبل تخزينها محليًا
 */
export function encryptData(plainText: string): string {
  try {
    const key = ENV.ENCRYPTION_KEY;
    const encrypted = xorEncryptDecrypt(plainText, key);
    return btoa(unescape(encodeURIComponent(encrypted)));
  } catch {
    return plainText;
  }
}

/**
 * فك تشفير نص مشفر
 */
export function decryptData(cipherText: string): string {
  try {
    const key = ENV.ENCRYPTION_KEY;
    const decoded = decodeURIComponent(escape(atob(cipherText)));
    return xorEncryptDecrypt(decoded, key);
  } catch {
    return cipherText;
  }
}

/**
 * تشفير الرقم القومي للطالب (عرض مخفي جزئيًا)
 * مثال: 30501011234567 → 30501****4567
 */
export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 8) return nationalId;
  const start = nationalId.slice(0, 5);
  const end   = nationalId.slice(-4);
  return `${start}****${end}`;
}

/**
 * تشفير رقم الهاتف (عرض مخفي جزئيًا)
 * مثال: 01012345678 → 0101****678
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 4);
  const end   = phone.slice(-3);
  return `${start}****${end}`;
}

/**
 * تشفير البريد الإلكتروني (عرض مخفي جزئيًا)
 * مثال: test@example.com → t***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 1) return email;
  return `${user[0]}***@${domain}`;
}

// ─────────────────────────────────────────────────────────────────
// Secure Storage — حفظ البيانات بشكل مشفر في sessionStorage
// ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'sapp_';

export const secureStorage = {
  set(key: string, value: unknown): void {
    try {
      const json    = JSON.stringify(value);
      const encoded = encryptData(json);
      sessionStorage.setItem(STORAGE_PREFIX + key, encoded);
    } catch { /* ignore storage errors */ }
  },

  get<T>(key: string): T | null {
    try {
      const encoded = sessionStorage.getItem(STORAGE_PREFIX + key);
      if (!encoded) return null;
      const json = decryptData(encoded);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear(): void {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
  },
};

// ─────────────────────────────────────────────────────────────────
// Permission Matrix — مصفوفة الصلاحيات حسب الدور
// ─────────────────────────────────────────────────────────────────

export type Permission =
  | 'manage_students'
  | 'manage_teachers'
  | 'manage_classes'
  | 'manage_subjects'
  | 'manage_exams'
  | 'grade_students'
  | 'view_reports'
  | 'export_excel'
  | 'import_excel'
  | 'issue_certificates'
  | 'view_certificates'
  | 'manage_notifications'
  | 'view_audit_logs'
  | 'manage_system'
  | 'chat_internal'
  | 'take_exams'
  | 'view_own_grades'
  | 'view_honor_roll';

const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  admin: [
    'manage_students', 'manage_teachers', 'manage_classes', 'manage_subjects',
    'manage_exams', 'grade_students', 'view_reports', 'export_excel', 'import_excel',
    'issue_certificates', 'view_certificates', 'manage_notifications',
    'view_audit_logs', 'manage_system', 'chat_internal', 'view_honor_roll',
  ],
  teacher: [
    'manage_students', 'manage_classes', 'manage_exams', 'grade_students',
    'view_reports', 'export_excel', 'import_excel', 'issue_certificates',
    'view_certificates', 'manage_notifications', 'chat_internal', 'view_honor_roll',
  ],
  student: [
    'take_exams', 'view_own_grades', 'view_honor_roll', 'view_certificates',
  ],
};

/**
 * التحقق من صلاحية معينة لدور معين
 */
export function hasPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * الحصول على كل الصلاحيات المتاحة لدور معين
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Input Sanitization — تنظيف المدخلات من XSS
// ─────────────────────────────────────────────────────────────────

/**
 * تنظيف النص من أي HTML أو سكريبت ضار
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * تنظيف نص بدون HTML encoding (للعرض فقط)
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * التحقق من صحة الرقم القومي المصري (14 رقم)
 */
export function validateNationalId(id: string): boolean {
  return /^\d{14}$/.test(id);
}

/**
 * التحقق من صحة رقم الهاتف المصري
 */
export function validateEgyptianPhone(phone: string): boolean {
  return /^(010|011|012|015)\d{8}$/.test(phone);
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────────────────────────
// Rate Limiting — تحديد عدد المحاولات (لمنع Brute Force)
// ─────────────────────────────────────────────────────────────────

const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

/**
 * تسجيل محاولة تسجيل دخول فاشلة
 * @returns true إذا كان المستخدم محظورًا حاليًا
 */
export function recordFailedLoginAttempt(identifier: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (entry) {
    if (now - entry.lastAttempt > LOCKOUT_MS) {
      // Reset after lockout period
      loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }
    entry.count++;
    entry.lastAttempt = now;
    return entry.count >= MAX_ATTEMPTS;
  } else {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
}

/**
 * التحقق مما إذا كان المستخدم محظورًا من تسجيل الدخول
 */
export function isLoginLocked(identifier: string): { locked: boolean; remainingMs: number } {
  const entry = loginAttempts.get(identifier);
  if (!entry || entry.count < MAX_ATTEMPTS) return { locked: false, remainingMs: 0 };
  const elapsed  = Date.now() - entry.lastAttempt;
  const remaining = LOCKOUT_MS - elapsed;
  if (remaining <= 0) {
    loginAttempts.delete(identifier);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
}

/**
 * إلغاء حظر المستخدم بعد تسجيل دخول ناجح
 */
export function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// ─────────────────────────────────────────────────────────────────
// Firestore Security Rules (نصوص القواعد للنشر)
// ─────────────────────────────────────────────────────────────────

/**
 * Firestore Rules النصية — تُنسَخ وتُنشَر في Firebase Console
 * أو عبر firebase deploy --only firestore:rules
 */
export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── دالة مساعدة: هل المستخدم مسجل الدخول؟ ───
    function isAuthenticated() {
      return request.auth != null;
    }

    // ─── دالة مساعدة: دور المستخدم ───
    function userRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // ─── دالة مساعدة: هل هو مدير؟ ───
    function isAdmin() {
      return isAuthenticated() && userRole() == 'admin';
    }

    // ─── دالة مساعدة: هل هو مدرس أو مدير؟ ───
    function isTeacherOrAdmin() {
      return isAuthenticated() && (userRole() == 'teacher' || userRole() == 'admin');
    }

    // ─── جدول المستخدمين ───
    match /users/{userId} {
      allow read:  if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }

    // ─── جدول الطلاب ───
    match /students/{studentId} {
      allow read:   if isTeacherOrAdmin();
      allow create: if isTeacherOrAdmin();
      allow update: if isTeacherOrAdmin();
      allow delete: if isAdmin();
    }

    // ─── جدول المدرسين ───
    match /teachers/{teacherId} {
      allow read:   if isTeacherOrAdmin();
      allow create: if isAdmin();
      allow update: if isAdmin() || (isAuthenticated() && request.auth.uid == teacherId);
      allow delete: if isAdmin();
    }

    // ─── جدول الفصول ───
    match /classes/{classId} {
      allow read:   if isAuthenticated();
      allow write:  if isTeacherOrAdmin();
    }

    // ─── جدول المواد ───
    match /subjects/{subjectId} {
      allow read:   if isAuthenticated();
      allow write:  if isTeacherOrAdmin();
    }

    // ─── جدول الامتحانات ───
    match /exams/{examId} {
      allow read:   if isAuthenticated();
      allow create: if isTeacherOrAdmin();
      allow update: if isTeacherOrAdmin();
      allow delete: if isAdmin();
    }

    // ─── إجابات الطلاب على الامتحانات ───
    match /studentAnswers/{answerId} {
      allow read:   if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ─── الدرجات ───
    match /grades/{gradeId} {
      allow read:   if isAuthenticated();
      allow create: if isTeacherOrAdmin();
      allow update: if isTeacherOrAdmin();
      allow delete: if isAdmin();
    }

    // ─── الإشعارات ───
    match /notifications/{notifId} {
      allow read:   if isAuthenticated();
      allow create: if isTeacherOrAdmin();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ─── لوحة الشرف ───
    match /honorRoll/{entryId} {
      allow read:   if isAuthenticated();
      allow write:  if isTeacherOrAdmin();
    }

    // ─── الشهادات ───
    match /certificates/{certId} {
      allow read:   if isAuthenticated();
      allow create: if isTeacherOrAdmin();
      allow update: if isTeacherOrAdmin();
      allow delete: if isAdmin();
    }

    // ─── الرسائل ───
    match /messages/{msgId} {
      allow read:   if isTeacherOrAdmin();
      allow create: if isTeacherOrAdmin();
      allow update: if isTeacherOrAdmin();
      allow delete: if isAdmin();
    }

    // ─── سجلات التدقيق ───
    match /auditLogs/{logId} {
      allow read:   if isAdmin();
      allow create: if isAuthenticated();
      allow update: if false;
      allow delete: if isAdmin();
    }

    // ─── الجلسات النشطة ───
    match /activeSessions/{sessionId} {
      allow read:   if isAdmin();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && request.auth.uid == sessionId;
      allow delete: if isAdmin() || (isAuthenticated() && request.auth.uid == sessionId);
    }

    // ─── إعدادات النظام ───
    match /settings/{settingId} {
      allow read:   if isAuthenticated();
      allow write:  if isAdmin();
    }
  }
}
`.trim();

// ─────────────────────────────────────────────────────────────────
// Password Strength — تقييم قوة كلمة المرور
// ─────────────────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number;         // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8)  score++;
  else suggestions.push('استخدم 8 أحرف على الأقل');

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('أضف حرفًا كبيرًا على الأقل');

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('أضف رقمًا على الأقل');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else suggestions.push('أضف رمزًا خاصًا (@، #، $، ...)');

  const labels = ['ضعيف جدًا', 'ضعيف', 'مقبول', 'جيد', 'قوي'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
    suggestions,
  };
}

// ─────────────────────────────────────────────────────────────────
// Session Management — إدارة الجلسة
// ─────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let onSessionExpired: (() => void) | null = null;

/**
 * تشغيل مؤقت انتهاء الجلسة
 */
export function startSessionTimer(onExpire: () => void): void {
  onSessionExpired = onExpire;
  resetSessionTimer();
}

/**
 * إعادة ضبط المؤقت عند كل نشاط للمستخدم
 */
export function resetSessionTimer(): void {
  if (sessionTimer) clearTimeout(sessionTimer);
  if (!onSessionExpired) return;
  sessionTimer = setTimeout(() => {
    if (onSessionExpired) onSessionExpired();
  }, SESSION_TIMEOUT_MS);
}

/**
 * إيقاف مؤقت الجلسة
 */
export function stopSessionTimer(): void {
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = null;
  onSessionExpired = null;
}

// ─────────────────────────────────────────────────────────────────
// App Identity — هوية التطبيق الثابتة
// ─────────────────────────────────────────────────────────────────

export const APP_IDENTITY = {
  ownerName:    ENV.OWNER_NAME,
  schoolName:   ENV.SCHOOL_NAME,
  appName:      'منصة الإدارة التعليمية',
  version:      ENV.APP_VERSION,
  logoPath:     '/logo.png',
  faviconPath:  '/favicon.svg',
  copyrightYear: new Date().getFullYear(),

  get fullTitle() {
    return `${this.appName} — ${this.schoolName}`;
  },

  get copyrightText() {
    return `© ${this.copyrightYear} ${this.ownerName} — ${this.schoolName}. جميع الحقوق محفوظة.`;
  },
} as const;

// ─────────────────────────────────────────────────────────────────
// Content Security Policy headers (للرجوع إليها في الإعداد)
// ─────────────────────────────────────────────────────────────────

export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://firebasestorage.googleapis.com",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ');
