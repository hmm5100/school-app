// src/pages/ClassDetail.tsx
// صفحة تفاصيل الفصل — قائمة الطلاب والإحصائيات

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Users, Search, UserPlus,
  AlertCircle, Hash, Phone, ChevronLeft
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { Student } from '../types';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [className, setClassName] = useState('');
  const [students, setStudents] = useState<(Student & { birthDate?: string })[]>([]);
  const [filtered, setFiltered] = useState<(Student & { birthDate?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Try to get class name from classes collection first
    const loadData = async () => {
      try {
        const classDoc = await getDoc(doc(db, 'classes', id));
        if (classDoc.exists()) {
          setClassName(classDoc.data().name || id);
        } else {
          setClassName(id);
        }
      } catch {
        setClassName(id);
      }

      // Get students in this class
      const q = query(collection(db, 'students'), where('classId', '==', id));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as (Student & { birthDate?: string })[];
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
      setStudents(list);
      setFiltered(list);
      setLoading(false);
    };

    loadData();
  }, [id]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(students);
      return;
    }
    setFiltered(
      students.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        String(s.number ?? '').includes(q) ||
        s.nationalId?.includes(q)
      )
    );
  }, [search, students]);

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

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('');

  const avatarColors = [
    ['#dbeafe', '#1d4ed8'], ['#d1fae5', '#065f46'],
    ['#ede9fe', '#6d28d9'], ['#fef3c7', '#b45309'],
    ['#fce7f3', '#be185d'],
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowRight size={18} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f2244', margin: 0 }}>{className}</h1>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>تفاصيل الفصل</p>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={() => navigate('/students/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg, #1a3a6b, #2555a0)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
          >
            <UserPlus size={14} /> إضافة طالب
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#2555a0" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 600 }}>عدد الطلاب</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0f2244', margin: 0 }}>{students.length}</p>
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hash size={18} color="#059669" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 600 }}>رمز الفصل</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0f2244', margin: 0 }}>{id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم الطالب أو رقمه..."
          style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'Cairo, sans-serif', color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }}
        />
      </div>

      {/* Students List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <AlertCircle size={40} color="#d1d5db" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, color: '#9ca3af', fontWeight: 600 }}>
            {search ? 'لا توجد نتائج للبحث' : 'لا يوجد طلاب في هذا الفصل'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((s, idx) => {
            const [bg, fg] = avatarColors[idx % avatarColors.length];
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, cursor: 'pointer', textAlign: 'right', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s', fontFamily: 'Cairo, sans-serif', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: fg, flexShrink: 0 }}>
                  {s.photoURL ? (
                    <img src={s.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : initials(s.name || '؟')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                    {s.number && <span style={{ fontSize: 12, color: '#9ca3af' }}>#{s.number}</span>}
                    {s.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9ca3af' }}>
                        <Phone size={11} />{s.phone}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
