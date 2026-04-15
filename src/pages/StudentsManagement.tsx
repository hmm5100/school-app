// src/pages/StudentsManagement.tsx

import { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Plus, Pencil, Trash2, Upload,
  Download, X, Check, AlertCircle, FileSpreadsheet,
  ChevronDown, Filter, Eye,
} from 'lucide-react';
import { classesData } from '../data/students';
import {
  getAllStudents, addStudent, updateStudent, deleteStudent,
  bulkImportStudents, searchStudents,
} from '../services/studentService';
import {
  readMultipleExcelFiles, importedRowsToStudents,
  downloadStudentTemplate,
} from '../services/excelService';
import type { Student } from '../types';

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
    cursor: 'pointer', transition: 'opacity 0.15s',
  });

// ─── Modal ───────────────────────────────────
interface StudentModalProps {
  student?: Student | null;
  onSave: (data: Omit<Student, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  saving: boolean;
}

const StudentModal = ({ student, onSave, onClose, saving }: StudentModalProps) => {
  const [name, setName] = useState(student?.name || '');
  const [classId, setClassId] = useState(student?.classId || classesData[0]?.id || '');
  const [className, setClassName] = useState(student?.className || classesData[0]?.name || '');
  const [number, setNumber] = useState(String(student?.number || ''));
  const [nationalId, setNationalId] = useState(student?.nationalId || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [email, setEmail] = useState(student?.email || '');
  const [error, setError] = useState('');

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cls = classesData.find(c => c.id === e.target.value);
    if (cls) { setClassId(cls.id); setClassName(cls.name); }
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError('اسم الطالب مطلوب'); return; }
    if (!classId)     { setError('يرجى اختيار الفصل'); return; }
    if (!number || isNaN(Number(number))) { setError('رقم الكشف يجب أن يكون رقماً'); return; }
    setError('');
    onSave({ name: name.trim(), classId, className, number: Number(number), nationalId, phone, email });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>
            {student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={S.label}>اسم الطالب الكامل *</label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: احمد محمد عبد الله" />
          </div>

          <div>
            <label style={S.label}>الفصل *</label>
            <select style={{ ...S.input, cursor: 'pointer' }} value={classId} onChange={handleClassChange}>
              {classesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={S.label}>رقم الكشف *</label>
            <input style={S.input} type="number" value={number} onChange={e => setNumber(e.target.value)} placeholder="1" min={1} />
          </div>

          <div>
            <label style={S.label}>الرقم القومي</label>
            <input style={S.input} value={nationalId} onChange={e => setNationalId(e.target.value.replace(/\D/g, ''))} placeholder="14 رقم" maxLength={14} />
          </div>

          <div>
            <label style={S.label}>رقم الهاتف</label>
            <input style={S.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label style={S.label}>البريد الإلكتروني</label>
            <input style={{ ...S.input, direction: 'ltr' }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f1f5f9', '#64748b')}>إلغاء</button>
          <button onClick={handleSubmit} disabled={saving} style={btnStyle(saving ? '#94a3b8' : '#2555a0')}>
            {saving ? 'جاري الحفظ...' : <><Check size={15} /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Excel Import Modal ──────────────────────
interface ExcelImportModalProps {
  onImport: (students: Omit<Student, 'id'>[]) => void;
  onClose: () => void;
  importing: boolean;
}

const ExcelImportModal = ({ onImport, onClose, importing }: ExcelImportModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Omit<Student, 'id'>[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const arr = Array.from(selected).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    if (arr.length === 0) { setErrors(['يرجى اختيار ملفات Excel فقط (.xlsx أو .xls)']); return; }
    setFiles(arr);
    setParsing(true);
    setErrors([]);
    setWarnings([]);

    const result = await readMultipleExcelFiles(arr);
    const students = importedRowsToStudents(result.results.flatMap(r => r.students));
    const allWarnings = result.results.flatMap(r => r.warnings);
    const allErrors = result.results.flatMap(r => r.errors);

    setPreview(students);
    setWarnings(allWarnings);
    setErrors(allErrors);
    setParsing(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>استيراد من Excel</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{
            border: '2px dashed #bfdbfe', borderRadius: '14px', padding: '32px',
            textAlign: 'center', cursor: 'pointer', background: '#f0f9ff', marginBottom: '16px',
            transition: 'border-color 0.2s',
          }}
        >
          <FileSpreadsheet size={36} color="#2555a0" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: '700', color: '#1e40af', marginBottom: '4px' }}>
            {files.length > 0 ? `${files.length} ملف محدد` : 'اسحب ملفات Excel هنا أو انقر للاختيار'}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>يدعم .xlsx و .xls — يمكن رفع أكثر من ملف دفعة واحدة</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Template download */}
        <button onClick={downloadStudentTemplate} style={{ ...btnStyle('#f0fdf4', '#15803d'), marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
          <Download size={15} /> تنزيل نموذج Excel للاستيراد
        </button>

        {parsing && <p style={{ textAlign: 'center', color: '#2555a0', fontSize: '13px' }}>جاري قراءة الملفات...</p>}

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
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f2244' }}>معاينة: {preview.length} طالب</span>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {preview.slice(0, 20).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8', minWidth: '24px' }}>{s.number}</span>
                  <span style={{ flex: 1, color: '#1a202c', fontWeight: '600' }}>{s.name}</span>
                  <span style={{ color: '#2555a0' }}>{s.className}</span>
                </div>
              ))}
              {preview.length > 20 && <p style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#94a3b8' }}>... و {preview.length - 20} طالب آخر</p>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f1f5f9', '#64748b')}>إلغاء</button>
          <button
            onClick={() => preview.length > 0 && onImport(preview)}
            disabled={importing || preview.length === 0}
            style={btnStyle(importing || preview.length === 0 ? '#94a3b8' : '#2555a0')}
          >
            {importing ? 'جاري الاستيراد...' : <><Upload size={15} /> استيراد {preview.length} طالب</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const StudentsManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    getAllStudents().then(data => { setStudents(data); setLoading(false); });
  }, []);

  const filtered = searchStudents(
    filterClass === 'all' ? students : students.filter(s => s.classId === filterClass),
    searchQuery,
  );

  const handleSave = async (data: Omit<Student, 'id' | 'createdAt'>) => {
    setSaving(true);
    try {
      if (editStudent) {
        const updated = await updateStudent(editStudent.id, data);
        setStudents(prev => prev.map(s => s.id === editStudent.id ? updated : s));
        showToast('تم تعديل بيانات الطالب بنجاح');
      } else {
        const created = await addStudent({ ...data, classId: data.classId, className: data.className, number: data.number });
        setStudents(prev => [...prev, created]);
        showToast('تم إضافة الطالب بنجاح');
      }
      setShowModal(false);
      setEditStudent(null);
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    showToast('تم حذف الطالب');
  };

  const handleImport = async (data: Omit<Student, 'id'>[]) => {
    setImporting(true);
    try {
      const result = await bulkImportStudents(data);
      const all = await getAllStudents();
      setStudents(all);
      showToast(`تم استيراد ${result.added} طالب بنجاح${result.skipped > 0 ? ` (تجاهل ${result.skipped} مكرر)` : ''}`);
      setShowImportModal(false);
    } catch {
      showToast('حدث خطأ أثناء الاستيراد', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: 'white', padding: '12px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '700', zIndex: 2000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '4px' }}>إدارة الطلاب</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            إجمالي: <strong style={{ color: '#2555a0' }}>{students.length}</strong> طالب — معروض: <strong>{filtered.length}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowImportModal(true)} style={btnStyle('#f0fdf4', '#15803d')}>
            <FileSpreadsheet size={15} /> استيراد Excel
          </button>
          <button onClick={() => { setEditStudent(null); setShowModal(true); }} style={btnStyle('#2555a0')}>
            <Plus size={15} /> إضافة طالب
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...S.card, marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ ...S.input, paddingRight: '36px' }}
              placeholder="بحث بالاسم أو الرقم القومي أو رقم الكشف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative', minWidth: '160px' }}>
            <Filter size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              style={{ ...S.input, paddingRight: '32px', paddingLeft: '28px', cursor: 'pointer', appearance: 'none' as const }}
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="all">جميع الفصول</option>
              {classesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#2555a0', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <p>جاري التحميل...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: '700' }}>لا توجد نتائج</p>
            <p style={{ fontSize: '13px' }}>جرّب تغيير معايير البحث</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['م', 'اسم الطالب', 'الفصل', 'الرقم القومي', 'الهاتف', 'إجراءات'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '700' }}>{s.number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1a202c' }}>{s.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.className.includes('فتيات') ? '#fdf2f8' : '#eff6ff', color: s.className.includes('فتيات') ? '#9333ea' : '#2555a0', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                        {s.className}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{s.nationalId || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{s.phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setViewStudent(s)} style={{ ...btnStyle('#f0f9ff', '#0369a1'), padding: '6px 10px' }} title="عرض"><Eye size={14} /></button>
                        <button onClick={() => { setEditStudent(s); setShowModal(true); }} style={{ ...btnStyle('#fef9f0', '#d97706'), padding: '6px 10px' }} title="تعديل"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(s.id)} style={{ ...btnStyle('#fef2f2', '#dc2626'), padding: '6px 10px' }} title="حذف"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', background: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244', marginBottom: '8px' }}>تأكيد الحذف</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>هل أنت متأكد من حذف هذا الطالب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={btnStyle('#f1f5f9', '#64748b')}>إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} style={btnStyle('#dc2626')}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2244' }}>بيانات الطالب</h2>
              <button onClick={() => setViewStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'الاسم الكامل', value: viewStudent.name },
                { label: 'الفصل', value: viewStudent.className },
                { label: 'رقم الكشف', value: String(viewStudent.number) },
                { label: 'الرقم القومي', value: viewStudent.nationalId || '—' },
                { label: 'الهاتف', value: viewStudent.phone || '—' },
                { label: 'البريد الإلكتروني', value: viewStudent.email || '—' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', color: '#1a202c', fontWeight: '700' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewStudent(null)} style={btnStyle('#f1f5f9', '#64748b')}>إغلاق</button>
              <button onClick={() => { setEditStudent(viewStudent); setViewStudent(null); setShowModal(true); }} style={btnStyle('#2555a0')}>
                <Pencil size={14} /> تعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <StudentModal
          student={editStudent}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditStudent(null); }}
          saving={saving}
        />
      )}

      {showImportModal && (
        <ExcelImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
          importing={importing}
        />
      )}
    </div>
  );
};

export default StudentsManagement;
