// src/pages/StudentExam.tsx
// يوجه لـ TakeExam لأنها الصفحة الفعلية لأداء الامتحان
import { useParams, Navigate } from 'react-router-dom';

export default function StudentExam() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/exams" replace />;
  return <Navigate to={`/exams/${id}/take`} replace />;
}
