// src/hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { RolePermissions } from '../types';

export const usePermissions = () => {
  const { userRole, userProfile } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // ✅ الأدمن عنده كل الصلاحيات
        if (userRole === 'admin') {
          setPermissions({
            canCreateExams: true, canEditOwnExam: true, canEditAllExams: true,
            canDeleteExam: true, canViewAllExams: true, canUploadWord: true,
            canManualCreate: true, canSetExamSettings: true, canAddStudents: true,
            canEditStudents: true, canDeleteStudents: true, canViewNationalId: true,
            canUploadStudentExcel: true, canExportStudents: true, canViewResults: true,
            canDeleteResults: true, canExportResults: true, canViewReports: true,
            canExportReports: true, canManageTeachers: true, canManageRoles: true,
            canViewLogs: true, canManageSettings: true,
          });
          setLoading(false);
          return;
        }

        // ✅ الطالب مفيش عنده أي صلاحيات
        if (userRole === 'student') {
          setPermissions({
            canCreateExams: false, canEditOwnExam: false, canEditAllExams: false,
            canDeleteExam: false, canViewAllExams: false, canUploadWord: false,
            canManualCreate: false, canSetExamSettings: false, canAddStudents: false,
            canEditStudents: false, canDeleteStudents: false, canViewNationalId: false,
            canUploadStudentExcel: false, canExportStudents: false, canViewResults: false,
            canDeleteResults: false, canExportResults: false, canViewReports: false,
            canExportReports: false, canManageTeachers: false, canManageRoles: false,
            canViewLogs: false, canManageSettings: false,
          });
          setLoading(false);
          return;
        }

        // ✅ المدرس: أول حاجة نشوف userProfile.permissions (من AuthContext أو default)
        if (userRole === 'teacher' && userProfile?.id) {

          if (userProfile.permissions) {
            const p = userProfile.permissions;
            setPermissions({
              canCreateExams:        p.canCreateExams       ?? false,
              canEditOwnExam:        p.canEditOwnExam       ?? false,
              canEditAllExams:       false,
              canDeleteExam:         p.canDeleteExam        ?? false,
              canViewAllExams:       p.canViewAllStudents   ?? false,
              canUploadWord:         p.canUploadWord        ?? false,
              canManualCreate:       p.canCreateQuestions   ?? false,
              canSetExamSettings:    p.canCreateExams       ?? false,
              canAddStudents:        p.canManageStudents    ?? false,
              canEditStudents:       p.canManageStudents    ?? false,
              canDeleteStudents:     false,
              canViewNationalId:     p.canViewStudentId     ?? false,
              canUploadStudentExcel: p.canManageStudents    ?? false,
              canExportStudents:     p.canManageStudents    ?? false,
              canViewResults:        p.canViewResults       ?? false,
              canDeleteResults:      false,
              canExportResults:      p.canDownloadExcel     ?? false,
              canViewReports:        p.canViewResults       ?? false,
              canExportReports:      p.canDownloadExcel     ?? false,
              canManageTeachers:     false,
              canManageRoles:        false,
              canViewLogs:           false,
              canManageSettings:     false,
            });
            setLoading(false);
            return;
          }

          // fallback: لو مفيش permissions في userProfile، نجرب roles/teacher في Firebase
          const roleDoc = await getDoc(doc(db, 'roles', 'teacher'));
          if (roleDoc.exists()) {
            setPermissions(roleDoc.data().permissions || null);
          } else {
            setPermissions({
              canCreateExams: false, canEditOwnExam: false, canEditAllExams: false,
              canDeleteExam: false, canViewAllExams: false, canUploadWord: false,
              canManualCreate: false, canSetExamSettings: false, canAddStudents: false,
              canEditStudents: false, canDeleteStudents: false, canViewNationalId: false,
              canUploadStudentExcel: false, canExportStudents: false, canViewResults: false,
              canDeleteResults: false, canExportResults: false, canViewReports: false,
              canExportReports: false, canManageTeachers: false, canManageRoles: false,
              canViewLogs: false, canManageSettings: false,
            });
          }
        } else {
          setPermissions(null);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userRole, userProfile?.id, userProfile?.permissions]);

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (userRole === 'admin') return true;
    if (!permissions) return false;
    return permissions[permission] === true;
  };

  const hasAnyPermission = (...permissionKeys: (keyof RolePermissions)[]): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  };

  const hasAllPermissions = (...permissionKeys: (keyof RolePermissions)[]): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  };

  return { permissions, loading, hasPermission, hasAnyPermission, hasAllPermissions };
};
