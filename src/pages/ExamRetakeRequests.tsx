// src/pages/ExamRetakeRequests.tsx
// صفحة إدارة طلبات إعادة الامتحان - تنسيق موحد مع صفحة الامتحانات

import { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, XCircle, MessageSquare,
  RefreshCw, Search, AlertCircle,
  User, BookOpen,
} from 'lucide-react';
import {
  getAllRetakeRequests,
  approveRetakeRequest,
  rejectRetakeRequest,
  type ExamRetakeRequest,
} from '../services/examRetakeService';

// ─── Helper ───────────────────────────────────────────
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `${diffMins} دقيقة`;
  if (diffHours < 24) return `${diffHours} ساعة`;
  if (diffDays < 7) return `${diffDays} يوم`;
  return new Date(date).toLocaleDateString('ar-EG');
}

// ─── Status helpers ───────────────────────────────────
const STATUS_MAP = {
  pending:  { label: 'قيد المراجعة', color: '#f59e0b', borderColor: '#fbbf24' },
  approved: { label: 'تمت الموافقة', color: '#10b981', borderColor: '#34d399' },
  rejected: { label: 'مرفوض',        color: '#ef4444', borderColor: '#f87171' },
};

// ─── Comment Modal ────────────────────────────────────
const CommentModal = ({
  action,
  loading,
  onConfirm,
  onCancel,
}: {
  action: 'approve' | 'reject';
  loading: boolean;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}) => {
  const [comment, setComment] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,34,68,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '28px',
        width: '480px', maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', marginBottom: '6px' }}>
          {action === 'approve' ? '✓ موافقة على الطلب' : '✗ رفض الطلب'}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          {action === 'approve'
            ? 'يمكنك إضافة ملاحظة للطالب (اختياري)'
            : 'أخبر الطالب بسبب الرفض (اختياري)'}
        </p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={
            action === 'approve'
              ? 'مثال: تمت الموافقة. يمكنك إعادة الامتحان الآن.'
              : 'مثال: يجب الالتزام بالمواعيد المحددة.'
          }
          rows={4}
          style={{
            width: '100%', padding: '12px',
            border: '2px solid #e2e8f0', borderRadius: '12px',
            fontSize: '14px', fontFamily: 'Cairo, sans-serif',
            resize: 'vertical', outline: 'none', marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onConfirm(comment)}
            disabled={loading}
            style={{
              flex: 1,
              background: loading ? '#cbd5e1' : action === 'approve' ? '#10b981' : '#ef4444',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '13px', fontSize: '14px', fontWeight: '800',
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'جاري المعالجة...' : action === 'approve' ? 'موافقة' : 'رفض'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, background: '#f1f5f9', color: '#475569',
              border: 'none', borderRadius: '12px', padding: '13px',
              fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo, sans-serif',
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

// ─── Request Card ─────────────────────────────────────
const RequestCard = ({
  request,
  onApprove,
  onReject,
}: {
  request: ExamRetakeRequest;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, comment?: string) => Promise<void>;
}) => {
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);

  const status = STATUS_MAP[request.status] ?? STATUS_MAP.pending;

  const handleConfirm = async (comment: string) => {
    if (!modalAction) return;
    setLoading(true);
    try {
      if (modalAction === 'approve') await onApprove(request.id, comment);
      else await onReject(request.id, comment);
      setModalAction(null);
    } catch {
      alert('حدث خطأ أثناء معالجة الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Card — same structure as exam card in صفحة الامتحانات */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e8edf5',
        boxShadow: '0 2px 12px rgba(15,34,68,0.06)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}>
        {/* Colored left accent bar (same as exam card) */}
        <div style={{ display: 'flex' }}>
          <div style={{
            width: '5px',
            background: status.borderColor,
            flexShrink: 0,
          }} />

          <div style={{ flex: 1, padding: '20px 20px 20px 20px' }}>
            {/* Top row: title + status badge */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '14px', gap: '12px',
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f2244', margin: '0 0 5px' }}>
                  {request.examTitle}
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  تم الطلب منذ {getRelativeTime(request.requestedAt)}
                </p>
              </div>
              <span style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '11px',
                fontWeight: '800', whiteSpace: 'nowrap',
                background: `${status.color}18`,
                color: status.color,
                border: `1px solid ${status.color}40`,
              }}>
                {request.status === 'approved' ? '✓ ' : request.status === 'rejected' ? '✗ ' : '⏳ '}
                {status.label}
              </span>
            </div>

            {/* Info row: student / class / score — like exam stats row */}
            <div style={{
              display: 'flex', gap: '20px', flexWrap: 'wrap',
              padding: '12px 16px',
              background: '#f8fafc',
              borderRadius: '12px',
              marginBottom: '14px',
              border: '1px solid #e8edf5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="#6366f1" />
                <div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>الطالب</p>
                  <p style={{ fontSize: '13px', color: '#0f2244', margin: 0, fontWeight: '800' }}>
                    {request.studentName}
                  </p>
                </div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} color="#6366f1" />
                <div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>الفصل</p>
                  <p style={{ fontSize: '13px', color: '#0f2244', margin: 0, fontWeight: '800' }}>
                    {request.classId}
                  </p>
                </div>
              </div>
              {request.originalScore !== undefined && (
                <>
                  <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch' }} />
                  <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>الدرجة السابقة</p>
                    <p style={{ fontSize: '13px', color: '#ef4444', margin: 0, fontWeight: '800' }}>
                      {request.originalScore} ({request.originalPercentage}%)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Reason box */}
            <div style={{
              padding: '10px 14px',
              background: '#fffbeb',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              marginBottom: request.reviewerComment || request.status === 'pending' ? '14px' : '0',
            }}>
              <p style={{
                fontSize: '11px', color: '#92400e', margin: '0 0 4px',
                fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <MessageSquare size={12} /> سبب الطلب:
              </p>
              <p style={{ fontSize: '13px', color: '#713f12', margin: 0, lineHeight: 1.7 }}>
                {request.reason}
              </p>
            </div>

            {/* Reviewer comment */}
            {request.reviewedBy && request.reviewerComment && (
              <div style={{
                padding: '10px 14px',
                background: request.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                borderRadius: '10px',
                border: `1px solid ${request.status === 'approved' ? '#bbf7d0' : '#fecaca'}`,
                marginBottom: request.status === 'pending' ? '14px' : '0',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: request.status === 'approved' ? '#166534' : '#991b1b',
                  margin: '0 0 4px', fontWeight: '700',
                }}>
                  رد المراجع:
                </p>
                <p style={{
                  fontSize: '13px',
                  color: request.status === 'approved' ? '#15803d' : '#b91c1c',
                  margin: 0, lineHeight: 1.7,
                }}>
                  {request.reviewerComment}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
                  بواسطة: {request.reviewedBy}
                  {request.reviewedAt
                    ? ` • ${new Date(request.reviewedAt).toLocaleDateString('ar-EG')}`
                    : ''}
                </p>
              </div>
            )}

            {/* Action buttons — same style as النتائج / الإعدادات in exam card */}
            {request.status === 'pending' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => setModalAction('approve')}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '11px 0',
                    background: '#f0fdf4',
                    color: '#059669',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '10px',
                    fontSize: '13px', fontWeight: '800',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle size={16} /> موافقة
                </button>
                <button
                  onClick={() => setModalAction('reject')}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '11px 0',
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: '1.5px solid #fecaca',
                    borderRadius: '10px',
                    fontSize: '13px', fontWeight: '800',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} /> رفض
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAction && (
        <CommentModal
          action={modalAction}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setModalAction(null)}
        />
      )}
    </>
  );
};

// ─── Stat Card ────────────────────────────────────────
const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{
    background: 'white', borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 2px 12px rgba(15,34,68,0.06)',
    border: '1px solid #e8edf5',
  }}>
    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', fontWeight: '700' }}>{label}</p>
    <p style={{ fontSize: '30px', fontWeight: '900', color, margin: 0 }}>{value}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────
const ExamRetakeRequests = () => {
  const [requests, setRequests] = useState<ExamRetakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllRetakeRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, comment?: string) => {
    await approveRetakeRequest(id, 'admin', comment);
    await loadRequests();
  };

  const handleReject = async (id: string, comment?: string) => {
    await rejectRetakeRequest(id, 'admin', comment);
    await loadRequests();
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch =
      searchTerm === '' ||
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const FILTERS: { key: 'all' | 'pending' | 'approved' | 'rejected'; label: string }[] = [
    { key: 'all',      label: 'الكل' },
    { key: 'pending',  label: 'قيد المراجعة' },
    { key: 'approved', label: 'تمت الموافقة' },
    { key: 'rejected', label: 'مرفوضة' },
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '60vh', direction: 'rtl',
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={44} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '14px' }} />
          <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '700' }}>جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6fb',
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
    }}>
      {/* ── Page Header (same dark blue as Exams page) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2244 0%, #1a3a6e 100%)',
        padding: '32px 32px 28px',
        marginBottom: '28px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', margin: '0 0 6px' }}>
            طلبات إعادة الامتحان
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            إدارة طلبات الطلاب لإعادة الامتحانات
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 40px' }}>

        {/* ── Stat Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <StatCard label="إجمالي الطلبات" value={stats.total}    color="#0f2244" />
          <StatCard label="قيد المراجعة"   value={stats.pending}  color="#f59e0b" />
          <StatCard label="تمت الموافقة"   value={stats.approved} color="#10b981" />
          <StatCard label="مرفوضة"          value={stats.rejected} color="#ef4444" />
        </div>

        {/* ── Search + Filters bar (same card style) ── */}
        <div style={{
          background: 'white', borderRadius: '16px',
          padding: '16px 20px', marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(15,34,68,0.06)',
          border: '1px solid #e8edf5',
        }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={17} color="#94a3b8" style={{
                position: 'absolute', right: '14px',
                top: '50%', transform: 'translateY(-50%)',
              }} />
              <input
                type="text"
                placeholder="ابحث بالطالب أو الامتحان..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '11px 44px 11px 16px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '14px', fontFamily: 'Cairo, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                  color: '#0f2244',
                }}
              />
            </div>
            {/* Refresh */}
            <button
              onClick={loadRequests}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '11px 18px',
                background: '#eff6ff', color: '#2555a0',
                border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: '800',
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} /> تحديث
            </button>
          </div>

          {/* Filter buttons — same pill style as الكل/نشط/مسودة/منتهي */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => {
              const active = filter === f.key;
              const activeColor =
                f.key === 'pending'  ? '#f59e0b' :
                f.key === 'approved' ? '#10b981' :
                f.key === 'rejected' ? '#ef4444' : '#6366f1';
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '8px 18px', borderRadius: '20px',
                    border: active ? `2px solid ${activeColor}` : '2px solid transparent',
                    fontSize: '13px', fontWeight: '800',
                    fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                    background: active ? `${activeColor}15` : '#f1f5f9',
                    color: active ? activeColor : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span style={{
                      marginRight: '6px',
                      background: active ? activeColor : '#cbd5e1',
                      color: 'white', borderRadius: '10px',
                      padding: '1px 7px', fontSize: '11px',
                    }}>
                      {f.key === 'pending'  ? stats.pending  :
                       f.key === 'approved' ? stats.approved :
                       stats.rejected}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Requests List ── */}
        <div style={{ display: 'grid', gap: '14px' }}>
          {filteredRequests.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '16px', padding: '60px',
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(15,34,68,0.06)',
              border: '1px solid #e8edf5',
            }}>
              <AlertCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', margin: 0 }}>
                لا توجد طلبات
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                {filter === 'all'      ? 'لم يتم تقديم أي طلبات حتى الآن' :
                 filter === 'pending'  ? 'لا توجد طلبات قيد المراجعة' :
                 filter === 'approved' ? 'لا توجد طلبات تمت الموافقة عليها' :
                 'لا توجد طلبات مرفوضة'}
              </p>
            </div>
          ) : (
            filteredRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default ExamRetakeRequests;
