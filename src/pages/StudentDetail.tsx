// src/pages/StudentDetail.tsx
// صفحة بيانات الطالب الفردي — عرض وتعديل

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, User, Edit2, Save, X,
  Phone, Mail, BookOpen, Hash, IdCard, Calendar,
  GraduationCap, FileText, Award, Trash2, AlertCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { Student } from '../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 14px 9px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'Cairo, sans-serif',
  color: '#111827',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  direction: 'rtl',
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  editing?: boolean;
  field?: string;
  onChange?: (v: string) => void;
  type?: string;
}

function InfoRow({ icon, label, value, editing, onChange, type = 'text' }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px', fontWeight: 600 }}>{label}</p>
        {editing && onChange ? (
          <input
            type={type}
            defaultValue={value}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }}
          />
        ) : (
          <p style={{ fontSize: 14, color: value ? '#111827' : '#d1d5db', margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || '—'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [student, setStudent] = useState<Student & { birthDate?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student & { birthDate?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'students', id)).then(snap => {
      if (snap.exists()) {
        setStudent({ id: snap.id, ...snap.data() } as Student & { birthDate?: string });
      }
      setLoading(false);
    });
  }, [id]);

  const startEdit = () => {
    setEditData({ ...student });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!id || !student) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { ...editData, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'students', id), updates);
      setStudent(prev => prev ? { ...prev, ...editData } : prev);
      setEditing(false);
    } catch {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'students', id));
      navigate('/students');
    } catch {
      alert('حدث خطأ أثناء الحذف');
      setDeleting(false);
    }
  };

  const set = (field: string) => (value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2555a0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: '#9ca3af' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle size={48} color="#d1d5db" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>الطالب غير موجود</h2>
          <button onClick={() => navigate('/students')} style={{ padding: '10px 24px', background: '#2555a0', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            العودة لقائمة الطلاب
          </button>
        </div>
      </div>
    );
  }

  const cur = editing ? { ...student, ...editData } : student;
  const initials = student.name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '؟';

  return (
    <div style={{ padding: '24px', maxWidth: 640, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowRight size={18} color="#374151" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f2244', margin: 0 }}>بيانات الطالب</h1>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          {userRole === 'admin' && !editing && (
            <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#eff6ff', color: '#2555a0', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              <Edit2 size={14} /> تعديل
            </button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a6b, #2555a0)', borderRadius: 18, padding: '28px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.3)' }}>
          {student.photoURL ? (
            <img src={student.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {student.className && (
              <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
                {student.className}
              </span>
            )}
            {student.number && (
              <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
                #{student.number}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', padding: '8px 20px', marginBottom: 16 }}>
        <InfoRow icon={<User size={15} color="#6b7280" />} label="الاسم الكامل" value={cur.name} editing={editing} onChange={set('name')} />
        <InfoRow icon={<Hash size={15} color="#6b7280" />} label="رقم الطالب" value={cur.number} editing={editing} onChange={set('number')} />
        <InfoRow icon={<IdCard size={15} color="#6b7280" />} label="الرقم القومي" value={cur.nationalId} editing={editing} onChange={set('nationalId')} />
        <InfoRow icon={<Calendar size={15} color="#6b7280" />} label="تاريخ الميلاد" value={cur.birthDate} editing={editing} onChange={set('birthDate')} type="date" />
        <InfoRow icon={<BookOpen size={15} color="#6b7280" />} label="الفصل" value={cur.className} editing={editing} onChange={set('className')} />
        <InfoRow icon={<GraduationCap size={15} color="#6b7280" />} label="رمز الفصل" value={cur.classId} editing={editing} onChange={set('classId')} />
        <InfoRow icon={<Phone size={15} color="#6b7280" />} label="رقم الهاتف" value={cur.phone} editing={editing} onChange={set('phone')} />
        <div style={{ borderBottom: 'none' }}>
          <InfoRow icon={<Mail size={15} color="#6b7280" />} label="البريد الإلكتروني" value={cur.email} editing={editing} onChange={set('email')} type="email" />
        </div>
      </div>

      {/* Quick Nav */}
      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: <FileText size={16} color="#2555a0" />, label: 'الدرجات', path: `/grades` },
            { icon: <Award size={16} color="#059669" />, label: 'الامتحانات', path: `/exams` },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              {item.icon}
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Edit Actions */}
      {editing && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={cancelEdit} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', fontSize: 14, fontWeight: 700, color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, background: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <X size={15} /> إلغاء
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', borderRadius: 12, background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1a3a6b, #2555a0)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            {saving ? 'جاري الحفظ...' : <><Save size={15} /> حفظ التعديلات</>}
          </button>
        </div>
      )}

      {/* Danger Zone */}
      {userRole === 'admin' && !editing && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #fee2e2', padding: '16px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', margin: '0 0 10px' }}>منطقة الخطر</p>
          <button onClick={() => setShowDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
            <Trash2 size={14} /> حذف الطالب
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 360, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>حذف الطالب</h3>
            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>هل أنت متأكد من حذف <strong>{student.name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#374151', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 10, cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>
                {deleting ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
