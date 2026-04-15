// src/pages/ActivityLog.tsx
import React, { useState } from 'react';

type ActionType = 'add' | 'edit' | 'delete' | 'suspend' | 'reopen' | 'upload';
type EntityType = 'student' | 'teacher' | 'exam' | 'grade' | 'class' | 'subject' | 'certificate';

interface ActivityLog {
  id: string; userId: string; userName: string; userRole: 'admin' | 'teacher';
  userAvatar: string; action: ActionType; entityType: EntityType; entityName: string;
  oldValue?: string; newValue?: string; details: string; timestamp: Date;
  ipAddress?: string; device?: string; severity: 'low' | 'medium' | 'high' | 'critical';
}

const mockLogs: ActivityLog[] = [
  { id:'1', userId:'admin1', userName:'Mr. Hamdy Mohamed', userRole:'admin', userAvatar:'👨‍💼', action:'delete', entityType:'student', entityName:'أحمد محمد علي', details:'حذف طالب من الصف الأول الثانوي', timestamp:new Date(Date.now()-1000*60*15), ipAddress:'192.168.1.100', device:'Windows 11', severity:'high' },
  { id:'2', userId:'teacher1', userName:'أ. سارة أحمد', userRole:'teacher', userAvatar:'👩‍🏫', action:'edit', entityType:'exam', entityName:'امتحان الرياضيات - الشهر الثاني', oldValue:'مدة الامتحان: 60 دقيقة', newValue:'مدة الامتحان: 90 دقيقة', details:'تعديل مدة امتحان الرياضيات', timestamp:new Date(Date.now()-1000*60*45), ipAddress:'192.168.1.105', device:'MacBook Pro', severity:'medium' },
  { id:'3', userId:'teacher2', userName:'أ. محمد حسن', userRole:'teacher', userAvatar:'👨‍🏫', action:'upload', entityType:'grade', entityName:'درجات امتحان العلوم', details:'رفع ملف Excel يحتوي على 45 درجة', timestamp:new Date(Date.now()-1000*60*120), ipAddress:'192.168.1.108', device:'iPad Pro', severity:'low' },
  { id:'4', userId:'admin1', userName:'Mr. Hamdy Mohamed', userRole:'admin', userAvatar:'👨‍💼', action:'add', entityType:'teacher', entityName:'أ. فاطمة علي', details:'إضافة مدرس جديد - مادة اللغة العربية', timestamp:new Date(Date.now()-1000*60*180), ipAddress:'192.168.1.100', device:'Windows 11', severity:'medium' },
  { id:'5', userId:'teacher3', userName:'أ. نورا خالد', userRole:'teacher', userAvatar:'👩‍🏫', action:'reopen', entityType:'exam', entityName:'امتحان الإنجليزي - الشهر الأول', details:'إعادة فتح الامتحان للطالب: خالد محمود', timestamp:new Date(Date.now()-1000*60*240), ipAddress:'192.168.1.112', device:'iPhone 15', severity:'medium' },
  { id:'6', userId:'admin1', userName:'Mr. Hamdy Mohamed', userRole:'admin', userAvatar:'👨‍💼', action:'suspend', entityType:'teacher', entityName:'أ. أحمد سعيد', oldValue:'الحالة: نشط', newValue:'الحالة: موقوف مؤقتًا', details:'إيقاف حساب المدرس مؤقتًا', timestamp:new Date(Date.now()-1000*60*360), ipAddress:'192.168.1.100', device:'Windows 11', severity:'critical' },
  { id:'7', userId:'teacher1', userName:'أ. سارة أحمد', userRole:'teacher', userAvatar:'👩‍🏫', action:'add', entityType:'exam', entityName:'امتحان الجبر - نهاية الترم', details:'إنشاء امتحان جديد - 40 سؤال - 100 درجة', timestamp:new Date(Date.now()-1000*60*480), ipAddress:'192.168.1.105', device:'MacBook Pro', severity:'low' },
  { id:'8', userId:'admin1', userName:'Mr. Hamdy Mohamed', userRole:'admin', userAvatar:'👨‍💼', action:'edit', entityType:'class', entityName:'الصف الأول الثانوي - أ', oldValue:'عدد الطلاب: 32', newValue:'عدد الطلاب: 34', details:'تعديل بيانات الفصل', timestamp:new Date(Date.now()-1000*60*600), ipAddress:'192.168.1.100', device:'Windows 11', severity:'low' },
];

const actionColors: Record<ActionType, { bg: string; color: string; label: string }> = {
  add:     { bg: '#f0fdf4', color: '#15803d', label: 'إضافة' },
  edit:    { bg: '#eff6ff', color: '#1d4ed8', label: 'تعديل' },
  delete:  { bg: '#fef2f2', color: '#b91c1c', label: 'حذف' },
  suspend: { bg: '#fff7ed', color: '#c2410c', label: 'إيقاف' },
  reopen:  { bg: '#f0fdf4', color: '#15803d', label: 'إعادة فتح' },
  upload:  { bg: '#faf5ff', color: '#6d28d9', label: 'رفع' },
};

const severityColors: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  low:      { bg: '#f0fdf4', color: '#15803d', label: 'منخفضة', icon: '🔵' },
  medium:   { bg: '#fffbeb', color: '#92400e', label: 'متوسطة', icon: '🟡' },
  high:     { bg: '#fff7ed', color: '#c2410c', label: 'عالية',  icon: '🟠' },
  critical: { bg: '#fef2f2', color: '#b91c1c', label: 'حرجة',   icon: '🔴' },
};

const entityLabels: Record<EntityType, string> = { student:'طالب', teacher:'مدرس', exam:'امتحان', grade:'درجات', class:'فصل', subject:'مادة', certificate:'شهادة' };

function formatTime(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 60) return `منذ ${diff} دقيقة`;
  if (diff < 1440) return `منذ ${Math.floor(diff/60)} ساعة`;
  return `منذ ${Math.floor(diff/1440)} يوم`;
}

const ActivityLogPage: React.FC = () => {
  const [logs] = useState<ActivityLog[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<ActionType | 'all'>('all');
  const [filterEntity, setFilterEntity] = useState<EntityType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all'|'low'|'medium'|'high'|'critical'>('all');

  const filtered = logs.filter(log => {
    const matchSearch = log.details.includes(searchTerm) || log.entityName.includes(searchTerm) || log.userName.includes(searchTerm);
    return matchSearch && (filterAction === 'all' || log.action === filterAction) && (filterEntity === 'all' || log.entityType === filterEntity) && (filterSeverity === 'all' || log.severity === filterSeverity);
  });

  const sel = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:'13px', fontFamily:'Cairo, sans-serif', outline:'none', color:'#1e293b', background:'white' } as React.CSSProperties;

  return (
    <div style={{ direction:'rtl', fontFamily:'Cairo, sans-serif', minHeight:'100%' }}>
      {/* Header */}
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'900', color:'#1e293b', margin:0 }}>📋 سجلات التعديلات</h1>
        <p style={{ fontSize:'13px', color:'#64748b', margin:'4px 0 0' }}>متابعة كل العمليات والتعديلات داخل النظام</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'إجمالي العمليات', value:logs.length, icon:'📊', bg:'#eff6ff', color:'#1d4ed8' },
          { label:'عمليات اليوم', value:8, icon:'📅', bg:'#f0fdf4', color:'#15803d' },
          { label:'آخر تعديل', value:'منذ 15 دقيقة', icon:'🕐', bg:'#fffbeb', color:'#92400e' },
          { label:'عمليات حرجة', value:logs.filter(l=>l.severity==='critical').length, icon:'🚨', bg:'#fef2f2', color:'#b91c1c' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white', borderRadius:'14px', border:'1px solid #e2e8f0', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:'22px', marginBottom:'6px' }}>{s.icon}</div>
            <div style={{ fontSize:'20px', fontWeight:'900', color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'11px', color:'#64748b', marginTop:'2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e2e8f0', padding:'20px', marginBottom:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'12px' }}>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'6px' }}>🔍 البحث</label>
            <input type="text" placeholder="ابحث عن عملية، مستخدم، أو تفاصيل..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              style={{ ...sel }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'6px' }}>نوع العملية</label>
            <select value={filterAction} onChange={e=>setFilterAction(e.target.value as any)} style={sel}>
              <option value="all">الكل</option>
              {Object.entries(actionColors).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'6px' }}>النوع</label>
            <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value as any)} style={sel}>
              <option value="all">الكل</option>
              {Object.entries(entityLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'6px' }}>الأهمية</label>
            <select value={filterSeverity} onChange={e=>setFilterSeverity(e.target.value as any)} style={sel}>
              <option value="all">الكل</option>
              {Object.entries(severityColors).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'white', borderRadius:'14px', border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['المستخدم','نوع العملية','النوع','التفاصيل','التغيير','الوقت','الأهمية'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'right', color:'#475569', fontWeight:'700', fontSize:'12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'60px', textAlign:'center', color:'#94a3b8' }}>🔍 لا توجد نتائج</td></tr>
              ) : filtered.map(log => {
                const ac = actionColors[log.action];
                const sv = severityColors[log.severity];
                return (
                  <tr key={log.id} style={{ borderTop:'1px solid #f1f5f9' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
                    onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>{log.userAvatar}</div>
                        <div>
                          <p style={{ fontWeight:'700', color:'#1e293b', margin:0, fontSize:'13px' }}>{log.userName}</p>
                          <p style={{ fontSize:'11px', color:'#94a3b8', margin:0 }}>{log.userRole==='admin'?'👑 مسؤول':'👨‍🏫 مدرس'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:ac.bg, color:ac.color }}>{ac.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#374151', fontWeight:'600' }}>{entityLabels[log.entityType]}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <p style={{ fontWeight:'600', color:'#1e293b', margin:'0 0 2px', fontSize:'13px' }}>{log.entityName}</p>
                      <p style={{ fontSize:'11px', color:'#64748b', margin:0 }}>{log.details}</p>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {log.oldValue && log.newValue ? (
                        <div style={{ fontSize:'11px' }}>
                          <div style={{ color:'#dc2626', textDecoration:'line-through', marginBottom:'4px' }}>{log.oldValue}</div>
                          <div style={{ color:'#16a34a', fontWeight:'600' }}>← {log.newValue}</div>
                        </div>
                      ) : <span style={{ color:'#94a3b8', fontSize:'11px' }}>-</span>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <p style={{ color:'#1e293b', fontWeight:'600', margin:'0 0 2px', fontSize:'13px' }}>{formatTime(log.timestamp)}</p>
                      <p style={{ fontSize:'11px', color:'#94a3b8', margin:0 }}>{log.timestamp.toLocaleDateString('ar-EG',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:sv.bg, color:sv.color }}>
                        {sv.icon} {sv.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', borderRadius:'14px', border:'1px solid #e2e8f0', padding:'14px 20px', marginTop:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize:'13px', color:'#475569', margin:0 }}>عرض <strong style={{ color:'#1e293b' }}>{filtered.length}</strong> من أصل <strong style={{ color:'#1e293b' }}>{logs.length}</strong> عملية</p>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={{ padding:'8px 16px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Cairo, sans-serif' }}>تصدير Excel</button>
          <button style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Cairo, sans-serif' }}>تحديث</button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
