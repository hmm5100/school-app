// src/components/Header.tsx
// مكون الهيدر الثابت: هوية المدرسة، اللوجو، اسم صاحب البرنامج

import { APP_IDENTITY } from '../services/securityService';

interface HeaderProps {
  /** نص إضافي اختياري يظهر بجانب اسم المدرسة */
  subtitle?: string;
  /** إظهار شريط بيانات الهوية الكاملة (يُستخدم في صفحات الطباعة) */
  printMode?: boolean;
  /** اتجاه: 'row' أفقي أو 'column' عمودي */
  layout?: 'row' | 'column';
  /** حجم شعار المدرسة */
  logoSize?: number;
  /** className للتخصيص الخارجي */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Header الثابت يحتوي على:
 * - لوجو المدرسة
 * - اسم المدرسة
 * - اسم صاحب البرنامج Mr.Hamdy Mohamed
 * يُستخدم في: صفحة تسجيل الدخول، الشهادات، التقارير، الطباعة
 */
const Header = ({
  subtitle,
  printMode = false,
  layout = 'row',
  logoSize = 64,
  className = '',
  style = {},
}: HeaderProps) => {

  const isColumn = layout === 'column';

  return (
    <header
      className={className}
      style={{
        display: 'flex',
        flexDirection: isColumn ? 'column' : 'row',
        alignItems: 'center',
        gap: isColumn ? '12px' : '16px',
        direction: 'rtl',
        ...style,
      }}
    >
      {/* ── اللوجو ── */}
      <div style={{ flexShrink: 0 }}>
        <img
          src={APP_IDENTITY.logoPath}
          alt={`لوجو ${APP_IDENTITY.schoolName}`}
          width={logoSize}
          height={logoSize}
          onError={(e) => {
            // Fallback to default school icon if logo fails
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = 'none';
          }}
          style={{
            width:        logoSize,
            height:       logoSize,
            objectFit:    'contain',
            borderRadius: '12px',
          }}
        />
      </div>

      {/* ── النصوص ── */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    isColumn ? 'center' : 'flex-start',
          gap:           '2px',
        }}
      >
        {/* اسم التطبيق */}
        <span
          style={{
            fontSize:   printMode ? '22px' : '18px',
            fontWeight: '800',
            color:      '#0f2244',
            lineHeight: 1.2,
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          {APP_IDENTITY.appName}
        </span>

        {/* اسم المدرسة */}
        <span
          style={{
            fontSize:   printMode ? '16px' : '13px',
            fontWeight: '600',
            color:      '#2555a0',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          {APP_IDENTITY.schoolName}
        </span>

        {/* subtitle اختياري */}
        {subtitle && (
          <span
            style={{
              fontSize:   '12px',
              fontWeight: '500',
              color:      '#64748b',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            {subtitle}
          </span>
        )}

        {/* صاحب البرنامج — يظهر دائمًا */}
        <span
          style={{
            fontSize:   printMode ? '13px' : '11px',
            fontWeight: '500',
            color:      '#94a3b8',
            fontFamily: 'Cairo, sans-serif',
            direction:  'ltr',
          }}
        >
          Developed by {APP_IDENTITY.ownerName}
        </span>
      </div>
    </header>
  );
};

// ─────────────────────────────────────────────────────────────────
// مكون شريط الطباعة — يظهر في أعلى الصفحة عند الطباعة
// ─────────────────────────────────────────────────────────────────

interface PrintHeaderProps {
  title?: string;
  date?: string;
}

export const PrintHeader = ({ title, date }: PrintHeaderProps) => {
  const now = date ?? new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '16px 24px',
        borderBottom:   '3px solid #0f2244',
        marginBottom:   '24px',
        direction:      'rtl',
      }}
    >
      {/* اليسار: اللوجو + البيانات */}
      <Header layout="row" logoSize={56} printMode />

      {/* اليمين: عنوان التقرير والتاريخ */}
      <div style={{ textAlign: 'left', direction: 'ltr' }}>
        {title && (
          <div style={{
            fontSize: '16px', fontWeight: '700',
            color: '#0f2244', fontFamily: 'Cairo, sans-serif',
          }}>
            {title}
          </div>
        )}
        <div style={{
          fontSize: '13px', color: '#64748b',
          fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>
          {now}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// مكون Footer ثابت للشهادات والتقارير
// ─────────────────────────────────────────────────────────────────

export const AppFooter = () => (
  <footer
    style={{
      textAlign:   'center',
      padding:     '12px 0',
      borderTop:   '1px solid #e2e8f0',
      marginTop:   '24px',
      fontSize:    '11px',
      color:       '#94a3b8',
      fontFamily:  'Cairo, sans-serif',
      direction:   'rtl',
    }}
  >
    {APP_IDENTITY.copyrightText}
  </footer>
);

export default Header;
