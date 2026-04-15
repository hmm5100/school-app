// src/pages/GradesManagement.tsx
// صفحة إدارة الدرجات - مرتبطة بالامتحانات الحقيقية

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, Download, Search, Filter, ChevronDown,
  TrendingUp, TrendingDown, Award, Users, BookOpen,
  CheckCircle, XCircle, Clock, FileSpreadsheet, Eye,
  Edit2, RefreshCw, AlertCircle
} from 'lucide-react';
import { getAllGrades, getClassStatistics, updateGrade, type ClassStatistics } from '../services/gradeService';
import type { Grade } from '../types';

// ─── Helpers ─────────────────────────────────────────
const getGradeColor = (pct: number) => {
  if (pct >= 85) return { bg: '#f0fdf4', text: '#059669', border: '#bbf7d0' };
  if (pct >= 65) return { bg: '#eff6ff', text: '#2555a0', border: '#bfdbfe' };
  if (pct >= 50) return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  return { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' };
};

const getGradeLabel = (pct: number) => {
  if (pct >= 85) return 'ممتاز';
  if (pct >= 75) return 'جيد جداً';
  if (pct >= 65) return 'جيد';
  if (pct >= 50) return 'مقبول';
  return 'ضعيف';
};

// ─── Grade Edit Modal ───────────────────────────────────
const EditGradeModal = ({ 
  grade, 
  onClose, 
  onSave 
}: { 
  grade: Grade; 
  onClose: () => void; 
  onSave: (newScore: number) => void;
}) => {
  const [newScore, setNewScore] = useState(grade.score);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newScore < 0 || newScore > grade.totalScore) {
      alert(`الدرجة يجب أن تكون بين 0 و ${grade.totalScore}`);
      return;
    }

    setLoading(true);
    try {
      await onSave(newScore);
      onClose();
    } catch (err) {
      alert('حدث خطأ أثناء تحديث الدرجة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.45)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000, 
      direction: 'rtl' 
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '20px', 
        padding: '32px', 
        width: '400px', 
        maxWidth: '95vw', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', marginBottom: '20px' }}>
          تعديل درجة الطالب
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>الطالب</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#0f2244' }}>{grade.studentName}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>المادة</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#0f2244' }}>{grade.subjectName}</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
            الدرجة الجديدة (من {grade.totalScore})
          </label>
          <input
            type="number"
            min={0}
            max={grade.totalScore}
            value={newScore}
            onChange={e => setNewScore(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '16px',
              fontFamily: 'Cairo, sans-serif',
              fontWeight: '700',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            النسبة: {Math.round((newScore / grade.totalScore) * 100)}%
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleSave}
            disabled={loading}
            style={{ 
              flex: 1,
              background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button 
            onClick={onClose}
            disabled={loading}
            style={{ 
              flex: 1,
              background: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Student Detail Modal ─────────────────────────────────────────────────────
const DetailModal = ({ grade, onClose }: { grade: Grade; onClose: () => void }) => {
  const color = getGradeColor(grade.percentage);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', margin: 0 }}>{grade.studentName}</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>{grade.studentId}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>إغلاق</button>
        </div>

        {/* Big score circle */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: `6px solid ${color.border}`, background: color.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: color.text }}>{grade.score}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>من {grade.totalScore}</span>
          </div>
          <p style={{ marginTop: '12px', fontSize: '15px', fontWeight: '800', color: color.text }}>{grade.percentage}% — {getGradeLabel(grade.percentage)}</p>
          <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: grade.percentage >= 50 ? '#f0fdf4' : '#fef2f2', color: grade.percentage >= 50 ? '#059669' : '#ef4444', border: `1px solid ${grade.percentage >= 50 ? '#bbf7d0' : '#fecaca'}` }}>
            {grade.percentage >= 50 ? '✓ ناجح' : '✗ راسب'}
          </span>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'المادة', value: grade.subjectName },
            { label: 'التقدير', value: grade.grade },
            { label: 'تاريخ التسليم', value: grade.createdAt.toLocaleDateString('ar-EG') },
            { label: 'آخر تعديل', value: grade.editedAt ? grade.editedAt.toLocaleDateString('ar-EG') : '-' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 3px', fontWeight: '600' }}>{item.label}</p>
              <p style={{ fontSize: '13px', color: '#1a202c', margin: 0, fontWeight: '700' }}>{item.value}</p>
            </div>
          ))}
        </div>

        {grade.editedBy && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
              <AlertCircle size={14} style={{ display: 'inline', marginLeft: '4px' }} />
              تم تعديل هذه الدرجة بواسطة: {grade.editedBy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const GradesManagement = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('الكل');
  const [subjectFilter, setSubjectFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [showFilters, setShowFilters] = useState(false);
  const [detailGrade, setDetailGrade] = useState<Grade | null>(null);
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [statistics, setStatistics] = useState<ClassStatistics | null>(null);

  // Load grades
  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await getAllGrades();
      setGrades(data);
    } catch (err) {
      console.error('Error loading grades:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filters
  const classes = useMemo(() => {
    const unique = new Set(grades.map(g => g.classId));
    return ['الكل', ...Array.from(unique)];
  }, [grades]);

  const subjects = useMemo(() => {
    const unique = new Set(grades.map(g => g.subjectName));
    return ['الكل', ...Array.from(unique)];
  }, [grades]);

  // Filter grades
  const filtered = useMemo(() => {
    return grades.filter(g => {
      const matchesSearch = searchTerm === '' || 
        g.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = classFilter === 'الكل' || g.classId === classFilter;
      const matchesSubject = subjectFilter === 'الكل' || g.subjectName === subjectFilter;
      const matchesStatus = statusFilter === 'الكل' || 
        (statusFilter === 'ناجح' && g.percentage >= 50) ||
        (statusFilter === 'راسب' && g.percentage < 50);

      return matchesSearch && matchesClass && matchesSubject && matchesStatus;
    });
  }, [grades, searchTerm, classFilter, subjectFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const passed = filtered.filter(g => g.percentage >= 50).length;
    const failed = total - passed;
    const avgScore = total > 0 ? filtered.reduce((sum, g) => sum + g.score, 0) / total : 0;
    const avgPercentage = total > 0 ? filtered.reduce((sum, g) => sum + g.percentage, 0) / total : 0;

    return { total, passed, failed, avgScore: Math.round(avgScore * 100) / 100, avgPercentage: Math.round(avgPercentage * 100) / 100 };
  }, [filtered]);

  // Handle grade edit
  const handleEditGrade = async (newScore: number) => {
    if (!editGrade) return;
    
    try {
      await updateGrade(editGrade.id, newScore, editGrade.totalScore, 'admin'); // Replace 'admin' with actual user ID
      await loadGrades(); // Reload grades
      alert('تم تحديث الدرجة بنجاح');
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', direction: 'rtl' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>جاري تحميل الدرجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f2244', margin: 0, marginBottom: '6px' }}>إدارة الدرجات</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>مرتبطة بالامتحانات الحقيقية من Firebase</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={loadGrades}
            style={{ background: '#eff6ff', border: 'none', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', fontWeight: '700', color: '#2555a0' }}>
            <RefreshCw size={16} />
            تحديث
          </button>
          <button style={{ background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', fontWeight: '700', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <Download size={16} />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Users size={20} color="#2555a0" />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>إجمالي السجلات</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', margin: 0 }}>{stats.total}</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <CheckCircle size={20} color="#059669" />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ناجح</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '900', color: '#059669', margin: 0 }}>{stats.passed}</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <XCircle size={20} color="#ef4444" />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>راسب</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444', margin: 0 }}>{stats.failed}</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#fef9c3', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Award size={20} color="#ca8a04" />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>المتوسط</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '900', color: '#ca8a04', margin: 0 }}>{stats.avgPercentage}%</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: showFilters ? '16px' : 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الكود..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '11px 44px 11px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', outline: 'none' }}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: showFilters ? '#eff6ff' : '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', fontWeight: '700', color: showFilters ? '#2555a0' : '#64748b', transition: 'all 0.2s' }}>
            <Filter size={16} />
            فلترة
            <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f0f4f8' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>الفصل</label>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', background: 'white', color: '#1a202c' }}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>المادة</label>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', background: 'white', color: '#1a202c' }}>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>الحالة</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['الكل', 'ناجح', 'راسب'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{ flex: 1, padding: '9px 10px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', background: statusFilter === s ? (s === 'راسب' ? '#ef4444' : s === 'ناجح' ? '#059669' : '#2555a0') : '#f1f5f9', color: statusFilter === s ? 'white' : '#64748b', transition: 'all 0.2s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: '600' }}>
        عرض <span style={{ color: '#0f2244', fontWeight: '800' }}>{filtered.length}</span> نتيجة من أصل {grades.length}
      </p>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f4f8' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 90px 70px 70px', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '800', color: '#64748b', gap: '8px' }}>
          <span>اسم الطالب</span>
          <span>الفصل</span>
          <span>المادة</span>
          <span style={{ textAlign: 'center' }}>الدرجة</span>
          <span style={{ textAlign: 'center' }}>النسبة</span>
          <span style={{ textAlign: 'center' }}>الحالة</span>
          <span style={{ textAlign: 'center' }}>تفاصيل</span>
          <span style={{ textAlign: 'center' }}>تعديل</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <BookOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: '15px', fontWeight: '700' }}>لا توجد نتائج</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>لم يتم إضافة أي درجات بعد من الامتحانات</p>
          </div>
        ) : filtered.map((g, idx) => {
          const color = getGradeColor(g.percentage);
          return (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 90px 70px 70px', padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #f0f4f8' : 'none', alignItems: 'center', gap: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafbfd')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              {/* Name */}
              <div>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#0f2244', margin: 0 }}>{g.studentName}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{g.studentId}</p>
              </div>
              {/* Class */}
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: '600' }}>{g.classId}</span>
              {/* Subject */}
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: '700' }}>{g.subjectName}</span>
              {/* Score */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: color.text }}>{g.score}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>/{g.totalScore}</span>
              </div>
              {/* Percentage */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: color.text }}>{g.percentage}%</span>
                  <div style={{ width: '50px', height: '4px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(g.percentage, 100)}%`, height: '100%', background: color.text, borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>
              {/* Status */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', background: g.percentage >= 50 ? '#f0fdf4' : '#fef2f2', color: g.percentage >= 50 ? '#059669' : '#ef4444', border: `1px solid ${g.percentage >= 50 ? '#bbf7d0' : '#fecaca'}` }}>
                  {g.percentage >= 50 ? 'ناجح' : 'راسب'}
                </span>
              </div>
              {/* Detail button */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => setDetailGrade(g)} style={{ background: '#eff6ff', border: 'none', borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'inline-flex', color: '#2555a0' }}>
                  <Eye size={15} />
                </button>
              </div>
              {/* Edit button */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => setEditGrade(g)} style={{ background: '#fef3c7', border: 'none', borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'inline-flex', color: '#92400e' }}>
                  <Edit2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {detailGrade && <DetailModal grade={detailGrade} onClose={() => setDetailGrade(null)} />}
      {editGrade && <EditGradeModal grade={editGrade} onClose={() => setEditGrade(null)} onSave={handleEditGrade} />}
    </div>
  );
};

export default GradesManagement;
