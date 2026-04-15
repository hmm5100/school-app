// src/utils/normalizeArabic.ts
// =====================================================
// تطبيع النص العربي للبحث المرن في أسماء الطلاب
// يعالج: الهمزات، الألف المقصورة، التاء المربوطة،
//         المسافات الزائدة، التشكيل
// =====================================================

/**
 * تحوّل أي نص عربي لصيغة موحّدة للمقارنة
 * مثال: "أحمد" = "احمد" = "اَحمَد" كلهم نفس الشيء
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    // إزالة التشكيل الكامل
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // توحيد كل أشكال الهمزة والألف → ا
    .replace(/[أإآءؤئ]/g, 'ا')
    // توحيد الألف المقصورة → ي
    .replace(/ى/g, 'ي')
    // إزالة كل المسافات للمقارنة (عبد السميع = عبدالسميع)
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * تقارن اسمين عربيين بشكل مرن
 */
export function namesMatch(nameA: string, nameB: string): boolean {
  return normalizeArabic(nameA) === normalizeArabic(nameB);
}

/**
 * ابحث عن طالب بالاسم بشكل مرن من قائمة
 */
export function findStudentByName<T extends { name: string }>(
  students: T[],
  searchName: string
): T | undefined {
  const normalized = normalizeArabic(searchName);
  return students.find(s => normalizeArabic(s.name) === normalized);
}
