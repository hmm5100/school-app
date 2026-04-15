// src/pages/StudentNew.tsx
// صفحة إضافة طالب جديد

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, ArrowRight, Save, X,
  User, Hash, BookOpen, Phone, Mail, Calendar, IdCard
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface FormData {
  name: string;
  number: string;
  nationalId: string;
  classId: string;
  className: string;
  phone: string;
  email: string;
  birthDate: string;
}

const initialForm: FormData = {
  name: '',
  number: '',
  nationalId: '',
  classId: '',
  className: '',
  phone: '',
  email: '',
  birthDate: '',
};

const inputStyle = (error?: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px 10px 40px',
  border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'Cairo, sans-serif',
  color: '#111827',
  background: error ? '#fef2f2' : '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  direction: 'rtl',
  transition: 'border-color 0.2s',
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
};

export default function StudentNew() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.number.trim()) errs.number = 'رقم الطالب مطلوب';
    if (!form.classId.trim()) errs.classId = 'رمز الفصل مطلوب';
    if (!form.className.trim()) errs.className = 'اسم الفصل مطلوب';
    if (form.nationalId && form.nationalId.length !== 14)
      errs.nationalId = 'الرقم القومي يجب أن يكون 14 رقم';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'البريد الإلكتروني غير صحيح';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const docData: Record<string, unknown> = {
        name: form.name.trim(),
        normalizedName: form.name.trim().replace(/\s+/g, ' '),
        number: form.number.trim(),
        classId: form.classId.trim(),
        className: form.className.trim(),
        createdAt: serverTimestamp(),
        createdBy: userProfile?.uid || '',
      };
      if (form.nationalId) docData.nationalId = form.nationalId.trim();
      if (form.phone) docData.phone = form.phone.trim();
      if (form.email) docData.email = form.email.trim();
      if (form.birthDate) docData.birthDate = form.birthDate;

      const ref = await addDoc(collection(db, 'students'), docData);
      setSaved(true);
      setTimeout(() => navigate(`/students/${ref.id}`), 1200);
    } catch {
      alert('حدث خطأ أثناء الحفظ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 640, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}
        >
          <ArrowRight size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #1a3a6b, #2555a0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f2244', margin: 0 }}>إضافة طالب جديد</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>أدخل بيانات الطالب الجديد</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Section: البيانات الأساسية */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>البيانات الأساسية</p>
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>الاسم الكامل <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={form.name} onChange={set('name')} placeholder="الاسم رباعي" style={inputStyle(!!errors.name)} />
              </div>
              {errors.name && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.name}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Number */}
              <div>
                <label style={labelStyle}>رقم الطالب <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={form.number} onChange={set('number')} placeholder="مثال: 101" style={inputStyle(!!errors.number)} />
                </div>
                {errors.number && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.number}</p>}
              </div>

              {/* National ID */}
              <div>
                <label style={labelStyle}>الرقم القومي</label>
                <div style={{ position: 'relative' }}>
                  <IdCard size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={form.nationalId} onChange={set('nationalId')} placeholder="14 رقم" maxLength={14} style={inputStyle(!!errors.nationalId)} />
                </div>
                {errors.nationalId && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.nationalId}</p>}
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label style={labelStyle}>تاريخ الميلاد</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="date" value={form.birthDate} onChange={set('birthDate')} style={inputStyle()} />
              </div>
            </div>
          </div>
        </div>

        {/* Section: الفصل */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>بيانات الفصل</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>رمز الفصل <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <BookOpen size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={form.classId} onChange={set('classId')} placeholder="مثال: 1A" style={inputStyle(!!errors.classId)} />
              </div>
              {errors.classId && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.classId}</p>}
            </div>
            <div>
              <label style={labelStyle}>اسم الفصل <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <BookOpen size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={form.className} onChange={set('className')} placeholder="مثال: الصف الأول أ" style={inputStyle(!!errors.className)} />
              </div>
              {errors.className && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.className}</p>}
            </div>
          </div>
        </div>

        {/* Section: بيانات التواصل */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>بيانات التواصل (اختياري)</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={labelStyle}>رقم الهاتف</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={form.phone} onChange={set('phone')} placeholder="01xxxxxxxxx" style={inputStyle()} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={form.email} onChange={set('email')} placeholder="example@email.com" style={inputStyle(!!errors.email)} />
              </div>
              {errors.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.email}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, background: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <X size={16} /> إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', borderRadius: 12, background: saved ? '#059669' : saving ? '#93c5fd' : 'linear-gradient(135deg, #1a3a6b, #2555a0)', cursor: saving || saved ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', transition: 'all 0.2s' }}
        >
          {saved ? (
            <><span>✓</span> تم الحفظ بنجاح</>
          ) : saving ? (
            <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> جاري الحفظ...</>
          ) : (
            <><Save size={16} /> حفظ الطالب</>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
