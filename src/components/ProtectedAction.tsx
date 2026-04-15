// src/components/ProtectedAction.tsx
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import type { RolePermissions } from '../types';

// ─────────────────────────────────────────────
// رسالة عدم وجود صلاحية
// ─────────────────────────────────────────────
const UnauthorizedMessage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        غير مصرح لك بالوصول
      </h2>
      <p className="text-gray-600 mb-6">
        ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
        <br />
        يرجى التواصل مع المسؤول لمنحك الصلاحيات المطلوبة.
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        العودة للخلف
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// شاشة التحميل
// ─────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">جاري التحقق من الصلاحيات...</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// 1️⃣ حماية صفحة كاملة
// ─────────────────────────────────────────────
interface ProtectedPageProps {
  permission: keyof RolePermissions;
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

export const ProtectedPage = ({
  permission,
  children,
  redirectTo,
  fallback,
}: ProtectedPageProps) => {
  const { hasPermission, loading } = usePermissions();
  const { userRole } = useAuth();

  // الانتظار حتى تحميل الصلاحيات
  if (loading) {
    return <LoadingScreen />;
  }

  // التحقق من الصلاحية
  const hasAccess = hasPermission(permission);

  if (!hasAccess) {
    // إذا كان هناك redirect URL
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // إذا كان هناك fallback مخصص
    if (fallback) {
      return <>{fallback}</>;
    }

    // عرض رسالة عدم وجود صلاحية
    return <UnauthorizedMessage />;
  }

  // عرض الصفحة
  return <>{children}</>;
};

// ─────────────────────────────────────────────
// 2️⃣ حماية عنصر UI (زر، رابط، إلخ)
// ─────────────────────────────────────────────
interface ProtectedActionProps {
  permission: keyof RolePermissions;
  children: ReactNode;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}

export const ProtectedAction = ({
  permission,
  children,
  fallback = null,
  hideIfNoAccess = true,
}: ProtectedActionProps) => {
  const { hasPermission, loading } = usePermissions();

  // الانتظار حتى تحميل الصلاحيات
  if (loading) {
    return null;
  }

  const hasAccess = hasPermission(permission);

  if (!hasAccess) {
    // إخفاء العنصر تماماً
    if (hideIfNoAccess) {
      return null;
    }

    // أو عرض fallback
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// ─────────────────────────────────────────────
// 3️⃣ حماية متعددة (ANY = واحدة على الأقل)
// ─────────────────────────────────────────────
interface ProtectedMultipleProps {
  permissions: (keyof RolePermissions)[];
  requireAll?: boolean; // true = كل الصلاحيات مطلوبة، false = واحدة على الأقل
  children: ReactNode;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}

export const ProtectedMultiple = ({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  hideIfNoAccess = true,
}: ProtectedMultipleProps) => {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const hasAccess = requireAll
    ? hasAllPermissions(...permissions)
    : hasAnyPermission(...permissions);

  if (!hasAccess) {
    if (hideIfNoAccess) {
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
