// =====================================================================
// صفحة الشهادات والتكريمات (self-contained)
// 4 أنواع: طالب | معلم | عامل | شهادة المسؤول الخاصة (admin only)
// =====================================================================
import { useState, useRef, useCallback } from 'react';

// ─── Config: غير IS_ADMIN حسب المستخدم الحالي ─────────────────────────
const IS_ADMIN = true; // استبدلها بـ useAuth() في Firebase

// ─── Types ────────────────────────────────────────────────────────────
type CertType = 'student' | 'teacher' | 'worker' | 'admin_special';

interface CertConfig {
  id: CertType;
  label: string;
  icon: string;
  color: string;
  adminOnly: boolean;
  fields: FieldDef[];
  topLine?: string;
  recipientPrefix: string;
  achievementLabel?: string;
  bodyText: string;
  footerNote?: string;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'date' | 'select';
  options?: string[];
}

interface CertFormData {
  [key: string]: string;
}

interface SavedCert {
  id: string;
  type: CertType;
  recipientName: string;
  date: string;
  config: CertConfig;
  data: CertFormData;
}

// ─── Certificate configs (استبدلها ببياناتك) ─────────────────────────
const CERT_CONFIGS: CertConfig[] = [
  {
    id: 'student',
    label: 'شهادة طالب',
    icon: '🎓',
    color: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    adminOnly: false,
    recipientPrefix: 'الطالب/ة',
    achievementLabel: 'تقديراً على تفوقه وحصوله على',
    topLine: 'تتقدم إدارة مدرسة الرواد الثانوية الفنية للتمريض بقنا\nبالشكر والتقدير إلى',
    bodyText: 'كما نتقدم بالشكر الجزيل لأسرته على الاهتمام وحسن المتابعة\nسائلين الله له المزيد من التفوق والنجاح ،،',
    fields: [
      { key: 'recipientName', label: 'اسم الطالب/ة', placeholder: 'أدخل اسم الطالب' },
      { key: 'achievement', label: 'سبب التكريم / المادة / الدرجة', placeholder: 'مثال: الحصول على أعلى درجة في الرياضيات' },
      { key: 'className', label: 'الفصل الدراسي', placeholder: 'مثال: الثاني أ' },
      { key: 'date', label: 'تاريخ الإصدار', placeholder: '', type: 'date' },
    ],
  },
  {
    id: 'teacher',
    label: 'شهادة معلم',
    icon: '👨‍🏫',
    color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    adminOnly: false,
    recipientPrefix: 'إلى الأستاذ/',
    topLine: 'شكراً لك على عطائك',
    bodyText: 'نتقدم بخالص الشكر والتقدير لسيادتكم على جهودكم المبذولة\nنشكركم على تعاونكم وتفانيكم في العمل\nنثمن عالياً مساهمتكم القيمة.',
    fields: [
      { key: 'recipientName', label: 'اسم المعلم', placeholder: 'أدخل اسم المعلم' },
      { key: 'subject', label: 'المادة الدراسية', placeholder: 'مثال: الرياضيات' },
      { key: 'date', label: 'تاريخ الإصدار', placeholder: '', type: 'date' },
    ],
  },
  {
    id: 'worker',
    label: 'شهادة عامل',
    icon: '👷',
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    adminOnly: false,
    recipientPrefix: 'إلى السيد/ة',
    topLine: 'شكراً لك على عطائك',
    bodyText: 'نتقدم بخالص الشكر والتقدير لسيادتكم على جهودكم المبذولة\nنشكركم على تعاونكم وتفانيكم في العمل\nنثمن عالياً مساهمتكم القيمة.',
    fields: [
      { key: 'recipientName', label: 'اسم العامل/ة', placeholder: 'أدخل اسم العامل' },
      { key: 'role', label: 'المسمى الوظيفي', placeholder: 'مثال: أمين مخزن' },
      { key: 'date', label: 'تاريخ الإصدار', placeholder: '', type: 'date' },
    ],
  },
  {
    id: 'admin_special',
    label: 'شهادة المسؤول الخاصة',
    icon: '⭐',
    color: 'linear-gradient(135deg, #9333ea 0%, #581c87 100%)',
    adminOnly: true,
    topLine: 'يسر أ/ حمدي محمد  -  معلم الحاسب الآلي\nبمدرسة الرواد الثانوية الفنية للتمريض بقنا تحت إدارة المدرسة\nبمنح هذه الشهادة إلى',
    recipientPrefix: 'الطالب/ة',
    achievementLabel: 'تقديراً على تفوقه وحصوله على',
    bodyText: 'كما نتقدم بالشكر الجزيل لأسرته على الاهتمام وحسن المتابعة\nسائلين الله له المزيد من التفوق والنجاح ،،',
    fields: [
      { key: 'recipientName', label: 'اسم الطالب/ة', placeholder: 'أدخل اسم الطالب' },
      { key: 'achievement', label: 'سبب التكريم / المادة / الدرجة', placeholder: 'مثال: الحصول على المركز الأول' },
      { key: 'className', label: 'الفصل الدراسي', placeholder: 'مثال: الثاني أ' },
      { key: 'date', label: 'تاريخ الإصدار', placeholder: '', type: 'date' },
    ],
  },
];

// ─── Certificate Preview Component ───────────────────────────────────
interface PreviewProps {
  config: CertConfig;
  data: CertFormData;
}

const CertificatePreview = ({ config, data }: PreviewProps) => {
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '_______________';

  return (
    <div style={{
      width: '1000px',
      height: '700px',
      background: 'linear-gradient(135deg, #fdfcfb 0%, #f7f4ed 100%)',
      padding: '60px 80px',
      borderRadius: '24px',
      border: '12px solid',
      borderImage: 'linear-gradient(135deg, #1a3a8f 0%, #c9a227 100%)',
      borderImageSlice: 1,
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      fontFamily: "'Amiri', serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at 20px 20px, rgba(201,162,39,0.08) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top logos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '-10px' }}>
          <div style={{ textAlign: 'right', width: '90px' }}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Egypt_%28variant%29.svg/320px-Flag_of_Egypt_%28variant%29.svg.png"
              alt="علم مصر"
              style={{ width: '90px', height: '60px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a3a8f', lineHeight: 1.4, marginBottom: '4px' }}>
              جمهورية مصر العربية<br />وزارة الصحة والسكان
            </h2>
            <p style={{ fontSize: '18px', color: '#c9a227', fontWeight: 'bold', fontStyle: 'italic' }}>
              مدرسة الرواد الثانوية الفنية للتمريض بقنا
            </p>
          </div>
          <div style={{ width: '90px' }}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Emblem_of_the_Ministry_of_Health_%26_Population_of_Egypt.svg/200px-Emblem_of_the_Ministry_of_Health_%26_Population_of_Egypt.svg.png"
              alt="لوجو وزارة الصحة والسكان"
              style={{ width: '90px', height: '90px', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Decorative divider */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#bfdbfe' }} />
          <span style={{ color: '#c9a227', fontSize: '18px' }}>✦</span>
          <div style={{ flex: 1, height: '1px', background: '#bfdbfe' }} />
        </div>

        {/* Top text block */}
        {config.topLine && (
          <div style={{ textAlign: 'center', color: '#1a3a8f' }}>
            {config.topLine.split('\n').map((line, i) => (
              <p key={i} style={{ fontSize: i === 0 ? '20px' : '16px', fontWeight: i === 0 ? 'bold' : 'normal', lineHeight: 1.8 }}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Recipient */}
        <div style={{ width: '100%', textAlign: 'right', borderBottom: '1.5px solid #999', paddingBottom: '6px', marginTop: '8px' }}>
          <span style={{ fontSize: '18px', color: '#333' }}>{config.recipientPrefix}</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a3a8f', marginRight: '12px' }}>
            {data.recipientName || '___________________________'}
          </span>
          {config.id === 'teacher' && data.subject && (
            <span style={{ fontSize: '16px', color: '#555', marginRight: '8px' }}>— {data.subject}</span>
          )}
          {config.id === 'worker' && data.role && (
            <span style={{ fontSize: '16px', color: '#555', marginRight: '8px' }}>— {data.role}</span>
          )}
        </div>

        {/* Achievement line (for student & admin_special) */}
        {config.achievementLabel && (
          <div style={{ width: '100%', textAlign: 'right', borderBottom: '1.5px solid #999', paddingBottom: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '18px', color: '#333' }}>{config.achievementLabel}</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a8f', marginRight: '12px' }}>
              {data.achievement || '___________________________'}
            </span>
          </div>
        )}

        {/* Class (if present) */}
        {data.className && (
          <div style={{ width: '100%', textAlign: 'right', marginTop: '-4px' }}>
            <span style={{ fontSize: '15px', color: '#555' }}>الفصل الدراسي: </span>
            <span style={{ fontSize: '16px', color: '#1a3a8f', fontWeight: 'bold' }}>{data.className}</span>
          </div>
        )}

        {/* Body text */}
        <div style={{ textAlign: 'center', marginTop: '16px', color: '#1a3a8f' }}>
          {config.bodyText.split('\n').map((line, i) => (
            <p key={i} style={{ fontSize: '18px', fontStyle: 'italic', fontWeight: 'bold', lineHeight: 2 }}>{line}</p>
          ))}
        </div>

        {/* Footer row */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '24px', paddingLeft: '16px', paddingRight: '16px' }}>
          {/* Principal signature */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: '#333', marginBottom: '24px' }}>مديرة المدرسة</p>
            <div style={{ width: '120px', borderBottom: '1.5px solid #333' }} />
          </div>

          {/* Gold seal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #f9e29a, #c9a227, #8b6914)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(201,162,39,0.5)',
              border: '3px solid #c9a227',
            }}>
              <span style={{ fontSize: '10px', color: '#3d2800', fontWeight: 'bold', lineHeight: 1.2 }}>⭐</span>
              <span style={{ fontSize: '9px', color: '#3d2800', fontWeight: 'bold' }}>Best</span>
              <span style={{ fontSize: '11px', color: '#3d2800', fontWeight: 'bold', fontStyle: 'italic' }}>AWARD</span>
              <span style={{ fontSize: '8px', color: '#3d2800' }}>2026</span>
            </div>
          </div>

          {/* Date */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '15px', color: '#333' }}>
              تحريراً في: {dateStr}
            </p>
          </div>
        </div>

        {/* Designed by */}
        <div style={{ width: '100%', textAlign: 'left', marginTop: '8px' }}>
          <p style={{ fontSize: '11px', color: '#1a3a8f', fontStyle: 'italic', opacity: 0.7 }}>Designed by Hamdy</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────
export default function Certificates() {
  const [selectedType, setSelectedType] = useState<CertType>('student');
  const [formData, setFormData] = useState<CertFormData>({});
  const [savedCerts, setSavedCerts] = useState<SavedCert[]>([]);
  const [viewingSaved, setViewingSaved] = useState<SavedCert | null>(null);
  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [saved, setSaved] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const config = CERT_CONFIGS.find(c => c.id === selectedType)!;
  const visibleTypes = CERT_CONFIGS.filter(c => !c.adminOnly || IS_ADMIN);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8"/>
        <title>شهادة - ${formData.recipientName || 'غير محدد'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${el.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 500);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSave = () => {
    if (!formData.recipientName) return;
    const cert: SavedCert = {
      id: `cert_${Date.now()}`,
      type: selectedType,
      recipientName: formData.recipientName,
      date: formData.date || new Date().toISOString().split('T')[0],
      config,
      data: { ...formData },
    };
    setSavedCerts(prev => [cert, ...prev]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleField = useCallback((key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = () => setFormData({});

  const changeType = (t: CertType) => {
    setSelectedType(t);
    setFormData({});
  };

  const activeConfig = viewingSaved ? viewingSaved.config : config;
  const activeData = viewingSaved ? viewingSaved.data : formData;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: 'white',
      fontFamily: "'Cairo', sans-serif",
    }} dir="rtl">
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: '#111827',
        padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              🏅 الشهادات والتكريمات
            </h1>
            <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 2 }}>إنشاء وطباعة شهادات الطلاب والمعلمين والعاملين</p>
          </div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', backgroundColor: '#1f2937', borderRadius: 12, padding: 4, gap: 4 }}>
            {[{ key: 'create', label: '✏️ إنشاء جديد' }, { key: 'history', label: `📁 السجل (${savedCerts.length})` }].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key as 'create' | 'history'); setViewingSaved(null); }}
                style={{
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: tab === t.key ? '#2563eb' : 'transparent',
                  color: tab === t.key ? 'white' : '#9ca3af',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'create' ? (
        <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 80px)' }}>

          {/* ── Left panel: form ── */}
          <div style={{
            width: 384,
            flexShrink: 0,
            backgroundColor: '#111827',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Certificate type selector */}
              <div>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: '500' }}>نوع الشهادة</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {visibleTypes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => changeType(c.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: 12,
                        borderRadius: 12,
                        border: selectedType === c.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: selectedType === c.id ? 'rgba(59, 130, 246, 0.1)' : '#1f2937',
                        color: selectedType === c.id ? '#93c5fd' : '#d1d5db',
                        fontSize: 14,
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{c.icon}</span>
                      <span>{c.label}</span>
                      {c.adminOnly && (
                        <span style={{ fontSize: 10, backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, borderRadius: 20 }}>مسؤول</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>بيانات الشهادة</p>
                {config.fields.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: 14, color: '#d1d5db', marginBottom: 4, display: 'block' }}>{field.label}</label>
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={formData[field.key] || ''}
                      onChange={e => handleField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        paddingLeft: 16,
                        paddingRight: 16,
                        paddingTop: 10,
                        paddingBottom: 10,
                        color: 'white',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                <button
                  onClick={handlePrint}
                  style={{
                    flex: 1,
                    backgroundColor: '#2563eb',
                    color: 'white',
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  🖨️ طباعة / PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.recipientName}
                  style={{
                    flex: 1,
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: '500',
                    border: 'none',
                    cursor: formData.recipientName ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: saved ? '#059669' : '#374151',
                    color: 'white',
                    opacity: formData.recipientName ? 1 : 0.4,
                  }}
                >
                  {saved ? '✅ تم الحفظ' : '💾 حفظ في السجل'}
                </button>
              </div>
              <button
                onClick={resetForm}
                style={{
                  width: '100%',
                  fontSize: 14,
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
              >
                إعادة تعيين
              </button>
            </div>
          </div>

          {/* ── Right panel: preview ── */}
          <div style={{
            flex: 1,
            backgroundColor: '#030712',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            overflowY: 'auto',
          }}>
            <div>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 16 }}>معاينة الشهادة</p>
              <div ref={printRef} style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                <CertificatePreview config={activeConfig} data={activeData} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── History tab ── */
        <div style={{ padding: 24 }}>
          {savedCerts.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 256,
              color: '#6b7280',
            }}>
              <span style={{ fontSize: 48, marginBottom: 16 }}>📋</span>
              <p style={{ fontSize: 18 }}>لا توجد شهادات محفوظة بعد</p>
              <p style={{ fontSize: 14 }}>أنشئ شهادة جديدة واضغط "حفظ في السجل"</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {savedCerts.map(cert => (
                <div key={cert.id} style={{
                  backgroundColor: '#111827',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{cert.config.icon}</span>
                    <div>
                      <p style={{ fontWeight: '600', color: 'white' }}>{cert.recipientName}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af' }}>{cert.config.label}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    {new Date(cert.date).toLocaleDateString('ar-EG')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setViewingSaved(cert); setTab('create'); }}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderRadius: 8,
                        fontSize: 12,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      👁️ عرض
                    </button>
                    <button
                      onClick={() => setSavedCerts(prev => prev.filter(c => c.id !== cert.id))}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderRadius: 8,
                        fontSize: 12,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
