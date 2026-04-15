// src/context/AuthContext.tsx

import type { TeacherPermissions } from '../types';

// ─── Default permissions للمدرسين القدام اللي مفيش عندهم permissions في Firebase ───
const defaultTeacherPermissions: TeacherPermissions = {
  canCreateExams: true,
  canEditOwnExam: true,
  canDeleteExam: false,
  canViewResults: true,
  canDownloadExcel: true,
  canEditGrades: false,
  canCreateQuestions: true,
  canUploadWord: true,
  canLockExams: true,
  canReopenStudent: true,
  canViewAllStudents: false,
  canViewStudentId: false,
  canManageStudents: false,
};

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { User, UserRole, Student } from '../types';
import {
  loginWithEmail,
  loginStudent as authLoginStudent,
  fetchUserProfile,
  signOut,
  type StudentLoginResult,
} from '../services/auth';
import { updateUserActivity, removeActiveUser } from '../services/logService';
import { logLogin, logLogout } from '../services/logService';

// ─────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────
interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  studentProfile: Student | null;
  studentAllowedSubjects: string[];
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginStudent: (name: string, nationalId: string) => Promise<StudentLoginResult>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [studentAllowedSubjects, setStudentAllowedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string): Promise<void> => {
    const { user, profile } = await loginWithEmail(email, password);
    setCurrentUser(user);
    setUserProfile(profile);
    setStudentProfile(null);
    setStudentAllowedSubjects([]);
    
    // Log login activity
    logLogin(profile.id, profile.displayName, profile.role);
    updateUserActivity(profile.id, profile.displayName, profile.role, window.location.pathname);
  };

  const loginStudent = async (name: string, nationalId: string): Promise<StudentLoginResult> => {
    const result = await authLoginStudent(name, nationalId);
    setStudentProfile(result.student);
    setStudentAllowedSubjects(result.allowedSubjects);
    setCurrentUser(null);
    setUserProfile(null);
    
    // Log student login activity
    logLogin(result.student.id, result.student.name, 'student');
    updateUserActivity(result.student.id, result.student.name, 'student', window.location.pathname);
    
    return result;
  };

  const logout = async (): Promise<void> => {
    // Log logout before clearing state
    if (userProfile) {
      logLogout(userProfile.id, userProfile.displayName, userProfile.role);
      removeActiveUser(userProfile.id);
    } else if (studentProfile) {
      logLogout(studentProfile.id, studentProfile.name, 'student');
      removeActiveUser(studentProfile.id);
    }
    
    try { await signOut(); } catch { /* ignore */ }
    setCurrentUser(null);
    setUserProfile(null);
    setStudentProfile(null);
    setStudentAllowedSubjects([]);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          // ✅ Check if account is disabled
          if (!profile.isActive) {
            await signOut();
            setCurrentUser(null);
            setUserProfile(null);
            setStudentProfile(null);
            setStudentAllowedSubjects([]);
            setLoading(false);
            return;
          }
          // ✅ لو المدرس مفيش عنده permissions في Firebase، نديه default تلقائي
          if (profile.role === 'teacher' && !profile.permissions) {
            profile.permissions = defaultTeacherPermissions;
          }
          setUserProfile(profile);
        } else {
          setUserProfile({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'مدير النظام',
            role: 'admin',
            createdAt: new Date(),
            isActive: true,
          });
        }
        setStudentProfile(null);
        setStudentAllowedSubjects([]);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Track user activity every minute
  useEffect(() => {
    const trackActivity = () => {
      if (userProfile) {
        updateUserActivity(
          userProfile.id,
          userProfile.displayName,
          userProfile.role,
          window.location.pathname
        );
      } else if (studentProfile) {
        updateUserActivity(
          studentProfile.id,
          studentProfile.name,
          'student',
          window.location.pathname
        );
      }
    };

    // Track immediately
    trackActivity();

    // Then track every minute
    const interval = setInterval(trackActivity, 60000);

    return () => clearInterval(interval);
  }, [userProfile, studentProfile]);

  const userRole: UserRole | null =
    studentProfile ? 'student' : userProfile?.role || null;

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, studentProfile, studentAllowedSubjects,
      userRole, loading, login, loginStudent, logout,
      isAdmin: userRole === 'admin',
      isTeacher: userRole === 'teacher',
      isStudent: userRole === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  );
};
