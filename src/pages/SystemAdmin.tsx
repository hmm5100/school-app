// src/pages/SystemAdmin.tsx
import { useState, useEffect } from 'react';
import {
  getRolePermissions,
  saveRolePermissions,
  type RoleKey,
} from '../services/teacherService';
import type { TeacherPermissions } from '../types';

type Tab = 'school' | 'roles' | 'security' | 'archive' | 'system' | 'stats';

const inp = { width:'100%', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'9px 14px', fontSize:'13px', fontFamily:'Cairo, sans-serif', outline:'none', color:'#1e293b', background:'white', boxSizing:'border-box' } as React.CSSProperties;
const lbl = { display:'block', fontSize:'12px', fontWeight:'700', color:'#374151', marginBottom:'6px' } as React.CSSProperties;
const card = { background:'white', borderRadius:'14px', border:'1px solid #e2e8f0', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' } as React.CSSProperties;

const ALL_PERMISSIONS: { key: keyof TeacherPermissions; label: string; description: string }[] = [
  { key:'canCreateExams',    label:'إنشاء امتحانات',        description:'إنشاء امتحانات جديدة في المادة' },
  { key:'canEditOwnExam',    label:'تعديل امتحاناته',       description:'تعديل الامتحانات الخاصة به فقط' },
  { key:'canDeleteExam',     label:'حذف الامتحانات',        description:'حذف الامتحانات التي أنشأها' },
  { key:'canViewResults',    label:'مشاهدة النتائج',        description:'عرض نتائج الطلاب في مادته' },
  { key:'canDownloadExcel',  label:'تحميل Excel للنتائج',   description:'تصدير النتائج كملف Excel' },
  { key:'canEditGrades',     label:'تعديل درجات الطلاب',    description:'تعديل درجة طالب بعد التصحيح' },
  { key:'canCreateQuestions',label:'إنشاء بنك أسئلة',       description:'إضافة أسئلة لبنك الأسئلة' },
  { key:'canUploadWord',     label:'رفع ملفات Word',         description:'رفع أسئلة من ملف Word أو PDF' },
  { key:'canLockExams',      label:'فتح/قفل الامتحانات',    description:'التحكم في حالة الامتحان' },
  { key:'canReopenStudent',  label:'إعادة فتح للطالب',       description:'السماح لطالب معين بإعادة الامتحان' },
  { key:'canViewAllStudents',label:'رؤية كل الفصول',        description:'مشاهدة بيانات جميع الفصول' },
  { key:'canViewStudentId',  label:'رؤية الرقم القومي',     description:'عرض آخر 4 أرقام من الرقم القومي' },
  { key:'canManageStudents', label:'إدارة الطلاب',           description:'إضافة وتعديل بيانات الطلاب' },
];

const ROLES: { id: RoleKey; name: string; bg: string; color: string; teacherCount: number }[] = [
  { id:'normal',     name:'مدرس عادي',    bg:'#eff6ff', color:'#1d4ed8', teacherCount:8 },
  { id:'subject',    name:'مدرس مادة',    bg:'#f0fdf4', color:'#15803d', teacherCount:4 },
  { id:'supervisor', name:'مشرف مادة',    bg:'#faf5ff', color:'#6d28d9', teacherCount:2 },
  { id:'vice',       name:'نائب مسؤول',   bg:'#fff7ed', color:'#c2410c', teacherCount:1 },
];

function SchoolSettings() {
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={card}>
        <h3 style={{ fontSize:'16px', fontWeight:'800', color:'#1e293b', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px' }}>🏫 بيانات المدرسة</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {[
            { label:'اسم المدرسة', val:'مدرسة الرواد الثانوية الفنية للتمريض بقنا' },
            { label:'اسم المسؤول عن البرنامج', val:'Mr. Hamdy Mohamed' },
            { label:'البريد الإلكتروني للإدارة', val:'admin@school.edu.eg' },
            { label:'رقم الهاتف', val:'0100 000 0000' },
          ].map((f,i) => (
            <div key={i}>
              <label style={lbl}>{f.label}</label>
              <input defaultValue={f.val} style={inp} />
            </div>
          ))}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>العنوان</label>
            <input defaultValue="قنا، مصر" style={inp} />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize:'16px', fontWeight:'800', color:'#1e293b', marginBottom:'20px' }}>🖼️ الهوية البصرية</h3>
        <div style={{ display:'flex', gap:'24px', alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'100px', height:'100px', borderRadius:'16px', background:'linear-gradient(135deg,#e0e7ff,#ede9fe)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', border:'2px dashed #c7d2fe' }}>🏫</div>
            <button style={{ fontSize:'12px', background:'#eff6ff', color:'#4f46e5', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:'600' }}>تغيير الشعار</button>
          </div>
          <div style={{ flex:1 }}>
            <label style={lbl}>ظهور الشعار في:</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {['صفحة تسجيل الدخول','الشريط العلوي','التقارير المطبوعة','ملفات PDF','الشهادات','الامتحانات'].map(loc => (
                <label key={loc} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#374151', cursor:'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width:'15px', height:'15px', accentColor:'#4f46e5' }} />
                  {loc}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize:'16px', fontWeight:'800', color:'#1e293b', marginBottom:'20px' }}>📅 إعدادات العام الدراسي</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
          <div><label style={lbl}>العام الدراسي الحالي</label><input defaultValue="2025 / 2026" style={inp} /></div>
          <div><label style={lbl}>بداية الفصل الدراسي</label><input type="date" defaultValue="2025-09-01" style={inp} /></div>
          <div><label style={lbl}>نهاية الفصل الدراسي</label><input type="date" defaultValue="2026-06-30" style={inp} /></div>
        </div>
      </div>

      <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500)}}
        style={{ padding:'12px 28px', background: saved?'#16a34a':'#4f46e5', color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo, sans-serif', width:'fit-content' }}>
        {saved ? '✅ تم الحفظ!' : '💾 حفظ التغييرات'}
      </button>
    </div>
  );
}

function RolesManagement() {
  const [selectedRoleId, setSelectedRoleId] = useState<RoleKey>('normal');
  const [rolePerms, setRolePerms] = useState<Record<RoleKey, (keyof TeacherPermissions)[]>>({
    normal: [], subject: [], supervisor: [], vice: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getRolePermissions().then(perms => {
      setRolePerms(perms);
      setLoading(false);
    });
  }, []);

  const selectedRole = ROLES.find(r => r.id === selectedRoleId)!;
  const currentPerms = rolePerms[selectedRoleId] || [];

  const togglePerm = (key: keyof TeacherPermissions) => {
    setRolePerms(prev => ({
      ...prev,
      [selectedRoleId]: currentPerms.includes(key)
        ? currentPerms.filter(p => p !== key)
        : [...currentPerms, key],
    }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRolePermissions(selectedRoleId, rolePerms[selectedRoleId]);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
      <div style={{ width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#4f46e5', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      جاري التحميل...
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Role Selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
        {ROLES.map(role => (
          <button key={role.id} onClick={() => { setSelectedRoleId(role.id); setHasChanges(false); setSaved(false); }}
            style={{ padding:'14px', borderRadius:'12px', border:`2px solid ${selectedRoleId===role.id ? role.color : '#e2e8f0'}`, background: selectedRoleId===role.id ? role.bg : 'white', cursor:'pointer', textAlign:'right', fontFamily:'Cairo, sans-serif', transition:'all 0.15s' }}>
            <div style={{ fontWeight:'800', color: selectedRoleId===role.id ? role.color : '#1e293b', fontSize:'13px', marginBottom:'4px' }}>{role.name}</div>
            <div style={{ fontSize:'11px', color:'#64748b' }}>{role.teacherCount} مدرس</div>
          </button>
        ))}
      </div>

      {/* Permissions Grid */}
      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'800', color:'#1e293b', margin:0 }}>
            صلاحيات: <span style={{ color: selectedRole.color }}>{selectedRole.name}</span>
          </h3>
          <span style={{ fontSize:'12px', color:'#64748b' }}>
            {currentPerms.length} / {ALL_PERMISSIONS.length} صلاحية مفعّلة
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {ALL_PERMISSIONS.map(perm => {
            const active = currentPerms.includes(perm.key);
            return (
              <div key={perm.key} onClick={() => togglePerm(perm.key)}
                style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'10px 12px', borderRadius:'10px', border:`1px solid ${active ? '#c7d2fe' : '#f1f5f9'}`, background: active ? '#eff6ff' : '#f8fafc', cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ width:'18px', height:'18px', borderRadius:'4px', border:`2px solid ${active ? '#4f46e5' : '#cbd5e1'}`, background: active ? '#4f46e5' : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'1px', transition:'all 0.15s' }}>
                  {active && <span style={{ color:'white', fontSize:'11px', fontWeight:'900' }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:'700', color: active ? '#3730a3' : '#1e293b' }}>{perm.label}</div>
                  <div style={{ fontSize:'11px', color:'#64748b', marginTop:'1px' }}>{perm.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div style={{ marginTop:'16px', display:'flex', justifyContent:'flex-end', gap:'10px', alignItems:'center' }}>
          {hasChanges && !saved && (
            <span style={{ fontSize:'12px', color:'#d97706', fontWeight:'600' }}>⚠️ يوجد تغييرات غير محفوظة</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              padding:'10px 24px', borderRadius:'10px', border:'none', cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
              background: saved ? '#16a34a' : hasChanges ? '#4f46e5' : '#e2e8f0',
              color: hasChanges || saved ? 'white' : '#94a3b8',
              fontSize:'13px', fontWeight:'700', fontFamily:'Cairo, sans-serif',
              display:'flex', alignItems:'center', gap:'6px', transition:'all 0.2s',
            }}>
            {saving ? '⏳ جاري الحفظ...' : saved ? '✅ تم الحفظ!' : '💾 حفظ الصلاحيات'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {[
        { title:'🔐 إعدادات كلمة المرور', items:[{label:'الحد الأدنى للأحرف',type:'number',val:'8'},{label:'مدة انتهاء الجلسة (دقيقة)',type:'number',val:'60'}] },
        { title:'🛡️ إعدادات الأمان', items:[{label:'عدد محاولات تسجيل الدخول',type:'number',val:'5'},{label:'مدة حظر الحساب (دقيقة)',type:'number',val:'15'}] },
      ].map((sec,i) => (
        <div key={i} style={card}>
          <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#1e293b', marginBottom:'16px' }}>{sec.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            {sec.items.map((item,j) => (
              <div key={j}><label style={lbl}>{item.label}</label><input type={item.type} defaultValue={item.val} style={inp} /></div>
            ))}
          </div>
        </div>
      ))}
      <div style={card}>
        <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#1e293b', marginBottom:'14px' }}>🔒 خيارات أمان إضافية</h3>
        {['تفعيل التحقق بخطوتين','تسجيل جميع عمليات تسجيل الدخول','إشعار عند تسجيل دخول من جهاز جديد','منع تسجيل الدخول من أكثر من جهاز'].map(opt => (
          <label key={opt} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'#374151', cursor:'pointer', marginBottom:'10px' }}>
            <input type="checkbox" defaultChecked style={{ width:'15px', height:'15px', accentColor:'#4f46e5' }} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function SystemSettings() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={card}>
        <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#1e293b', marginBottom:'16px' }}>📊 إعدادات النتائج</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          <div><label style={lbl}>درجة النجاح الافتراضية (%)</label><input type="number" defaultValue={50} style={inp} /></div>
          <div><label style={lbl}>الحد الأقصى لمحاولات الامتحان</label><input type="number" defaultValue={1} style={inp} /></div>
          <div>
            <label style={lbl}>تحديث صفحة المستخدمين النشطين</label>
            <select style={{ ...inp }}>
              <option>كل دقيقة</option><option>كل 5 دقائق</option><option>كل 10 دقائق</option>
            </select>
          </div>
          <div>
            <label style={lbl}>لغة النظام</label>
            <select style={{ ...inp }}><option>العربية</option><option>English</option></select>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemStats() {
  const stats = [
    { label:'إجمالي الطلاب', value:'478', icon:'👨‍🎓', from:'#60a5fa', to:'#2563eb' },
    { label:'إجمالي المدرسين', value:'15', icon:'👨‍🏫', from:'#a78bfa', to:'#7c3aed' },
    { label:'الامتحانات المنشأة', value:'134', icon:'📝', from:'#4ade80', to:'#16a34a' },
    { label:'الفصول الدراسية', value:'14', icon:'🏫', from:'#fb923c', to:'#ea580c' },
    { label:'الأسئلة في البنك', value:'2,340', icon:'❓', from:'#f472b6', to:'#db2777' },
    { label:'النتائج المحفوظة', value:'18,720', icon:'📊', from:'#818cf8', to:'#4f46e5' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ borderRadius:'14px', padding:'20px', background:`linear-gradient(135deg,${s.from},${s.to})`, color:'white', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>{s.icon}</div>
            <div style={{ fontSize:'24px', fontWeight:'900' }}>{s.value}</div>
            <div style={{ fontSize:'12px', opacity:0.85, marginTop:'4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#1e293b', marginBottom:'16px' }}>💾 حالة قاعدة البيانات</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
          {[
            { label:'آخر نسخة احتياطية', value:'اليوم 3:00 ص', icon:'✅', bg:'#f0fdf4', color:'#15803d' },
            { label:'حجم البيانات', value:'~4.2 MB', icon:'📦', bg:'#f0fdf4', color:'#15803d' },
            { label:'حالة Firebase', value:'متصل وشغال', icon:'🟢', bg:'#f0fdf4', color:'#15803d' },
          ].map((item,i) => (
            <div key={i} style={{ padding:'16px', borderRadius:'12px', background:item.bg, border:'1px solid #bbf7d0', textAlign:'center' }}>
              <div style={{ fontSize:'24px', marginBottom:'8px' }}>{item.icon}</div>
              <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'4px' }}>{item.label}</div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id:'school' as Tab, label:'المدرسة', icon:'🏫' },
  { id:'roles' as Tab, label:'الأدوار', icon:'🔑' },
  { id:'security' as Tab, label:'الأمان', icon:'🔒' },
  { id:'system' as Tab, label:'النظام', icon:'⚙️' },
  { id:'stats' as Tab, label:'الإحصاليات', icon:'📊' },
];

export default function SystemAdmin() {
  const [activeTab, setActiveTab] = useState<Tab>('school');

  return (
    <div style={{ direction:'rtl', fontFamily:'Cairo, sans-serif', minHeight:'100%' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'linear-gradient(135deg,#475569,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>⚙️</div>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'900', color:'#1e293b', margin:0 }}>إدارة النظام</h1>
          <p style={{ fontSize:'13px', color:'#64748b', margin:0 }}>ضبط إعدادات المنصة والصلاحيات والأمان</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', overflowX:'auto', paddingBottom:'4px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 18px', borderRadius:'12px', border: activeTab===tab.id ? 'none' : '1px solid #e2e8f0', background: activeTab===tab.id ? '#1e293b' : 'white', color: activeTab===tab.id ? 'white' : '#475569', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Cairo, sans-serif', whiteSpace:'nowrap' }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab==='school' && <SchoolSettings />}
        {activeTab==='roles' && <RolesManagement />}
        {activeTab==='security' && <SecuritySettings />}
        {activeTab==='system' && <SystemSettings />}
        {activeTab==='stats' && <SystemStats />}
      </div>
    </div>
  );
}
