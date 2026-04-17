// src/pages/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { Trophy, Award, Medal, TrendingUp, Star, Crown, Users, BookOpen } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Grade } from '../types';

// ─── Types ───────────────────────────────────
interface TopStudent {
  studentId: string;
  studentName: string;
  className: string;
  totalExams: number;
  averagePercentage: number;
  averageScore: number;
  highestScore: number;
  rank: number;
}

interface SubjectLeader {
  studentId: string;
  studentName: string;
  className: string;
  averagePercentage: number;
  examCount: number;
}

interface SubjectLeaderboard {
  subjectId: string;
  subjectName: string;
  leaders: SubjectLeader[];
}

const Leaderboard = () => {
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [subjectLeaderboards, setSubjectLeaderboards] = useState<SubjectLeaderboard[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        // 1. جلب كل الدرجات
        const gradesSnap = await getDocs(collection(db, 'grades'));
        const grades: Grade[] = gradesSnap.docs.map(doc => ({
          ...(doc.data() as Omit<Grade, 'id'>),
          id: doc.id,
        }));

        if (grades.length === 0) {
          setLoading(false);
          return;
        }

        // 2. تجميع الطلاب
        const studentMap = new Map<string, {
          studentId: string;
          studentName: string;
          className: string;
          totalPercentage: number;
          totalScore: number;
          examCount: number;
          highestScore: number;
        }>();

        grades.forEach(grade => {
          if (!studentMap.has(grade.studentId)) {
            studentMap.set(grade.studentId, {
              studentId: grade.studentId,
              studentName: grade.studentName,
              className: grade.classId, // سيتم تحديثه
              totalPercentage: 0,
              totalScore: 0,
              examCount: 0,
              highestScore: 0,
            });
          }

          const student = studentMap.get(grade.studentId)!;
          student.totalPercentage += grade.percentage;
          student.totalScore += grade.score;
          student.examCount++;
          if (grade.score > student.highestScore) {
            student.highestScore = grade.score;
          }
        });

        // 3. جلب أسماء الفصول
        const classesSnap = await getDocs(collection(db, 'classes'));
        const classNamesMap = new Map(
          classesSnap.docs.map(doc => [doc.id, doc.data().name || 'غير محدد'])
        );

        // 4. بناء قائمة أفضل الطلاب
        const topList: TopStudent[] = Array.from(studentMap.values())
          .map(student => ({
            studentId: student.studentId,
            studentName: student.studentName,
            className: classNamesMap.get(student.className) || 'غير محدد',
            totalExams: student.examCount,
            averagePercentage: Math.round((student.totalPercentage / student.examCount) * 100) / 100,
            averageScore: Math.round((student.totalScore / student.examCount) * 100) / 100,
            highestScore: student.highestScore,
            rank: 0, // سيتم حسابه
          }))
          .sort((a, b) => b.averagePercentage - a.averagePercentage)
          .slice(0, 20); // أفضل 20 طالب

        // ترتيب
        topList.forEach((student, idx) => {
          student.rank = idx + 1;
        });

        setTopStudents(topList);

        // 5. لوحة الشرف حسب المواد
        const subjectMap = new Map<string, {
          subjectName: string;
          students: Map<string, {
            studentId: string;
            studentName: string;
            className: string;
            totalPercentage: number;
            examCount: number;
          }>;
        }>();

        grades.forEach(grade => {
          if (!subjectMap.has(grade.subjectId)) {
            subjectMap.set(grade.subjectId, {
              subjectName: grade.subjectName,
              students: new Map(),
            });
          }

          const subject = subjectMap.get(grade.subjectId)!;

          if (!subject.students.has(grade.studentId)) {
            subject.students.set(grade.studentId, {
              studentId: grade.studentId,
              studentName: grade.studentName,
              className: classNamesMap.get(grade.classId) || 'غير محدد',
              totalPercentage: 0,
              examCount: 0,
            });
          }

          const student = subject.students.get(grade.studentId)!;
          student.totalPercentage += grade.percentage;
          student.examCount++;
        });

        const subjectLeaders: SubjectLeaderboard[] = Array.from(subjectMap.entries()).map(([subjectId, data]) => {
          const leaders = Array.from(data.students.values())
            .map(student => ({
              studentId: student.studentId,
              studentName: student.studentName,
              className: student.className,
              averagePercentage: Math.round((student.totalPercentage / student.examCount) * 100) / 100,
              examCount: student.examCount,
            }))
            .sort((a, b) => b.averagePercentage - a.averagePercentage)
            .slice(0, 3); // أفضل 3 طلاب في كل مادة

          return {
            subjectId,
            subjectName: data.subjectName,
            leaders,
          };
        });

        setSubjectLeaderboards(subjectLeaders);
      } catch (err) {
        console.error('خطأ في تحميل لوحة الشرف:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  // ═══ Medal Icon ═══
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={22} color="#C0C0C0" />;
    if (rank === 3) return <Medal size={20} color="#CD7F32" />;
    return <Star size={18} color="#94a3b8" />;
  };

  // ═══ Medal Color ═══
  const getMedalColor = (rank: number) => {
    if (rank === 1) return { bg: '#fffbeb', border: '#fde68a', text: '#92400e' };
    if (rank === 2) return { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' };
    if (rank === 3) return { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' };
    return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2555a0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل لوحة الشرف...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (topStudents.length === 0) {
    return (
      <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f2244', marginBottom: '24px' }}>
          لوحة الشرف 🏆
        </h1>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 24px',
          textAlign: 'center',
          border: '1px solid #f0f4f8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Trophy size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2244', marginBottom: '8px' }}>
            لا توجد بيانات متاحة بعد
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            لم يتم تسجيل أي درجات حتى الآن. قم بتصحيح بعض الامتحانات لعرض أفضل الطلاب.
          </p>
        </div>
      </div>
    );
  }

  const filteredBySubject = selectedSubject === 'all'
    ? null
    : subjectLeaderboards.find(s => s.subjectId === selectedSubject);

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f2244', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trophy size={32} color="#FFD700" />
          لوحة الشرف
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          الطلاب الأوائل حسب المعدل التراكمي في جميع الامتحانات
        </p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
          عرض حسب المادة
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: 'Cairo, sans-serif',
            color: '#1a202c',
            background: 'white',
            cursor: 'pointer',
            minWidth: '250px',
          }}
        >
          <option value="all">جميع المواد (الترتيب العام)</option>
          {subjectLeaderboards.map(subject => (
            <option key={subject.subjectId} value={subject.subjectId}>
              {subject.subjectName}
            </option>
          ))}
        </select>
      </div>

      {/* Top 3 Podium */}
      {selectedSubject === 'all' && topStudents.length >= 3 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {/* 2nd Place */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            border: '2px solid #cbd5e1',
            minWidth: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ marginBottom: '12px' }}>
              <Medal size={48} color="#C0C0C0" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244', marginBottom: '4px' }}>
              {topStudents[1].studentName}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              {topStudents[1].className}
            </p>
            <div style={{
              background: '#f8fafc',
              padding: '8px',
              borderRadius: '8px',
              marginBottom: '8px',
            }}>
              <p style={{ fontSize: '24px', fontWeight: '900', color: '#475569' }}>
                {topStudents[1].averagePercentage}%
              </p>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>
              {topStudents[1].totalExams} امتحان
            </p>
          </div>

          {/* 1st Place */}
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderRadius: '20px',
            padding: '32px 24px',
            textAlign: 'center',
            border: '3px solid #fde68a',
            minWidth: '200px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transform: 'scale(1.05)',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Crown size={56} color="#FFD700" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#92400e', marginBottom: '4px' }}>
              {topStudents[0].studentName}
            </h3>
            <p style={{ fontSize: '13px', color: '#78350f', marginBottom: '12px' }}>
              {topStudents[0].className}
            </p>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '12px',
              border: '2px solid #fde68a',
            }}>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#92400e' }}>
                {topStudents[0].averagePercentage}%
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#78350f', fontWeight: '600' }}>
              {topStudents[0].totalExams} امتحان
            </p>
          </div>

          {/* 3rd Place */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            border: '2px solid #fed7aa',
            minWidth: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ marginBottom: '12px' }}>
              <Medal size={48} color="#CD7F32" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244', marginBottom: '4px' }}>
              {topStudents[2].studentName}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              {topStudents[2].className}
            </p>
            <div style={{
              background: '#fff7ed',
              padding: '8px',
              borderRadius: '8px',
              marginBottom: '8px',
            }}>
              <p style={{ fontSize: '24px', fontWeight: '900', color: '#9a3412' }}>
                {topStudents[2].averagePercentage}%
              </p>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>
              {topStudents[2].totalExams} امتحان
            </p>
          </div>
        </div>
      )}

      {/* Full List or Subject Leaders */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #f0f4f8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {selectedSubject === 'all' ? (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', marginBottom: '20px' }}>
              الترتيب الكامل
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topStudents.map(student => {
                const colors = getMedalColor(student.rank);
                return (
                  <div
                    key={student.studentId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 16px',
                      background: colors.bg,
                      borderRadius: '12px',
                      border: `1.5px solid ${colors.border}`,
                    }}
                  >
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {getMedalIcon(student.rank)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2244' }}>
                          {student.rank}. {student.studentName}
                        </h4>
                        <p style={{ fontSize: '20px', fontWeight: '900', color: colors.text }}>
                          {student.averagePercentage}%
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <span>{student.className}</span>
                        <span>• {student.totalExams} امتحان</span>
                        <span>• أعلى درجة: {student.highestScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : filteredBySubject ? (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2244', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} />
              {filteredBySubject.subjectName}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredBySubject.leaders.map((leader, idx) => {
                const rank = idx + 1;
                const colors = getMedalColor(rank);
                return (
                  <div
                    key={leader.studentId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: colors.bg,
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                    }}
                  >
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {getMedalIcon(rank)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2244', marginBottom: '4px' }}>
                        {leader.studentName}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b' }}>
                        {leader.className} • {leader.examCount} امتحان
                      </p>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '28px', fontWeight: '900', color: colors.text }}>
                        {leader.averagePercentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Leaderboard;
