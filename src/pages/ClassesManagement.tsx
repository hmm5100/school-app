// src/pages/ClassesManagement.tsx

import { useState } from 'react';
import {
  GraduationCap, Users, BookOpen, Search, Plus, Edit2, Trash2,
  ChevronDown, ChevronUp, User, X, Save, AlertCircle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClassItem {
  id: string;
  name: string;
  grade: string;
  gender: 'boys' | 'girls';
  studentCount: number;
  teacherName: string;
  subject: string;
  color: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_CLASSES: ClassItem[] = [
  { id: '1', name: 'أولى / 1 بنين',  grade: 'الأول',  gender: 'boys',  studentCount: 35, teacherName: 'أ. محمد عبد الله', subject: 'علم التشريح',            color: '#2555a0' },
  { id: '2', name: 'أولى / 1 بنات',  grade: 'الأول',  gender: 'girls', studentCount: 34, teacherName: 'أ. سارة أحمد',     subject: 'التمريض الأساسي',        color: '#9b59b6' },
  { id: '3', name: 'أولى / 2 بنين',  grade: 'الأول',  gender: 'boys',  studentCount: 35, teacherName: 'أ. خالد إبراهيم',  subject: 'علم وظائف الأعضاء',      color: '#2555a0' },
  { id: '4', name: 'أولى / 2 بنات',  grade: 'الأول',  gender: 'girls', studentCount: 34, teacherName: 'أ. منى حسن',       subject: 'الكيمياء',               color: '#9b59b6' },
  { id: '5', name: 'ثانية / 1 بنين', grade: 'الثاني', gender: 'boys',  studentCount: 37, teacherName: 'أ. أحمد رضا',      subject: 'الأحياء',                color: '#27ae60' },
  { id: '6', name: 'ثانية / 1 بنات', grade: 'الثاني', gender: 'girls', studentCount: 34, teacherName: 'أ. نور محمود',     subject: 'الصحة العامة والتمريض', color: '#e67e22' },
  { id: '7', name: 'ثانية / 2 بنين', grade: 'الثاني', gender: 'boys',  studentCount: 36, teacherName: 'أ. هاني سامي',     subject: 'الفيزياء',               color: '#27ae60' },
  { id: '8', name: 'ثانية / 2 بنات', grade: 'الثاني', gender: 'girls', studentCount: 34, teacherName: 'أ. دينا فؤاد',     subject: 'الرياضيات',              color: '#e67e22' },
];

const GRADES = ['الكل', 'الأول', 'الثاني', 'الثالث'];
const GENDERS = ['الكل', 'بنين', 'بنات'];

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ClassModalProps {
  cls?: ClassItem | null;
  onClose: () => void;
  onSave: (data: Partial<ClassItem>) => void;
}

const ClassModal = ({ cls, onClose, onSave }: ClassModalProps) => {
  const [form, setForm] = useState({
    name:        cls?.name        ?? '',
    grade:       cls?.grade       ?? 'الأول',
    gender:      cls?.gender      ?? 'boys',
    teacherName: cls?.teacherName ?? '',
    subject:     cls?.subject     ?? '',
  });
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!form.name.trim())        { setError('أدخل اسم الفصل');  return; }
    if (!form.teacherName.trim()) { setError('أدخل اسم المدرس'); return; }
    if (!form.subject.trim())     { setError('أدخل المادة');     return; }
    onSave(form);
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box', color: '#1a202c' }}
        onFocus={e => e.target.style.borderColor = '#2555a0'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244' }}>{cls ? 'تعديل الفصل' : 'إضافة فصل جديد'}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}><X size={18} color="#64748b" /></button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        {field('اسم الفصل', 'name')}
        {field('المدرس المسؤول', 'teacherName')}
        {field('المادة الدراسية', 'subject')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>الصف الدراسي</label>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', outline: 'none', background: 'white', color: '#1a202c' }}>
              {['الأول', 'الثاني', 'الثالث'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>النوع</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'boys' | 'girls' }))}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', outline: 'none', background: 'white', color: '#1a202c' }}>
              <option value="boys">بنين</option>
              <option value="girls">بنات</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button onClick={handleSave} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1a3a6b, #2555a0)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={16} /> حفظ
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ClassesManagement = () => {
  const [classes, setClasses]         = useState<ClassItem[]>(MOCK_CLASSES);
  const [search, setSearch]           = useState('');
  const [gradeFilter, setGradeFilter] = useState('الكل');
  const [genderFilter, setGenderFilter] = useState('الكل');
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [modal, setModal]             = useState<{ open: boolean; cls?: ClassItem | null }>({ open: false });
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  const filtered = classes.filter(c => {
    const matchSearch = c.name.includes(search) || c.teacherName.includes(search) || c.subject.includes(search);
    const matchGrade  = gradeFilter  === 'الكل' || c.grade === gradeFilter;
    const matchGender = genderFilter === 'الكل' || (genderFilter === 'بنين' ? c.gender === 'boys' : c.gender === 'girls');
    return matchSearch && matchGrade && matchGender;
  });

  const handleSave = (data: Partial<ClassItem>) => {
    if (modal.cls) {
      setClasses(cs => cs.map(c => c.id === modal.cls!.id ? { ...c, ...data } : c));
    } else {
      const newCls: ClassItem = {
        id: Date.now().toString(),
        studentCount: 0,
        color: data.gender === 'girls' ? '#9b59b6' : '#2555a0',
        ...data,
      } as ClassItem;
      setClasses(cs => [...cs, newCls]);
    }
    setModal({ open: false });
  };

  const handleDelete = (id: string) => {
    setClasses(cs => cs.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);
  const boysCount     = classes.filter(c => c.gender === 'boys').reduce((s, c) => s + c.studentCount, 0);
  const girlsCount    = classes.filter(c => c.gender === 'girls').reduce((s, c) => s + c.studentCount, 0);

  return (
    <div style={{ fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'rtl', padding: '24px', minHeight: '100vh', background: '#f0f4f8' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', margin: 0 }}>🏫 الفصول الدراسية</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>إدارة الفصول وربط الطلاب والمدرسين</p>
        </div>
        <button
          onClick={() => setModal({ open: true, cls: null })}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'linear-gradient(135deg, #1a3a6b, #2555a0)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,85,160,0.35)' }}>
          <Plus size={18} /> إضافة فصل جديد
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'إجمالي الفصول',  value: classes.length,  icon: <GraduationCap size={22} color="#2555a0" />, bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'إجمالي الطلاب',  value: totalStudents,   icon: <Users          size={22} color="#059669" />, bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'فصول البنين',    value: classes.filter(c => c.gender === 'boys').length,  icon: <User size={22} color="#2555a0" />, bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'فصول البنات',    value: classes.filter(c => c.gender === 'girls').length, icon: <User size={22} color="#9b59b6" />, bg: '#faf5ff', border: '#e9d5ff' },
          { label: 'طلاب البنين',    value: boysCount,  icon: <Users size={22} color="#2555a0" />, bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'طالبات البنات',  value: girlsCount, icon: <Users size={22} color="#9b59b6" />, bg: '#faf5ff', border: '#e9d5ff' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: `1px solid ${s.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px', fontWeight: '600' }}>{s.label}</p>
                <p style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', margin: 0 }}>{s.value}</p>
              </div>
              <div style={{ background: s.bg, borderRadius: '10px', padding: '8px', display: 'flex' }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم الفصل أو المدرس..."
            style={{ width: '100%', padding: '10px 38px 10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box', color: '#1a202c' }}
            onFocus={e => e.target.style.borderColor = '#2555a0'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {GRADES.map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', background: gradeFilter === g ? '#2555a0' : '#f1f5f9', color: gradeFilter === g ? 'white' : '#64748b', transition: 'all 0.2s' }}>
              {g}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {GENDERS.map(g => (
            <button key={g} onClick={() => setGenderFilter(g)}
              style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', background: genderFilter === g ? (g === 'بنات' ? '#9b59b6' : '#2555a0') : '#f1f5f9', color: genderFilter === g ? 'white' : '#64748b', transition: 'all 0.2s' }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Classes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', color: '#94a3b8' }}>
            <GraduationCap size={48} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: '15px', fontWeight: '700' }}>لا توجد فصول مطابقة للبحث</p>
          </div>
        )}
        {filtered.map(cls => (
          <div key={cls.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8', transition: 'box-shadow 0.2s' }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === cls.id ? null : cls.id)}>
              {/* Color dot */}
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cls.gender === 'girls' ? 'linear-gradient(135deg,#9b59b6,#8e44ad)' : 'linear-gradient(135deg,#1a3a6b,#2555a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={20} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244' }}>{cls.name}</span>
                  <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: '700', background: cls.gender === 'girls' ? '#faf5ff' : '#eff6ff', color: cls.gender === 'girls' ? '#9b59b6' : '#2555a0', border: `1px solid ${cls.gender === 'girls' ? '#e9d5ff' : '#bfdbfe'}` }}>
                    {cls.gender === 'girls' ? 'بنات' : 'بنين'}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: '700', background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
                    الصف {cls.grade}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={13} />{cls.studentCount} طالب</span>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={13} />{cls.teacherName}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={13} />{cls.subject}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); setModal({ open: true, cls }); }}
                  style={{ background: '#eff6ff', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#2555a0' }}>
                  <Edit2 size={15} />
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteId(cls.id); }}
                  style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#ef4444' }}>
                  <Trash2 size={15} />
                </button>
                {expandedId === cls.id ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === cls.id && (
              <div style={{ borderTop: '1px solid #f0f4f8', padding: '16px 20px', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'اسم الفصل',     value: cls.name },
                    { label: 'الصف الدراسي',  value: `الصف ${cls.grade}` },
                    { label: 'النوع',          value: cls.gender === 'girls' ? 'بنات' : 'بنين' },
                    { label: 'عدد الطلاب',    value: `${cls.studentCount} طالب` },
                    { label: 'المدرس',         value: cls.teacherName },
                    { label: 'المادة',         value: cls.subject },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px', fontWeight: '600' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: '#1a202c', margin: 0, fontWeight: '700' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal.open && <ClassModal cls={modal.cls} onClose={() => setModal({ open: false })} onSave={handleSave} />}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '380px', maxWidth: '95vw', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', marginBottom: '8px' }}>حذف الفصل</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>هل أنت متأكد من حذف هذا الفصل؟ لا يمكن التراجع عن هذه العملية.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
                نعم، احذف
              </button>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesManagement;
