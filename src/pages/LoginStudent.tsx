// src/pages/LoginStudent.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Hash, AlertCircle,
  CheckCircle2, ArrowRight, BookOpen, GraduationCap,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Verification card
// ─────────────────────────────────────────────
interface VerificationCardProps {
  name: string;
  className: string;
  studentNumber: number;
  allowedSubjects: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const VerificationCard = ({
  name, className, studentNumber, allowedSubjects, onConfirm, onCancel,
}: VerificationCardProps) => (
  <div style={{
    background: '#f0fdf4', border: '1.5px solid #86efac',
    borderRadius: '16px', padding: '24px', marginBottom: '20px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <CheckCircle2 size={20} color="white" />
      </div>
      <div>
        <p style={{ fontSize: '13px', color: '#15803d', fontWeight: '600', margin: 0 }}>تم التحقق من بياناتك</p>
        <p style={{ fontSize: '11px', color: '#4ade80', margin: 0 }}>تأكد أن هذه بياناتك قبل الدخول</p>
      </div>
    </div>

    <div style={{
      background: 'white', borderRadius: '12px', padding: '16px',
      border: '1px solid #dcfce7', marginBottom: '16px',
    }}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>الاسم الكامل</span>
          <span style={{ fontSize: '14px', color: '#1a202c', fontWeight: '700' }}>{name}</span>
        </div>
        <div style={{ height: '1px', background: '#f1f5f9' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>الفصل</span>
          <span style={{
            fontSize: '13px', color: '#0369a1', fontWeight: '700',
            background: '#eff6ff', padding: '3px 10px', borderRadius: '20px',
          }}>{className}</span>
        </div>
        <div style={{ height: '1px', background: '#f1f5f9' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>رقم الكشف</span>
          <span style={{ fontSize: '14px', color: '#1a202c', fontWeight: '700' }}>
            {String(studentNumber).padStart(3, '0')}
          </span>
        </div>
        {allowedSubjects.length > 0 ? (
          <>
            <div style={{ height: '1px', background: '#f1f5f9' }} />
            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                المواد المسموح بها
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allowedSubjects.map((subj, i) => (
                  <span key={i} style={{
                    fontSize: '11px', color: '#047857', fontWeight: '600',
                    background: '#dcfce7', padding: '3px 10px', borderRadius: '20px',
                    border: '1px solid #bbf7d0',
                  }}>
                    <BookOpen size={10} style={{ display: 'inline', marginLeft: '4px' }} />
                    {subj}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ height: '1px', background: '#f1f5f9' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={13} color="#94a3b8" />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>المواد ستحدد من قِبل الإدارة</span>
            </div>
          </>
        )}
      </div>
    </div>

    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        onClick={onConfirm}
        style={{
          flex: 1, padding: '12px',
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
          color: 'white', border: 'none', borderRadius: '10px',
          fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '6px',
          boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
        }}
      >
        تأكيد ودخول <ArrowRight size={16} />
      </button>
      <button
        onClick={onCancel}
        style={{
          padding: '12px 20px', background: 'white', color: '#64748b',
          border: '1.5px solid #e2e8f0', borderRadius: '10px',
          fontSize: '13px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
        }}
      >
        تغيير
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
const LoginStudent = () => {
  const [credential, setCredential]   = useState('');
  const [showCred, setShowCred]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [verificationData, setVerificationData] = useState<{
    name: string; className: string; studentNumber: number; allowedSubjects: string[];
  } | null>(null);

  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credential.trim()) { setError('يرجى إدخال الرقم القومي'); return; }
    const digits = credential.trim().replace(/[^\d]/g, '');
    if (digits.length !== 14) { setError('الرقم القومي يجب أن يكون 14 رقم'); return; }

    try {
      setLoading(true);
      const result = await loginStudent('', credential.trim());
      setVerificationData({
        name: result.student.name,
        className: result.student.className,
        studentNumber: result.student.number,
        allowedSubjects: result.allowedSubjects,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ. تحقق من رقمك القومي.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => navigate('/exams');
  const handleCancel  = () => { setVerificationData(null); setError(''); };

  const stats = [
    { value: '14', label: 'فصل دراسي' },
    { value: '١٠٠٪', label: 'أمان وخصوصية' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
    }}>
      {/* Left decorative panel */}
      <div style={{
        flex: 1, background: 'linear-gradient(160deg, #052e16 0%, #14532d 40%, #166534 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        {[
          { size: 320, top: '-80px', right: '-80px', opacity: 0.06 },
          { size: 200, bottom: '60px', left: '-60px', opacity: 0.08 },
          { size: 120, top: '40%', left: '30%', opacity: 0.05 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', width: c.size, height: c.size, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)', background: `rgba(255,255,255,${c.opacity})`,
            top: (c as any).top, bottom: (c as any).bottom,
            right: (c as any).right, left: (c as any).left,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 28px',
            background: 'rgba(255,255,255,0.12)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <GraduationCap size={40} color="white" />
          </div>

          {/* Developer Badge */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '16px', padding: '12px 32px', marginBottom: '24px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: '600',
              letterSpacing: '2px', marginBottom: '5px',
            }}>
              ✦ المطور ✦
            </span>
            <span style={{
              color: '#ffffff', fontSize: '20px', fontWeight: '900',
              letterSpacing: '0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
              Mr. Hamdy Mohamed
            </span>
            <span style={{
              color: '#4ade80', fontSize: '14px', fontWeight: '700',
              marginTop: '4px', letterSpacing: '0.5px',
            }}>
              ( حمدي الهاشمي )
            </span>
          </div>

          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '900', marginBottom: '12px' }}>
            منظومة الاختبارات
          </h1>
          <h2 style={{ color: '#86efac', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            مدرسة الرواد الثانوية الفنية للتمريض
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: '1.8' }}>
            منصة إلكترونية متكاملة لإدارة الاختبارات ومتابعة أداء الطلاب بكل يسر وأمان
          </p>
        </div>

        {/* Stats */}
        <div style={{
          position: 'relative', zIndex: 1, display: 'flex', gap: '16px',
          marginTop: '48px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', padding: '16px 22px', textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}>
              <p style={{ color: '#4ade80', fontSize: '22px', fontWeight: '900', lineHeight: '1' }}>{stat.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '4px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' }}>هل أنت مدرس أو مدير؟</p>
          <Link to="/login" style={{
            color: '#86efac', fontSize: '13px', fontWeight: '600',
            textDecoration: 'none', borderBottom: '1px solid rgba(134,239,172,0.4)', paddingBottom: '2px',
          }}>
            انتقل إلى صفحة دخول الكادر ←
          </Link>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        width: '480px', minWidth: '340px', background: 'white',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 40px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.35)',
        position: 'relative', zIndex: 1, overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '28px', textAlign: 'center', width: '100%' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
          }}>
            <GraduationCap size={28} color="white" />
          </div>
          
          {/* Developer Credit */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', margin: '2px 0' }}>
              المطور: Mr.Hamdy Mohamed
            </p>
            <p style={{ color: '#64748b', fontSize: '10px', margin: '2px 0' }}>
              (حمدي الهاشمي)
            </p>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0a2b1a', marginBottom: '4px' }}>
            دخول الطلاب
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            أدخل رقمك القومي للدخول
          </p>
        </div>

        {verificationData ? (
          <div style={{ width: '100%' }}>
            <VerificationCard
              name={verificationData.name}
              className={verificationData.className}
              studentNumber={verificationData.studentNumber}
              allowedSubjects={verificationData.allowedSubjects}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <form onSubmit={handleVerify} style={{ width: '100%' }}>

            {/* Error */}
            {error && (
              <div className="error-shake" style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13px', color: '#dc2626', lineHeight: '1.5' }}>{error}</span>
              </div>
            )}

            {/* Credential input - nationalId only */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                الرقم القومي
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={17} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showCred ? 'text' : 'password'}
                  value={credential}
                  onChange={e => setCredential(e.target.value.replace(/\D/g, ''))}
                  placeholder="أدخل رقمك القومي (14 رقم)"
                  maxLength={14}
                  style={{
                    width: '100%', padding: '12px 44px 12px 44px',
                    border: '1.5px solid #e2e8f0', borderRadius: '12px',
                    fontSize: '14px', fontFamily: 'Cairo, sans-serif',
                    color: '#1a202c', background: '#f8fafc', outline: 'none',
                    direction: 'ltr', textAlign: 'left', letterSpacing: '0.05em',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowCred(!showCred)}
                  style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
                  }}
                >
                  {showCred ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px', marginRight: '4px' }}>
                أدخل الرقم القومي المكوّن من 14 رقم
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(22,163,74,0.35)',
              }}
            >
              {loading ? 'جاري التحقق...' : 'تحقق من بياناتي'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: '11px', marginBottom: '8px' }}>
            مدرسة الرواد الثانوية الفنية للتمريض &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginStudent;
