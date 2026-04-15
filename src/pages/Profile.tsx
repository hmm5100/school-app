// src/pages/Profile.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, MapPin, Shield, BookOpen,
  Edit2, Save, X, Camera, Key, Clock, CheckCircle
} from 'lucide-react';

export default function Profile() {
  const { userProfile, userRole } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    displayName: userProfile?.displayName || 'Mr. Hamdy Mohamed',
    email: userProfile?.email || 'admin@school.edu.eg',
    phone: '0100 000 0000',
    address: 'قنا، مصر',
    bio: 'مدير نظام مدرسة الرواد الثانوية الفنية للتمريض',
  });

  const roleLabel = userRole === 'admin' ? 'مدير النظام' : userRole === 'teacher' ? 'مدرس' : 'طالب';
  const roleColor = userRole === 'admin' ? { bg: '#eff6ff', color: '#2555a0' } :
    userRole === 'teacher' ? { bg: '#f0fdf4', color: '#059669' } :
    { bg: '#faf5ff', color: '#7c3aed' };

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const stats = [
    { label: 'إجمالي الطلاب', value: '478', icon: <User size={18} />, color: '#2555a0', bg: '#eff6ff' },
    { label: 'الامتحانات النشطة', value: '3', icon: <BookOpen size={18} />, color: '#059669', bg: '#f0fdf4' },
    { label: 'الفصول الدراسية', value: '14', icon: <Shield size={18} />, color: '#d97706', bg: '#fffbeb' },
    { label: 'أيام العمل', value: '127', icon: <Clock size={18} />, color: '#7c3aed', bg: '#faf5ff' },
  ];

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: '900px' }}>

      {/* Toast */}
      {saved && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#059669', color: 'white', borderRadius: '12px',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '14px', fontWeight: '700', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          <CheckCircle size={18} /> تم حفظ التغييرات بنجاح
        </div>
      )}

      {/* Header Card */}
      <div style={{
        background: 'white', borderRadius: '20px', padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2555a0, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: '900', color: 'white',
            }}>
              {(form.displayName || 'م').charAt(0)}
            </div>
            <button style={{
              position: 'absolute', bottom: 0, left: 0,
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#2555a0', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}>
              <Camera size={13} />
            </button>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2244', margin: 0 }}>
                {form.displayName}
              </h1>
              <span style={{
                background: roleColor.bg, color: roleColor.color,
                borderRadius: '20px', padding: '3px 12px',
                fontSize: '12px', fontWeight: '700',
              }}>
                {roleLabel}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px' }}>{form.bio}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={13} /> {form.email}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {form.address}
              </span>
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => editMode ? handleSave() : setEditMode(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '12px', border: 'none',
              background: editMode ? '#059669' : '#2555a0', color: 'white',
              fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {editMode ? <><Save size={15} /> حفظ</> : <><Edit2 size={15} /> تعديل</>}
          </button>
          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0',
                background: 'white', color: '#64748b',
                fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <X size={15} /> إلغاء
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px', marginBottom: '20px',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '14px', padding: '18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#0f2244', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8',
        marginBottom: '20px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="#2555a0" /> البيانات الشخصية
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'الاسم الكامل', key: 'displayName', icon: <User size={14} /> },
            { label: 'البريد الإلكتروني', key: 'email', icon: <Mail size={14} /> },
            { label: 'رقم الهاتف', key: 'phone', icon: <Phone size={14} /> },
            { label: 'العنوان', key: 'address', icon: <MapPin size={14} /> },
          ].map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                {field.label}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  {field.icon}
                </span>
                <input
                  type="text"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  disabled={!editMode}
                  style={{
                    width: '100%', padding: '10px 36px 10px 12px',
                    border: `1.5px solid ${editMode ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '10px', fontSize: '13px',
                    fontFamily: 'Cairo, sans-serif', outline: 'none',
                    background: editMode ? 'white' : '#f8fafc',
                    color: '#1a202c', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              نبذة شخصية
            </label>
            <textarea
              value={form.bio}
              onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
              disabled={!editMode}
              rows={2}
              style={{
                width: '100%', padding: '10px 12px',
                border: `1.5px solid ${editMode ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '10px', fontSize: '13px',
                fontFamily: 'Cairo, sans-serif', outline: 'none',
                background: editMode ? 'white' : '#f8fafc',
                color: '#1a202c', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#d97706" /> الأمان وكلمة المرور
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {['كلمة المرور الحالية', 'كلمة المرور الجديدة', 'تأكيد كلمة المرور'].map((label, i) => (
            <div key={i} style={{ gridColumn: i === 2 ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                {label}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '13px', fontFamily: 'Cairo, sans-serif',
                  outline: 'none', background: '#f8fafc',
                  color: '#1a202c', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
        <button style={{
          marginTop: '16px', padding: '10px 24px', background: '#d97706',
          color: 'white', border: 'none', borderRadius: '10px',
          fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: '700',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Key size={15} /> تغيير كلمة المرور
        </button>
      </div>
    </div>
  );
}
