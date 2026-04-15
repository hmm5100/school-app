// src/pages/Login.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('بيانات الدخول غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      direction: 'rtl',
      fontFamily: 'Cairo, Tajawal, sans-serif',
      background: '#0f2244',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(37,85,160,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(192,57,43,0.1) 0%, transparent 70%)',
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            top: `${10 + i * 15}%`,
            right: `${i % 2 === 0 ? i * 10 : 60 + i * 5}%`,
            animation: `float${i} ${8 + i * 2}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float0 { from { transform: translateY(0px) scale(1); } to { transform: translateY(-30px) scale(1.05); } }
        @keyframes float1 { from { transform: translateY(0px) scale(1); } to { transform: translateY(20px) scale(0.95); } }
        @keyframes float2 { from { transform: translateY(-10px); } to { transform: translateY(20px); } }
        @keyframes float3 { from { transform: translateX(0px); } to { transform: translateX(30px); } }
        @keyframes float4 { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-20px) rotate(5deg); } }
        @keyframes float5 { from { transform: scale(1); } to { transform: scale(1.1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
        .error-shake { animation: shake 0.4s ease; }
      `}</style>

      {/* Right login form */}
      <div style={{
        width: '440px',
        minWidth: '340px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        boxShadow: '20px 0 60px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
        order: -1,
      }}>
        {/* Mobile logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="شعار المدرسة"
            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }}
          />
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>
            تسجيل الدخول
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            أدخل بياناتك للوصول إلى النظام
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Error message */}
          {error && (
            <div className="error-shake" style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#dc2626', lineHeight: '1.5' }}>{error}</span>
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              البريد الإلكتروني
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#94a3b8" style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@rowad.edu.eg"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Cairo, sans-serif',
                  color: '#1a202c',
                  background: '#f8fafc',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2555a0'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#94a3b8" style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 44px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Cairo, sans-serif',
                  color: '#1a202c',
                  background: '#f8fafc',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2555a0'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? '#94a3b8'
                : 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(37,85,160,0.35)',
              marginBottom: '12px',
            }}
          >
            {loading ? 'جاري الدخول...' : 'دخول إلى النظام'}
          </button>

          {/* Dev mode bypass */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleDevLogin}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1.5px dashed #7dd3fc',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
              }}
            >
              🛠️ دخول وضع التطوير (بدون Firebase)
            </button>
          )}
        </form>

        <p style={{
          marginTop: '32px',
          color: '#cbd5e1',
          fontSize: '11px',
          textAlign: 'center',
        }}>
          مدرسة الرواد الثانوية الفنية للتمريض &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Left decorative panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        position: 'relative',
      }}>
        <div style={{
          width: '160px',
          height: '160px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <img
            src="/logo.png"
            alt="شعار المدرسة"
            style={{ width: '130px', height: '130px', objectFit: 'contain' }}
          />
        </div>

        <h1 style={{
          color: 'white',
          fontSize: '28px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '12px',
          lineHeight: '1.4',
        }}>
          مدرسة الرواد الثانوية الفنية للتمريض
        </h1>

        {/* Developer name */}
        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '13px',
          textAlign: 'center',
          marginBottom: '6px',
          fontWeight: '500',
        }}>
          المطور: Mr.Hamdy Mohamed
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '12px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          (حمدي الهاشمي)
        </p>

        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          textAlign: 'center',
          lineHeight: '1.7',
          maxWidth: '320px',
        }}>
          نظام متكامل لإدارة الطلاب والامتحانات والدرجات
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginTop: '40px',
        }}>
          {[
            { value: '478', label: 'طالب' },
            { value: '14', label: 'فصل' },
            { value: '100%', label: 'رقمنة' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '16px 20px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}>
              <p style={{ color: '#f39c12', fontSize: '22px', fontWeight: '900', lineHeight: '1' }}>
                {stat.value}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div style={{
        width: '440px',
        minWidth: '340px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Mobile logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="شعار المدرسة"
            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }}
          />
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>
            تسجيل الدخول
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            أدخل بياناتك للوصول إلى النظام
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Error message */}
          {error && (
            <div className="error-shake" style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#dc2626', lineHeight: '1.5' }}>{error}</span>
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              البريد الإلكتروني
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#94a3b8" style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@rowad.edu.eg"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Cairo, sans-serif',
                  color: '#1a202c',
                  background: '#f8fafc',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2555a0'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#94a3b8" style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 44px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Cairo, sans-serif',
                  color: '#1a202c',
                  background: '#f8fafc',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2555a0'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? '#94a3b8'
                : 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(37,85,160,0.35)',
              marginBottom: '12px',
            }}
          >
            {loading ? 'جاري الدخول...' : 'دخول إلى النظام'}
          </button>

          {/* Dev mode bypass */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleDevLogin}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1.5px dashed #7dd3fc',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
              }}
            >
              🛠️ دخول وضع التطوير (بدون Firebase)
            </button>
          )}
        </form>

        <p style={{
          marginTop: '32px',
          color: '#cbd5e1',
          fontSize: '11px',
          textAlign: 'center',
        }}>
          مدرسة الرواد الثانوية الفنية للتمريض &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
