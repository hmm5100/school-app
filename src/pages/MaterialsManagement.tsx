// src/pages/MaterialsManagement.tsx

import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Pencil, Trash2, X,
  Check, AlertCircle, Search, School,
  UserCog, Upload, Download,
} from 'lucide-react';
import { classesData } from '../data/students';
import {
  getAllSubjects, addSubject, updateSubject, deleteSubject,
  assignTeacherToSubject, assignSubjectToClasses,
} from '../services/materialService';
import { getAllTeachers } from '../services/teacherService';
import {
  readMultipleExcelFiles, downloadGradesTemplate,
} from '../services/excelService';
import { useAuth } from '../context/AuthContext';
import type { Subject, Teacher } from '../types';

// ─── helpers ────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  card: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: '10px', fontSize: '13px', fontFamily: 'Cairo, sans-serif',
    color: '#1a202c', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const,
  },
  // btn moved to standalone function below
};

const btnStyle = (bg: string, color = 'white'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
    background: bg, color, border: 'none', borderRadius: '10px',
    fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  });

// ─── Subject Modal ───────────────────────────
interface SubjectModalProps {
  subject?: (Subject & { assignedClassIds?: string[] }) | null;
  teachers: Teacher[];
  onSave: (data: {
    name: string; code: string; grade: string;
    totalScore: number; teacherId: string; assignedClassIds: string[];
  }) => void;
  onClose: () => void;
  saving: boolean;
}

const SubjectModal = ({ subject, teachers, onSave, onClose, saving }: SubjectModalProps) => {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [grade, setGrade] = useState(subject?.grade || 'الأول');
  const [totalScore, setTotalScore] = useState(String(subject?.totalScore || 100));
  const [teacherId, setTeacherId] = useState(subject?.teacherId || '');
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>(
    (subject as Subject & { assignedClassIds?: string[] })?.assignedClassIds || [],
  );
  const [error, setError] = useState('');

  const toggleClass = (id: string) =>
    setAssignedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (!name.trim()) { setError('اسم المادة مطلوب'); return; }
    if (!code.trim()) { setError('كود المادة مطلوب'); return; }
    const score = parseInt(totalScore);
    if (isNaN(score) || score <= 0) { setError('الدرجة الكلية يجب أن تكون رقماً أكبر من صفر'); return; }
    setError('');
    onSave({ name: name.trim(), code: code.trim(), grade, totalScore: score, teacherId, assignedClassIds });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '580px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>
            {subject ? 'تعديل المادة' : 'إضافة مادة جديدة'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={S.label}>اسم المادة *</label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: علم التشريح" />
          </div>
          <div>
            <label style={S.label}>كود المادة *</label>
            <input style={{ ...S.input, direction: 'ltr' }} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ANAT101" />
          </div>
          <div>
            <label style={S.label}>الصف الدراسي</label>
            <select style={{ ...S.input, cursor: 'pointer' }} value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="الأول">الأول</option>
              <option value="الثاني">الثاني</option>
              <option value="الثالث">الثالث</option>
            </select>
          </div>
          <div>
            <label style={S.label}>الدرجة الكلية *</label>
            <input style={S.input} type="number" value={totalScore} onChange={e => setTotalScore(e.target.value)} min={1} max={200} />
          </div>
        </div>

        {/* Assign teacher */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <UserCog size={14} color="#7c3aed" /> ربط بمدرس
          </label>
          <select style={{ ...S.input, cursor: 'pointer' }} value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">— بدون مدرس محدد —</option>
            {teachers.filter(t => t.isActive).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Assign to classes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <School size={14} color="#059669" /> ربط بفصول (فارغ = جميع الفصول)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {classesData.map(c => {
              const active = assignedClassIds.includes(c.id);
              const isBoys = c.gender === 'بنين';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
                    borderColor: active ? (isBoys ? '#059669' : '#9333ea') : '#e2e8f0',
                    background: active ? (isBoys ? '#059669' : '#9333ea') : 'white',
                    color: active ? 'white' : '#64748b',
                    fontSize: '12px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {assignedClassIds.length === 0 && (
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              ✓ المادة ستظهر لجميع الفصول
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f1f5f9', '#64748b')}>إلغاء</button>
          <button onClick={handleSubmit} disabled={saving} style={btnStyle(saving ? '#94a3b8' : '#7c3aed')}>
            {saving ? 'جاري الحفظ...' : <><Check size={15} /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Grades Import Modal ─────────────────────
interface GradesImportModalProps {
  subjects: Subject[];
  onClose: () => void;
}

const GradesImportModal = ({ subjects, onClose }: GradesImportModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ student: string; subject: string; score: number; total: number }[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = { current: null as HTMLInputElement | null };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const arr = Array.from(selected).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    if (arr.length === 0) { setErrors(['يرجى اختيار ملفات Excel فقط']); return; }
    setFiles(arr);
    setParsing(true);
    const result = await readMultipleExcelFiles(arr);
    const grades = result.results.flatMap(r => r.grades);
    setPreview(grades.map(g => ({ student: g.studentName, subject: g.subjectName, score: g.score, total: g.totalScore })));
    setWarnings(result.results.flatMap(r => r.warnings));
    setErrors(result.results.flatMap(r => r.errors));
    setParsing(false);
  };

  // Suppress unused warning
  void subjects;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '580px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>رفع درجات من Excel</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{ border: '2px dashed #c4b5fd', borderRadius: '14px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: '#faf5ff', marginBottom: '16px' }}
        >
          <Upload size={36} color="#7c3aed" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: '700', color: '#5b21b6', marginBottom: '4px' }}>
            {files.length > 0 ? `${files.length} ملف محدد` : 'اسحب ملفات Excel أو انقر للاختيار'}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>يدعم رفع أكثر من ملف دفعة واحدة</p>
          <input
            ref={el => { fileRef.current = el; }}
            type="file" accept=".xlsx,.xls" multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        <button onClick={downloadGradesTemplate} style={{ ...btnStyle('#f5f3ff', '#5b21b6'), marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
          <Download size={15} /> تنزيل نموذج Excel للدرجات
        </button>

        {parsing && <p style={{ textAlign: 'center', color: '#7c3aed', fontSize: '13px' }}>جاري قراءة الملفات...</p>}

        {errors.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
            {errors.map((e, i) => <p key={i} style={{ fontSize: '12px', color: '#dc2626', margin: '2px 0' }}>❌ {e}</p>)}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
            {warnings.map((w, i) => <p key={i} style={{ fontSize: '12px', color: '#92400e', margin: '2px 0' }}>⚠️ {w}</p>)}
          </div>
        )}

        {preview.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f2244' }}>معاينة: {preview.length} درجة</span>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {preview.slice(0, 20).map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <span style={{ flex: 1, color: '#1a202c', fontWeight: '600' }}>{g.student}</span>
                  <span style={{ color: '#7c3aed' }}>{g.subject}</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>{g.score}/{g.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f1f5f9', '#64748b')}>إغلاق</button>
          {preview.length > 0 && (
            <button style={btnStyle('#7c3aed')}>
              <Check size={15} /> حفظ {preview.length} درجة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const MaterialsManagement = () => {
  const { isAdmin, isTeacher, userProfile } = useAuth();
  const [subjects, setSubjects] = useState<(Subject & { assignedClassIds?: string[] })[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editSubject, setEditSubject] = useState<(Subject & { assignedClassIds?: string[] }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([getAllSubjects(), getAllTeachers()]).then(([s, t]) => {
      setSubjects(s as (Subject & { assignedClassIds?: string[] })[]);
      setTeachers(t);
      setLoading(false);
    });
  }, []);

  // Teacher sees only their assigned subjects
  const visibleSubjects = isTeacher && !isAdmin
    ? subjects.filter(s => s.teacherId === userProfile?.uid)
    : subjects;

  const filtered = visibleSubjects.filter(s =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSave = async (data: {
    name: string; code: string; grade: string;
    totalScore: number; teacherId: string; assignedClassIds: string[];
  }) => {
    setSaving(true);
    try {
      if (editSubject) {
        const updated = await updateSubject(editSubject.id, data);
        if (data.teacherId !== editSubject.teacherId) {
          await assignTeacherToSubject(editSubject.id, data.teacherId);
        }
        if (JSON.stringify(data.assignedClassIds) !== JSON.stringify(editSubject.assignedClassIds || [])) {
          await assignSubjectToClasses(editSubject.id, data.assignedClassIds);
        }
        setSubjects(prev => prev.map(s => s.id === editSubject.id ? { ...updated, assignedClassIds: data.assignedClassIds } : s));
        showToast('تم تعديل المادة بنجاح');
      } else {
        const created = await addSubject(data);
        setSubjects(prev => [...prev, { ...created, assignedClassIds: data.assignedClassIds }]);
        showToast('تم إضافة المادة بنجاح');
      }
      setShowModal(false);
      setEditSubject(null);
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSubject(id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    showToast('تم حذف المادة');
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return '—';
    return teachers.find(t => t.id === teacherId)?.name || '—';
  };

  const getClassNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return 'جميع الفصول';
    return ids.map(id => classesData.find(c => c.id === id)?.name || id).join('، ');
  };

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: 'white', padding: '12px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '700', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>إدارة المواد الدراسية</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            إجمالي: <strong style={{ color: '#7c3aed' }}>{subjects.length}</strong> مادة
            {isTeacher && !isAdmin && <span style={{ color: '#94a3b8' }}> — تعرض موادك فقط ({filtered.length})</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowImportModal(true)} style={btnStyle('#f5f3ff', '#5b21b6')}>
            <Upload size={15} /> رفع درجات Excel
          </button>
          {isAdmin && (
            <button onClick={() => { setEditSubject(null); setShowModal(true); }} style={btnStyle('#7c3aed')}>
              <Plus size={15} /> إضافة مادة
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ ...S.card, marginBottom: '16px', padding: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={{ ...S.input, paddingRight: '36px' }}
            placeholder="بحث باسم المادة أو الكود..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Subjects grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontWeight: '700' }}>لا توجد مواد</p>
          {isAdmin && <p style={{ fontSize: '13px' }}>ابدأ بإضافة مادة جديدة</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map((subject) => {
            const assignedClasses = (subject as Subject & { assignedClassIds?: string[] }).assignedClassIds || [];
            return (
              <div key={subject.id} style={{ ...S.card, padding: '20px', position: 'relative' }}>
                {/* Color accent top bar */}
                <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '4px', background: 'linear-gradient(90deg, #7c3aed, #9333ea)', borderRadius: '16px 16px 0 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <BookOpen size={20} color="white" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '800', color: '#0f2244', fontSize: '15px', marginBottom: '2px' }}>{subject.name}</p>
                      <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', fontFamily: 'monospace' }}>
                        {subject.code}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', background: '#fffbeb', color: '#d97706', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', flexShrink: 0 }}>
                    {subject.totalScore} درجة
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCog size={12} /> المدرس
                    </span>
                    <span style={{ color: '#1a202c', fontWeight: '700' }}>{getTeacherName(subject.teacherId)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <School size={12} /> الفصول
                    </span>
                    <span style={{ color: assignedClasses.length === 0 ? '#059669' : '#0369a1', fontWeight: '700', textAlign: 'left', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getClassNames(assignedClasses)}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <button
                      onClick={() => { setEditSubject(subject); setShowModal(true); }}
                      style={{ ...btnStyle('#fef9f0', '#d97706'), padding: '7px 12px', flex: 1, justifyContent: 'center' }}
                    >
                      <Pencil size={14} /> تعديل
                    </button>
                    <button onClick={() => setDeleteId(subject.id)} style={{ ...btnStyle('#fef2f2', '#dc2626'), padding: '7px 12px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', background: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244', marginBottom: '8px' }}>تأكيد حذف المادة</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>حذف المادة سيؤثر على الامتحانات والدرجات المرتبطة بها. هل أنت متأكد؟</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={btnStyle('#f1f5f9', '#64748b')}>إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} style={btnStyle('#dc2626')}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <SubjectModal
          subject={editSubject}
          teachers={teachers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditSubject(null); }}
          saving={saving}
        />
      )}

      {showImportModal && (
        <GradesImportModal
          subjects={subjects}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};

export default MaterialsManagement;
