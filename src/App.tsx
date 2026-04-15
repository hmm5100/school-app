// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginTeacher from './pages/LoginTeacher';
import LoginStudent from './pages/LoginStudent';
import Unauthorized from './pages/Unauthorized';

// App pages
import Dashboard from './pages/Dashboard';
import StudentsManagement from './pages/StudentsManagement';
import StudentNew from './pages/StudentNew';
import StudentDetail from './pages/StudentDetail';
import ClassDetail from './pages/ClassDetail';
import StudentExam from './pages/StudentExam';
import MaterialsManagement from './pages/MaterialsManagement';
import Placeholder from './pages/Placeholder';
import SettingsPage from './pages/Settings';
import ClassesManagement from './pages/ClassesManagement';
import GradesManagement from './pages/GradesManagement';
import ActiveUsers from './pages/ActiveUsers';
import SystemAdmin from './pages/SystemAdmin';

// Phase 4 - Exams
import ExamsList from './pages/ExamsList';
import CreateExam from './pages/CreateExam';
import ExamSettings from './pages/ExamSettings';
import ExamResults from './pages/ExamResults';
import TakeExam from './pages/TakeExam';
import ExamReview from './pages/ExamReview';

// Phase 6 - Reports & Analytics
import Reports from './pages/Reports';
import Leaderboard from './pages/Leaderboard';

// Activity Log
import ActivityLog from './pages/ActivityLog';

// Notifications
import Notifications from './pages/Notifications';

// Exam Retake Requests
import ExamRetakeRequests from './pages/ExamRetakeRequests';

// Chat
import Chat from './pages/Chat';
import Profile from './pages/Profile';

// Certificates
import Certificates from './pages/Certificates';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public auth routes ── */}
          <Route path="/login" element={<LoginTeacher />} />
          <Route path="/login/student" element={<LoginStudent />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Protected app routes (inside MainLayout) ── */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* All roles */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />

            {/* Admin + Teacher only */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <StudentsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/new"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StudentNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <StudentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <ClassesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <ClassDetail />
                </ProtectedRoute>
              }
            />

            <Route path="/subjects" element={<MaterialsManagement />} />

            {/* ══════════════════════════════════
                EXAMS ROUTES
            ══════════════════════════════════ */}

            {/* قائمة الامتحانات — كل الأدوار */}
            <Route
              path="/exams"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <ExamsList />
                </ProtectedRoute>
              }
            />

            {/* إنشاء امتحان جديد — أدمن ومدرس فقط */}
            <Route
              path="/exams/new"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <CreateExam />
                </ProtectedRoute>
              }
            />

            {/* إعدادات الامتحان — أدمن ومدرس فقط */}
            <Route
              path="/exams/:id/settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <ExamSettings />
                </ProtectedRoute>
              }
            />

            {/* نتائج الامتحان — أدمن ومدرس فقط */}
            <Route
              path="/exams/:id/results"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <ExamResults />
                </ProtectedRoute>
              }
            />

            {/* أداء الامتحان — الطالب فقط (المسار الرئيسي) */}
            <Route
              path="/exams/:id/take"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <TakeExam />
                </ProtectedRoute>
              }
            />

            {/* المسار القديم /student يوجَّه لـ TakeExam مباشرة */}
            <Route
              path="/exams/:id/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentExam />
                </ProtectedRoute>
              }
            />

            {/* مراجعة حل الامتحان — الطالب فقط */}
            <Route
              path="/exams/:id/review"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ExamReview />
                </ProtectedRoute>
              }
            />

            {/* مسار عام للامتحان — يوجه حسب الدور */}
            <Route
              path="/exams/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <ExamSettings />
                </ProtectedRoute>
              }
            />

            {/* ══════════════════════════════════ */}

            {/* Grades */}
            <Route
              path="/grades"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <GradesManagement />
                </ProtectedRoute>
              }
            />

            {/* Exam Retake Requests — admin + teacher */}
            <Route
              path="/exam-retake-requests"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <ExamRetakeRequests />
                </ProtectedRoute>
              }
            />

            {/* Reports – admin + teacher */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/honor-roll"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/activity-log" element={<ActivityLog />} />

            {/* Admin only */}
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/active-users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ActiveUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SystemAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
