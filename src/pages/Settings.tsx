// src/pages/Settings.tsx
// صفحة الإعدادات — إدارة حسابات المدرسين مع Firebase Auth

import { useState, useEffect } from 'react';
import {
  Settings2, UserPlus, Pencil, Trash2, X, Check,
  AlertCircle, Shield, Eye, EyeOff, BookOpen, School,
  ToggleLeft, ToggleRight, KeyRound, Search, RefreshCw,
  UserCog, Lock, Unlock, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  updatePassword,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getAllTeachers, addTeacher, updateTeacher, deleteTeacher, defaultPermissions,
} from '../services/teacherService';
import { getAllSubjects } from '../services/materialService';
import { classesData } from '../data/students';
import type { Teacher, TeacherPermissions, Subject } from '../types';

// ─── Styles ──────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: { padding: '24px', fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' },
  card: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: '10px', fontSize: '13px', fontFamily: 'Cairo, sans-serif',
    color: '#1a202c', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const,
  },
};

const btn = (bg: string, color = 'white', extra?: React.CSSProperties): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
  background: bg, color, border: 'none', borderRadius: '10px',
  fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
  cursor: 'pointer', ...extra,
});

const permLabels: Record<keyof TeacherPermissions, string> = {
  canCreateExams:     'إنشاء امتحانات',
  canEditOwnExam:     'تعديل امتحاناته',
  canDeleteExam:      'حذف الامتحانات',
  canViewResults:     'مشاهدة النتائج',
  canDownloadExcel:   'تحميل Excel للنتائج',
  canEditGrades:      'تعديل الدرجات',
  canCreateQuestions: 'إنشاء بنك أسئلة',
  canUploadWord:      'رفع ملفات Word',
  canLockExams:       'قفل/فتح الامتحانات',
  canReopenStudent:   'إعادة فتح للطالب',
  canViewAllStudents: 'عرض جميع الفصول',
  canViewStudentId:   'رؤية الرقم القومي',
  canManageStudents:  'إدارة الطلاب',
};

// ─── Add/Edit Teacher Modal ───────────────────
interface ModalProps {
  teacher?: Teacher | null;
  subjects: Subject[];
  onSave: (data: {
    name: string; email: string; password?: string;
    subjects: string[]; classes: string[];
    permissions: TeacherPermissions;
  }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const TeacherModal = ({ teacher, subjects, onSave, onClose, saving }: ModalProps) => {
  const isEdit = !!teacher;
  const [name, setName] = useState(teacher?.name || '');
  const [email, setEmail] = useState(teacher?.email || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [selSubjects, setSelSubjects] = useState<string[]>(teacher?.subjects || []);
  const [selClasses, setSelClasses] = useState<string[]>(teacher?.classes || []);
  const [perms, setPerms] = useState<TeacherPermissions>(teacher?.permissions || { ...defaultPermissions });
  const [error, setError] = useState('');
  const [showClasses, setShowClasses] = useState(false);

  const toggleSubject = (id: string) =>
    setSelSubjects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleClass = (id: string) =>
    setSelClasses(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const togglePerm = (k: keyof TeacherPermissions) =>
    setPerms(p => ({ ...p, [k]: !p[k] }));

  const handleSubmit = async () => {
    if (!name.trim()) { setError('اسم المدرس مطلوب'); return; }
    if (!email.trim() || !email.includes('@')) { setError('يرجى إدخال بريد إلكتروني صحيح'); return; }
    if (!isEdit && password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setError('');
    await onSave({ name: name.trim(), email: email.trim(), password: password || undefined, subjects: selSubjects, classes: selClasses, permissions: perms });
  };

  // Group classes by gender
  const boysClasses = classesData.filter(c => c.gender === 'بنين');
  const girlsClasses = classesData.filter(c => c.gender === 'فتيات');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '620px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#1a3a6b,#2555a0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCog size={20} color="white" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>
              {isEdit ? 'تعديل بيانات المدرس' : 'إضافة مدرس جديد'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        {/* Basic Info */}
        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>البيانات الأساسية</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={S.label}>اسم المدرس *</label>
              <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="أ. محمد عبد الله" />
            </div>
            <div>
              <label style={S.label}>البريد الإلكتروني *</label>
              <input style={{ ...S.input, direction: 'ltr' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@rowad.edu.eg" disabled={isEdit} />
              {isEdit && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>لا يمكن تغيير البريد الإلكتروني</p>}
            </div>
          </div>

          {/* Password */}
          <div style={{ marginTop: '14px' }}>
            <label style={S.label}>
              {isEdit ? 'كلمة مرور جديدة (اتركها فارغة إذا لم تريد التغيير)' : 'كلمة المرور *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                style={{ ...S.input, paddingLeft: '40px', direction: 'ltr' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? '••••••••' : 'كلمة مرور قوية...'}
              />
              <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {!isEdit && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>⚠️ سيتم إنشاء حساب Firebase Auth تلقائياً بهذا البريد وكلمة المرور</p>}
          </div>
        </div>

        {/* Subjects */}
        <div style={{ background: '#f0f9ff', borderRadius: '14px', padding: '18px', marginBottom: '16px', border: '1px solid #bae6fd' }}>
          <p style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={13} /> المواد الدراسية
          </p>
          {subjects.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>لا توجد مواد — أضف مواد من صفحة المواد الدراسية أولاً</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    fontFamily: 'Cairo, sans-serif', cursor: 'pointer', border: '1.5px solid',
                    background: selSubjects.includes(s.id) ? '#0369a1' : 'white',
                    color: selSubjects.includes(s.id) ? 'white' : '#0369a1',
                    borderColor: '#0369a1',
                  }}
                >
                  {selSubjects.includes(s.id) && <Check size={11} style={{ marginLeft: '4px' }} />}
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Classes */}
        <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '18px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
          <button
            onClick={() => setShowClasses(!showClasses)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Cairo, sans-serif' }}
          >
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <School size={13} /> الفصول المسموح بها
              {selClasses.length > 0 && (
                <span style={{ background: '#15803d', color: 'white', borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>{selClasses.length}</span>
              )}
            </p>
            {showClasses ? <ChevronUp size={15} color="#15803d" /> : <ChevronDown size={15} color="#15803d" />}
          </button>

          {showClasses && (
            <div style={{ marginTop: '14px' }}>
              {/* Boys */}
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', marginBottom: '8px' }}>🧑 فصول البنين</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {boysClasses.map(c => (
                  <button key={c.id} onClick={() => toggleClass(c.id)} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                    fontFamily: 'Cairo, sans-serif', cursor: 'pointer', border: '1.5px solid',
                    background: selClasses.includes(c.id) ? '#1d4ed8' : 'white',
                    color: selClasses.includes(c.id) ? 'white' : '#1d4ed8', borderColor: '#1d4ed8',
                  }}>{c.name}</button>
                ))}
              </div>
              {/* Girls */}
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#be185d', marginBottom: '8px' }}>👩 فصول البنات</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {girlsClasses.map(c => (
                  <button key={c.id} onClick={() => toggleClass(c.id)} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                    fontFamily: 'Cairo, sans-serif', cursor: 'pointer', border: '1.5px solid',
                    background: selClasses.includes(c.id) ? '#be185d' : 'white',
                    color: selClasses.includes(c.id) ? 'white' : '#be185d', borderColor: '#be185d',
                  }}>{c.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Permissions */}
        <div style={{ background: '#f5f3ff', borderRadius: '14px', padding: '18px', marginBottom: '24px', border: '1px solid #e9d5ff' }}>
          <p style={{ fontSize: '12px', fontWeight: '800', color: '#5b21b6', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={13} /> الصلاحيات
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(Object.keys(permLabels) as (keyof TeacherPermissions)[]).map(k => (
              <button
                key={k}
                onClick={() => togglePerm(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif', textAlign: 'right',
                  background: perms[k] ? '#5b21b6' : 'white',
                  borderColor: perms[k] ? '#5b21b6' : '#e2e8f0',
                  color: perms[k] ? 'white' : '#374151',
                }}
              >
                {perms[k]
                  ? <ToggleRight size={18} color="white" />
                  : <ToggleLeft size={18} color="#94a3b8" />}
                <span style={{ fontSize: '12px', fontWeight: '700' }}>{permLabels[k]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn('#f1f5f9', '#64748b')}>إلغاء</button>
          <button onClick={handleSubmit} disabled={saving} style={btn(saving ? '#94a3b8' : '#2555a0')}>
            {saving ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> جاري الحفظ...</> : <><Check size={14} /> {isEdit ? 'حفظ التعديلات' : 'إضافة المدرس'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reset Password Modal ─────────────────────
const ResetPassModal = ({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) => {
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleReset = async () => {
    if (pass.length < 6) { setMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setStatus('loading');
    try {
      // Note: resetting password for another user requires admin SDK
      // This stores the new password request in Firestore for manual processing
      await setDoc(doc(db, 'passwordResets', teacher.id), {
        teacherId: teacher.id,
        teacherEmail: teacher.email,
        newPassword: pass,
        requestedAt: serverTimestamp(),
        status: 'pending',
      });
      setStatus('done');
      setMsg('تم حفظ طلب تغيير كلمة المرور بنجاح');
    } catch {
      setStatus('error');
      setMsg('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f2244', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={16} color="#f59e0b" /> إعادة تعيين كلمة المرور
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          المدرس: <strong style={{ color: '#0f2244' }}>{teacher.name}</strong>
        </p>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '56px', height: '56px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Check size={24} color="#15803d" />
            </div>
            <p style={{ color: '#15803d', fontWeight: '700', fontSize: '14px' }}>{msg}</p>
            <button onClick={onClose} style={{ ...btn('#2555a0'), marginTop: '16px' }}>إغلاق</button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <label style={S.label}>كلمة المرور الجديدة</label>
              <input
                type={showPass ? 'text' : 'password'}
                style={{ ...S.input, paddingLeft: '40px', direction: 'ltr' }}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="كلمة مرور جديدة..."
              />
              <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', left: '12px', top: '60%', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {msg && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={btn('#f1f5f9', '#64748b')}>إلغاء</button>
              <button onClick={handleReset} disabled={status === 'loading'} style={btn('#f59e0b')}>
                {status === 'loading' ? 'جاري الحفظ...' : 'تأكيد'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Settings Page ───────────────────────
const SettingsPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetTeacher, setResetTeacher] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([getAllTeachers(), getAllSubjects()]).then(([t, s]) => {
      setTeachers(t);
      setSubjects(s);
      setLoading(false);
    });
  }, []);

  const filtered = teachers.filter(t =>
    t.name.includes(search) || t.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Save (Add or Edit) ──
  const handleSave = async (data: {
    name: string; email: string; password?: string;
    subjects: string[]; classes: string[]; permissions: TeacherPermissions;
  }) => {
    setSaving(true);
    try {
      if (editTeacher) {
        // Edit existing
        const updated = await updateTeacher(editTeacher.id, {
          name: data.name, subjects: data.subjects,
          classes: data.classes, permissions: data.permissions,
        });
        setTeachers(p => p.map(t => t.id === editTeacher.id ? updated : t));
        showToast('تم تعديل بيانات المدرس بنجاح ✓');
      } else {
        // Add new — create Firebase Auth account first
        const firebaseAuth = getAuth();
        let uid = '';
        try {
          const cred = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password!);
          uid = cred.user.uid;
        } catch (authErr: unknown) {
          const err = authErr as { code?: string };
          if (err.code === 'auth/email-already-in-use') {
            showToast('هذا البريد الإلكتروني مستخدم مسبقاً', 'error');
            setSaving(false);
            return;
          }
          throw authErr;
        }

        // Save teacher to Firestore — use uid as document ID
        // عشان fetchUserProfile يلاقي teachers/{uid} صح
        const teacher = await addTeacher({
          name: data.name, email: data.email,
          subjects: data.subjects, classes: data.classes,
          permissions: data.permissions,
        }, uid);

        // Also save user profile in 'users' collection
        await setDoc(doc(db, 'users', uid), {
          uid, email: data.email, displayName: data.name,
          role: 'teacher', isActive: true, createdAt: serverTimestamp(),
        });

        setTeachers(p => [...p, { ...teacher, id: uid, uid }]);
        showToast(`تم إضافة المدرس ${data.name} وإنشاء حسابه بنجاح ✓`);
      }
      setShowModal(false);
      setEditTeacher(null);
    } catch {
      showToast('حدث خطأ أثناء الحفظ، حاول مرة أخرى', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Active ──
  const handleToggleActive = async (teacher: Teacher) => {
    const updated = await updateTeacher(teacher.id, { isActive: !teacher.isActive });
    setTeachers(p => p.map(t => t.id === teacher.id ? updated : t));
    showToast(updated.isActive ? 'تم تفعيل الحساب ✓' : 'تم تعطيل الحساب');
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    await deleteTeacher(id);
    setTeachers(p => p.filter(t => t.id !== id));
    setDeleteId(null);
    showToast('تم حذف المدرس بنجاح ✓');
  };

  const getSubjectNames = (ids: string[]) =>
    ids.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join('، ');

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#0f2244' : '#dc2626',
          color: 'white', padding: '12px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '700', zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'fadeIn 0.3s ease',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#1a3a6b,#2555a0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings2 size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244' }}>الإعدادات</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', marginRight: '56px' }}>
            إدارة حسابات المدرسين وصلاحياتهم
          </p>
        </div>
        <button
          onClick={() => { setEditTeacher(null); setShowModal(true); }}
          style={btn('linear-gradient(135deg,#1a3a6b,#2555a0)')}
        >
          <UserPlus size={16} /> إضافة مدرس جديد
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'إجمالي المدرسين', value: teachers.length, color: '#2555a0', bg: '#eff6ff' },
          { label: 'حسابات نشطة', value: teachers.filter(t => t.isActive).length, color: '#15803d', bg: '#f0fdf4' },
          { label: 'حسابات معطلة', value: teachers.filter(t => !t.isActive).length, color: '#dc2626', bg: '#fef2f2' },
        ].map((stat, i) => (
          <div key={i} style={{ ...S.card, padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '20px', fontWeight: '900', color: stat.color }}>{stat.value}</span>
            </div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ ...S.card, padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={{ ...S.input, paddingRight: '36px' }}
            placeholder="بحث باسم المدرس أو البريد الإلكتروني..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Teachers List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#2555a0', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p>جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <UserCog size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
            {search ? 'لا توجد نتائج للبحث' : 'لا يوجد مدرسون بعد'}
          </p>
          {!search && <p style={{ fontSize: '13px' }}>اضغط "إضافة مدرس جديد" لإضافة أول مدرس</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map(teacher => (
            <div key={teacher.id} style={{ ...S.card, padding: '20px', opacity: teacher.isActive ? 1 : 0.7 }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                    background: teacher.isActive
                      ? 'linear-gradient(135deg,#1a3a6b,#2555a0)'
                      : 'linear-gradient(135deg,#94a3b8,#64748b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: '900', color: 'white',
                  }}>
                    {teacher.name.charAt(2) || 'م'}
                  </div>
                  <div>
                    <p style={{ fontWeight: '800', color: '#0f2244', fontSize: '15px', marginBottom: '2px' }}>{teacher.name}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', direction: 'ltr' }}>{teacher.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                    background: teacher.isActive ? '#f0fdf4' : '#fef2f2',
                    color: teacher.isActive ? '#15803d' : '#dc2626',
                    border: `1px solid ${teacher.isActive ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    {teacher.isActive ? 'نشط' : 'معطل'}
                  </span>
                </div>
              </div>

              {/* Subjects */}
              {teacher.subjects.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={11} /> المواد
                  </p>
                  <p style={{ fontSize: '12px', color: '#0369a1', fontWeight: '700' }}>
                    {getSubjectNames(teacher.subjects) || '—'}
                  </p>
                </div>
              )}

              {/* Active Permissions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                {(Object.keys(teacher.permissions) as (keyof TeacherPermissions)[])
                  .filter(k => teacher.permissions[k])
                  .map(k => (
                    <span key={k} style={{ fontSize: '10px', background: '#f5f3ff', color: '#5b21b6', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', border: '1px solid #e9d5ff' }}>
                      {permLabels[k]}
                    </span>
                  ))}
                {Object.values(teacher.permissions).every(v => !v) && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>لا توجد صلاحيات</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setEditTeacher(teacher); setShowModal(true); }}
                  style={{ ...btn('#fef9f0', '#d97706'), padding: '7px 12px', flex: 1, justifyContent: 'center' }}
                >
                  <Pencil size={13} /> تعديل
                </button>
                <button
                  onClick={() => handleToggleActive(teacher)}
                  style={{ ...btn(teacher.isActive ? '#fef2f2' : '#f0fdf4', teacher.isActive ? '#dc2626' : '#15803d'), padding: '7px 12px' }}
                  title={teacher.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                >
                  {teacher.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                <button
                  onClick={() => setResetTeacher(teacher)}
                  style={{ ...btn('#fffbeb', '#f59e0b'), padding: '7px 12px' }}
                  title="إعادة تعيين كلمة المرور"
                >
                  <KeyRound size={13} />
                </button>
                <button
                  onClick={() => setDeleteId(teacher.id)}
                  style={{ ...btn('#fef2f2', '#dc2626'), padding: '7px 12px' }}
                  title="حذف المدرس"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <TeacherModal
          teacher={editTeacher}
          subjects={subjects}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTeacher(null); }}
          saving={saving}
        />
      )}

      {/* Reset Password Modal */}
      {resetTeacher && (
        <ResetPassModal teacher={resetTeacher} onClose={() => setResetTeacher(null)} />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '60px', height: '60px', background: '#fef2f2', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244', marginBottom: '10px' }}>تأكيد الحذف</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: '1.7' }}>
              سيتم حذف المدرس وجميع بياناته من النظام.<br />
              <strong style={{ color: '#dc2626' }}>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={btn('#f1f5f9', '#64748b')}>إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} style={btn('#dc2626')}>
                <Trash2 size={14} /> نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
