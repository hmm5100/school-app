// src/data/students.ts
// ⚠️  تم نقل بيانات الطلاب إلى Firestore
// استخدم studentService.ts لجلب البيانات

export interface StudentRecord {
  number:     number;
  name:       string;
  className:  string;
  nationalId: string;
  birthDate:  string; // DD/MM/YYYY
}

export const classesData = [
  { id: "1_1_boys",  name: "1/1 بنين",  grade: "الأول", section: "1", gender: "بنين"  as const },
  { id: "1_1_girls", name: "1/1 فتيات", grade: "الأول", section: "1", gender: "فتيات" as const },
  { id: "1_2_boys",  name: "1/2 بنين",  grade: "الأول", section: "2", gender: "بنين"  as const },
  { id: "1_2_girls", name: "1/2 فتيات", grade: "الأول", section: "2", gender: "فتيات" as const },
  { id: "1_3_boys",  name: "1/3 بنين",  grade: "الأول", section: "3", gender: "بنين"  as const },
  { id: "1_3_girls", name: "1/3 فتيات", grade: "الأول", section: "3", gender: "فتيات" as const },
  { id: "1_4_boys",  name: "1/4 بنين",  grade: "الأول", section: "4", gender: "بنين"  as const },
  { id: "1_4_girls", name: "1/4 فتيات", grade: "الأول", section: "4", gender: "فتيات" as const },
  { id: "1_5_boys",  name: "1/5 بنين",  grade: "الأول", section: "5", gender: "بنين"  as const },
  { id: "1_5_girls", name: "1/5 فتيات", grade: "الأول", section: "5", gender: "فتيات" as const },
  { id: "1_6_boys",  name: "1/6 بنين",  grade: "الأول", section: "6", gender: "بنين"  as const },
  { id: "1_6_girls", name: "1/6 فتيات", grade: "الأول", section: "6", gender: "فتيات" as const },
  { id: "1_7_boys",  name: "1/7 بنين",  grade: "الأول", section: "7", gender: "بنين"  as const },
  { id: "1_8_boys",  name: "1/8 بنين",  grade: "الأول", section: "8", gender: "بنين"  as const },
];

export const studentCountByClass: Record<string, number> = {
  "1/1 بنين":  35,
  "1/1 فتيات": 34,
  "1/2 بنين":  35,
  "1/2 فتيات": 35,
  "1/3 بنين":  36,
  "1/3 فتيات": 34,
  "1/4 بنين":  37,
  "1/4 فتيات": 34,
  "1/5 بنين":  37,
  "1/5 فتيات": 34,
  "1/6 بنين":  37,
  "1/6 فتيات": 17,
  "1/7 بنين":  36,
  "1/8 بنين":  37,
};

export const totalStudents = 478;
export const totalClasses  = 14;

// البيانات اتنقلت لـ Firestore — استخدم:
// import { studentService } from '@/services/studentService';
// const students = await studentService.getStudentsByClass(className);
