// src/pages/LoginTeacher.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ShieldCheck, Users } from 'lucide-react';

const LoginTeacher = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      setLoading(true);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('بيانات الدخول غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
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
        @keyframes float0 { from{transform:translateY(0px) scale(1)} to{transform:translateY(-30px) scale(1.05)} }
        @keyframes float1 { from{transform:translateY(0px) scale(1)} to{transform:translateY(20px) scale(0.95)} }
        @keyframes float2 { from{transform:translateY(-10px)} to{transform:translateY(20px)} }
        @keyframes float3 { from{transform:translateX(0px)} to{transform:translateX(30px)} }
        @keyframes float4 { from{transform:translateY(0px) rotate(0deg)} to{transform:translateY(-20px) rotate(5deg)} }
        @keyframes float5 { from{transform:scale(1)} to{transform:scale(1.1)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        .error-shake { animation: shake 0.4s ease; }
        input::placeholder { color: #cbd5e1; }
      `}</style>

      {/* Right form panel */}
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
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(37,85,160,0.3)',
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>
            دخول الكادر
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            للمدرسين والمسؤولين فقط
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              البريد الإلكتروني
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@rowad.edu.eg"
                style={{ width: '100%', padding: '12px 44px 12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', color: '#1a202c', background: '#f8fafc', outline: 'none', direction: 'ltr', textAlign: 'left', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2555a0'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', padding: '12px 44px 12px 44px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', color: '#1a202c', background: '#f8fafc', outline: 'none', direction: 'ltr', textAlign: 'left', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2555a0'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
            <div style={{
              width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
              border: `2px solid ${rememberMe ? '#2555a0' : '#cbd5e1'}`,
              background: rememberMe ? '#2555a0' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {rememberMe && <span style={{ color: 'white', fontSize: '11px', fontWeight: '900' }}>✓</span>}
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', userSelect: 'none' }}>تذكرني</span>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1a3a6b 0%, #2555a0 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 16px rgba(37,85,160,0.35)', marginBottom: '12px' }}>
            {loading ? 'جاري الدخول...' : 'دخول إلى النظام'}
          </button>

        </form>
        <p style={{ marginTop: '32px', color: '#cbd5e1', fontSize: '11px', textAlign: 'center' }}>
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
        {/* Logo */}
        <div style={{
          width: '160px', height: '160px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <img
            src="/logo.png"
            alt="شعار المدرسة"
            style={{ width: '130px', height: '130px', objectFit: 'contain' }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
              e.currentTarget.parentElement!.appendChild(
                Object.assign(document.createElement('div'), {
                  innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
                })
              );
            }}
          />
        </div>

        <h1 style={{
          color: 'white', fontSize: '26px', fontWeight: '900',
          textAlign: 'center', marginBottom: '10px', lineHeight: '1.4',
        }}>
          مدرسة الرواد الثانوية الفنية
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', lineHeight: '1.7', maxWidth: '300px' }}>
          بوابة الكادر التعليمي والإداري
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: '13px',
          textAlign: 'center', marginTop: '10px', fontWeight: '500',
        }}>
          المطور: Mr.Hamdy Mohamed
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: '12px',
          textAlign: 'center', marginTop: '4px',
        }}>
          (حمدي الهاشمي)
        </p>

        {/* Role cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '36px', width: '100%', maxWidth: '300px' }}>
          {[
            { icon: <ShieldCheck size={20} color="#f39c12" />, title: 'مدير النظام', desc: 'صلاحيات كاملة على جميع البيانات', bg: 'rgba(243,156,18,0.1)', border: 'rgba(243,156,18,0.2)' },
            { icon: <Users size={20} color="#74b9ff" />, title: 'المدرس', desc: 'إنشاء الامتحانات وإدخال الدرجات', bg: 'rgba(116,185,255,0.1)', border: 'rgba(116,185,255,0.2)' },
          ].map((item, i) => (
            <div key={i} style={{
              background: item.bg, border: `1px solid ${item.border}`,
              borderRadius: '14px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <p style={{ color: 'white', fontSize: '13px', fontWeight: '700', margin: 0 }}>{item.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0, marginTop: '2px' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Link to student login */}
        <div style={{ marginTop: '36px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' }}>هل أنت طالب؟</p>
          <Link
            to="/login/student"
            style={{
              color: '#74b9ff', fontSize: '13px', fontWeight: '600',
              textDecoration: 'none', borderBottom: '1px solid rgba(116,185,255,0.4)',
              paddingBottom: '2px',
            }}
          >
            انتقل إلى بوابة الطلاب ←
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginTeacher;
