// =====================================================================
// صفحة المستخدمون النشطون (self-contained)
// =====================================================================
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────
type UserStatus = "متصل الآن" | "غير متصل" | "داخل امتحان" | "يراجع النتائج";
type UserRole = "مدرس" | "طالب" | "مسؤول";

interface ActiveUser {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastSeen: Date;
  currentActivity?: string;
  avatar?: string;
  subject?: string;
  class?: string;
  examName?: string;
  loginTime: Date;
  sessionDuration: number;
}

// ─── Mock Data (استبدلها ببيانات Firebase الحقيقية) ──────────────────
const generateMockUsers = (): ActiveUser[] => {
  const now = new Date();
  const ago = (mins: number) => new Date(now.getTime() - mins * 60000);

  return [
    {
      id: "1",
      name: "أحمد محمد علي",
      role: "مدرس",
      status: "متصل الآن",
      lastSeen: ago(1),
      currentActivity: "يراجع نتائج امتحان الرياضيات",
      subject: "رياضيات",
      loginTime: ago(45),
      sessionDuration: 45,
    },
    {
      id: "2",
      name: "فاطمة حسن إبراهيم",
      role: "طالب",
      status: "داخل امتحان",
      lastSeen: ago(0),
      currentActivity: "امتحان العلوم - الفصل الثالث",
      class: "الثالث أ",
      examName: "امتحان العلوم الفصلي",
      loginTime: ago(30),
      sessionDuration: 30,
    },
    {
      id: "3",
      name: "محمود سعيد خالد",
      role: "طالب",
      status: "داخل امتحان",
      lastSeen: ago(0),
      currentActivity: "امتحان العلوم - الفصل الثالث",
      class: "الثالث أ",
      examName: "امتحان العلوم الفصلي",
      loginTime: ago(28),
      sessionDuration: 28,
    },
    {
      id: "4",
      name: "نورا أحمد مصطفى",
      role: "طالب",
      status: "يراجع النتائج",
      lastSeen: ago(3),
      currentActivity: "يراجع نتيجة امتحان اللغة العربية",
      class: "الثاني ب",
      loginTime: ago(60),
      sessionDuration: 60,
    },
    {
      id: "5",
      name: "د. سارة عبدالله",
      role: "مدرس",
      status: "متصل الآن",
      lastSeen: ago(2),
      currentActivity: "تصحيح أسئلة مقالية",
      subject: "لغة عربية",
      loginTime: ago(90),
      sessionDuration: 90,
    },
    {
      id: "6",
      name: "عمر طارق الزهراني",
      role: "طالب",
      status: "داخل امتحان",
      lastSeen: ago(0),
      currentActivity: "امتحان الرياضيات - الفصل الأول",
      class: "الأول أ",
      examName: "امتحان الرياضيات الشهري",
      loginTime: ago(15),
      sessionDuration: 15,
    },
    {
      id: "7",
      name: "منى إبراهيم سالم",
      role: "طالب",
      status: "غير متصل",
      lastSeen: ago(25),
      class: "الثاني أ",
      loginTime: ago(80),
      sessionDuration: 55,
    },
    {
      id: "8",
      name: "يوسف علي حسن",
      role: "مدرس",
      status: "غير متصل",
      lastSeen: ago(40),
      subject: "علوم",
      loginTime: ago(120),
      sessionDuration: 80,
    },
    {
      id: "9",
      name: "ريم محمد الشمري",
      role: "طالب",
      status: "داخل امتحان",
      lastSeen: ago(0),
      currentActivity: "امتحان الرياضيات - الفصل الأول",
      class: "الأول أ",
      examName: "امتحان الرياضيات الشهري",
      loginTime: ago(12),
      sessionDuration: 12,
    },
    {
      id: "10",
      name: "Admin - حمدي محمد",
      role: "مسؤول",
      status: "متصل الآن",
      lastSeen: ago(0),
      currentActivity: "يراجع لوحة المستخدمين النشطين",
      loginTime: ago(200),
      sessionDuration: 200,
    },
    {
      id: "11",
      name: "خالد سمير رضا",
      role: "طالب",
      status: "يراجع النتائج",
      lastSeen: ago(5),
      currentActivity: "يراجع نتيجة امتحان الرياضيات",
      class: "الأول ب",
      loginTime: ago(50),
      sessionDuration: 45,
    },
    {
      id: "12",
      name: "هناء عمر فاروق",
      role: "مدرس",
      status: "متصل الآن",
      lastSeen: ago(1),
      currentActivity: "إنشاء امتحان جديد",
      subject: "تاريخ",
      loginTime: ago(30),
      sessionDuration: 30,
    },
  ];
};

// ─── Helper Functions ─────────────────────────────────────────────────
const getStatusColor = (status: UserStatus) => {
  switch (status) {
    case "متصل الآن":
      return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
    case "داخل امتحان":
      return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
    case "يراجع النتائج":
      return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
    case "غير متصل":
      return { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" };
  }
};

const getStatusDot = (status: UserStatus) => {
  switch (status) {
    case "متصل الآن":
      return "#10b981";
    case "داخل امتحان":
      return "#3b82f6";
    case "يراجع النتائج":
      return "#f59e0b";
    case "غير متصل":
      return "#9ca3af";
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case "مسؤول":
      return { bg: "#f3e8ff", text: "#6b21a8" };
    case "مدرس":
      return { bg: "#e0e7ff", text: "#3730a3" };
    case "طالب":
      return { bg: "#ccfbf1", text: "#115e59" };
  }
};

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case "مسؤول":
      return "🛡️";
    case "مدرس":
      return "👨‍🏫";
    case "طالب":
      return "🎓";
  }
};

const formatLastSeen = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins === 0) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  return `منذ ${diffHours} ساعة`;
};

const formatSessionDuration = (mins: number) => {
  if (mins < 60) return `${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
};

const getInitials = (name: string) => {
  const parts = name.replace(/^(Admin - )/, "").split(" ");
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
};

const getAvatarColor = (id: string) => {
  const colors = [
    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
    "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
    "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
    "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
  ];
  return colors[parseInt(id) % colors.length];
};

// ─── Stat Card Component ──────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: number;
  icon: string;
  color: { bg: string; text: string };
  sub?: string;
}) => (
  <div
    style={{
      borderRadius: 16,
      padding: 20,
      backgroundColor: color.bg,
      color: color.text,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}
  >
    <div style={{ fontSize: 36 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 30, fontWeight: "bold" }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: "500", opacity: 0.8 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  </div>
);

// ─── User Row Component ───────────────────────────────────────────────
const UserRow = ({ user }: { user: ActiveUser }) => {
  const statusColor = getStatusColor(user.status);
  const roleColor = getRoleColor(user.role);
  
  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      {/* Avatar + Name */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: getAvatarColor(user.id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              {getInitials(user.name)}
            </div>
            <span
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid white",
                backgroundColor: getStatusDot(user.status),
                animation: user.status === "متصل الآن" || user.status === "داخل امتحان" ? "pulse 2s infinite" : "none",
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: "500", color: "#1f2937", fontSize: 14 }}>
              {user.name}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {user.subject || user.class || "—"}
            </div>
          </div>
        </div>
      </td>
      {/* Role */}
      <td style={{ padding: "12px 16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: "500",
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 20,
            backgroundColor: roleColor.bg,
            color: roleColor.text,
          }}
        >
          {getRoleIcon(user.role)} {user.role}
        </span>
      </td>
      {/* Status */}
      <td style={{ padding: "12px 16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: "500",
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 20,
            backgroundColor: statusColor.bg,
            color: statusColor.text,
            border: `1px solid ${statusColor.border}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: getStatusDot(user.status),
              animation: user.status === "متصل الآن" || user.status === "داخل امتحان" ? "pulse 2s infinite" : "none",
            }}
          />
          {user.status}
        </span>
      </td>
      {/* Activity */}
      <td style={{ padding: "12px 16px" }}>
        <div
          style={{
            fontSize: 12,
            color: "#4b5563",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.currentActivity || "—"}
        </div>
        {user.examName && (
          <div
            style={{
              fontSize: 12,
              color: "#3b82f6",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 220,
            }}
          >
            📝 {user.examName}
          </div>
        )}
      </td>
      {/* Last Seen */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
        {formatLastSeen(user.lastSeen)}
      </td>
      {/* Session */}
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
        {formatSessionDuration(user.sessionDuration)}
      </td>
    </tr>
  );
};

// ─── Main Component ───────────────────────────────────────────────────
export default function ActiveUsers() {
  const [users, setUsers] = useState<ActiveUser[]>(generateMockUsers());
  const [filterRole, setFilterRole] = useState<"الكل" | UserRole>("الكل");
  const [filterStatus, setFilterStatus] = useState<"الكل" | UserStatus>("الكل");
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(60);
  const [sortBy, setSortBy] = useState<"name" | "status" | "lastSeen">("status");

  const refresh = useCallback(() => {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        sessionDuration:
          u.status !== "غير متصل" ? u.sessionDuration + 1 : u.sessionDuration,
        lastSeen:
          u.status === "متصل الآن" || u.status === "داخل امتحان"
            ? new Date()
            : u.lastSeen,
      }))
    );
    setLastRefresh(new Date());
    setCountdown(60);
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(refresh, 60000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 60));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const filtered = users
    .filter((u) => {
      if (filterRole !== "الكل" && u.role !== filterRole) return false;
      if (filterStatus !== "الكل" && u.status !== filterStatus) return false;
      if (
        search &&
        !u.name.includes(search) &&
        !(u.subject?.includes(search) ?? false) &&
        !(u.class?.includes(search) ?? false)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ar");
      if (sortBy === "lastSeen")
        return b.lastSeen.getTime() - a.lastSeen.getTime();
      const priority: Record<UserStatus, number> = {
        "داخل امتحان": 0,
        "متصل الآن": 1,
        "يراجع النتائج": 2,
        "غير متصل": 3,
      };
      return priority[a.status] - priority[b.status];
    });

  // Stats
  const stats = {
    total: users.length,
    online: users.filter((u) => u.status === "متصل الآن").length,
    inExam: users.filter((u) => u.status === "داخل امتحان").length,
    reviewing: users.filter((u) => u.status === "يراجع النتائج").length,
    offline: users.filter((u) => u.status === "غير متصل").length,
    teachers: users.filter(
      (u) => u.role === "مدرس" && u.status !== "غير متصل"
    ).length,
    students: users.filter(
      (u) => u.role === "طالب" && u.status !== "غير متصل"
    ).length,
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        color: "#1e293b",
        padding: "16px 24px",
      }}
    >
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#1e293b",
              }}
            >
              🟢 المستخدمون النشطون
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              مدرسة الرواد الثانوية الفنية للتمريض بقنا
            </p>
          </div>
          {/* Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                backgroundColor: "white",
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
              }}
            >
              <span>آخر تحديث: </span>
              <span style={{ fontWeight: "500", color: "#4b5563" }}>
                {lastRefresh.toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
              <span>تحديث بعد </span>
              <span style={{ fontWeight: "bold", color: "#2563eb" }}>
                {countdown}ث
              </span>
            </div>
            <button
              onClick={refresh}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#2563eb",
                color: "white",
                fontSize: 14,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
              }}
            >
              🔄 تحديث الآن
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="متصل الآن"
          value={stats.online}
          icon="🟢"
          color={{ bg: "#dcfce7", text: "#166534" }}
          sub={`${stats.teachers} مدرس • ${stats.students} طالب`}
        />
        <StatCard
          label="داخل امتحان"
          value={stats.inExam}
          icon="📝"
          color={{ bg: "#dbeafe", text: "#1e3a8a" }}
        />
        <StatCard
          label="يراجع النتائج"
          value={stats.reviewing}
          icon="👁️"
          color={{ bg: "#fef3c7", text: "#92400e" }}
        />
        <StatCard
          label="غير متصل"
          value={stats.offline}
          icon="⚫"
          color={{ bg: "#f3f4f6", text: "#374151" }}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder="🔍 ابحث بالاسم أو الفصل أو المادة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) =>
                setFilterRole(e.target.value as typeof filterRole)
              }
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                backgroundColor: "#f9fafb",
                outline: "none",
              }}
            >
              <option value="الكل">كل الأدوار</option>
              <option value="مسؤول">مسؤول</option>
              <option value="مدرس">مدرسين</option>
              <option value="طالب">طلاب</option>
            </select>
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                backgroundColor: "#f9fafb",
                outline: "none",
              }}
            >
              <option value="الكل">كل الحالات</option>
              <option value="متصل الآن">متصل الآن</option>
              <option value="داخل امتحان">داخل امتحان</option>
              <option value="يراجع النتائج">يراجع النتائج</option>
              <option value="غير متصل">غير متصل</option>
            </select>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                backgroundColor: "#f9fafb",
                outline: "none",
              }}
            >
              <option value="status">ترتيب بالحالة</option>
              <option value="name">ترتيب بالاسم</option>
              <option value="lastSeen">ترتيب بآخر نشاط</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
          يُعرض {filtered.length} من {users.length} مستخدم
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14 }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  المستخدم
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  الدور
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  الحالة
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  النشاط الحالي
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  آخر ظهور
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  مدة الجلسة
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "48px 0",
                      color: "#9ca3af",
                      fontSize: 14,
                    }}
                  >
                    لا يوجد مستخدمون مطابقون للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((user) => <UserRow key={user.id} user={user} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Exams Summary */}
      {users.filter((u) => u.status === "داخل امتحان").length > 0 && (
        <div
          style={{
            marginTop: 16,
            backgroundColor: "#dbeafe",
            border: "1px solid #bfdbfe",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h3
            style={{
              fontWeight: "600",
              color: "#1e40af",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            📝 الامتحانات الجارية الآن
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Array.from(
              new Set(users.filter((u) => u.examName).map((u) => u.examName!))
            ).map((examName) => {
              const count = users.filter((u) => u.examName === examName).length;
              return (
                <div
                  key={examName}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #bfdbfe",
                    borderRadius: 12,
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 8,
                    paddingBottom: 8,
                    fontSize: 12,
                    color: "#1e40af",
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{examName}</span>
                  <span
                    style={{
                      marginRight: 8,
                      backgroundColor: "#dbeafe",
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 2,
                      paddingBottom: 2,
                      borderRadius: 20,
                      fontWeight: "bold",
                    }}
                  >
                    {count} طالب
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        يتم التحديث التلقائي كل دقيقة • Mr.Hamdy Mohamed
      </div>
    </div>
  );
}
