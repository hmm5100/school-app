// src/services/excelService.ts
// استيراد بيانات الطلاب والدرجات من ملفات Excel (دعم أكثر من ملف مرة واحدة)

import * as XLSX from 'xlsx';
import type { Student, Grade } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ImportedStudentRow {
  number: number;
  name: string;
  className: string;
  nationalId?: string;
  phone?: string;
  email?: string;
}

export interface ImportedGradeRow {
  studentName: string;
  studentNumber?: number;
  className: string;
  subjectName: string;
  score: number;
  totalScore: number;
}

export interface ExcelImportResult {
  fileName: string;
  students: ImportedStudentRow[];
  grades: ImportedGradeRow[];
  errors: string[];
  warnings: string[];
  sheetNames: string[];
}

export interface MultiFileImportResult {
  results: ExcelImportResult[];
  totalStudents: number;
  totalGrades: number;
  totalErrors: number;
}

// ─────────────────────────────────────────────
// Read a single Excel file (File object from input)
// ─────────────────────────────────────────────
export const readExcelFile = (file: File): Promise<ExcelImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const result: ExcelImportResult = {
      fileName: file.name,
      students: [],
      grades: [],
      errors: [],
      warnings: [],
      sheetNames: [],
    };

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        result.sheetNames = workbook.SheetNames;

        // Try each sheet
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            raw: false,
          });

          if (rows.length === 0) {
            result.warnings.push(`الشيت "${sheetName}" فارغ`);
            continue;
          }

          // Detect sheet type by column headers
          const headers = Object.keys(rows[0] || {}).map(h => h.trim().toLowerCase());
          const isGradeSheet = headers.some(h =>
            h.includes('درجة') || h.includes('score') || h.includes('grade') || h.includes('مادة') || h.includes('subject'),
          );
          const isStudentSheet =
            !isGradeSheet &&
            (headers.some(h => h.includes('اسم') || h.includes('name') || h.includes('رقم')));

          if (isStudentSheet) {
            parseStudentSheet(rows, sheetName, result);
          } else if (isGradeSheet) {
            parseGradeSheet(rows, sheetName, result);
          } else {
            // Try student parsing as default
            parseStudentSheet(rows, sheetName, result);
          }
        }
      } catch (err: unknown) {
        result.errors.push(`خطأ في قراءة الملف: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      }

      resolve(result);
    };

    reader.onerror = () => {
      result.errors.push('فشل في قراءة الملف');
      resolve(result);
    };

    reader.readAsArrayBuffer(file);
  });
};

// ─────────────────────────────────────────────
// Parse student rows from a sheet
// ─────────────────────────────────────────────
function parseStudentSheet(
  rows: Record<string, unknown>[],
  sheetName: string,
  result: ExcelImportResult,
) {
  let parsed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)

    // Normalize keys: lowercase, trim
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.trim().toLowerCase()] = String(v ?? '').trim();
    }

    // Extract name — try multiple possible column names
    const name =
      normalized['اسم الطالب'] ||
      normalized['الاسم'] ||
      normalized['اسم'] ||
      normalized['name'] ||
      normalized['student name'] ||
      normalized['student_name'] ||
      '';

    if (!name) {
      skipped++;
      continue;
    }

    // Extract class
    const className =
      normalized['الفصل'] ||
      normalized['فصل'] ||
      normalized['class'] ||
      normalized['classname'] ||
      normalized['class name'] ||
      normalized['فصل دراسي'] ||
      '';

    // Extract number
    const numberRaw =
      normalized['رقم'] ||
      normalized['م'] ||
      normalized['number'] ||
      normalized['no'] ||
      normalized['رقم الكشف'] ||
      '';
    const number = parseInt(numberRaw, 10) || (i + 1);

    // Extract optional fields
    const nationalId =
      normalized['الرقم القومي'] ||
      normalized['رقم قومي'] ||
      normalized['national id'] ||
      normalized['national_id'] ||
      '';
    const phone =
      normalized['الهاتف'] ||
      normalized['رقم الهاتف'] ||
      normalized['phone'] ||
      normalized['mobile'] ||
      '';
    const email =
      normalized['البريد الإلكتروني'] ||
      normalized['email'] ||
      '';

    if (!className) {
      result.warnings.push(`صف ${rowNum} (شيت: ${sheetName}): الطالب "${name}" بدون فصل — سيتم تجاهله`);
      skipped++;
      continue;
    }

    result.students.push({ number, name, className, nationalId, phone, email });
    parsed++;
  }

  if (parsed === 0 && skipped > 0) {
    result.warnings.push(`شيت "${sheetName}": لم يتم استيراد أي طالب (${skipped} صف تجاهل)`);
  } else {
    result.warnings.push(`شيت "${sheetName}": تم استيراد ${parsed} طالب${skipped > 0 ? ` (تجاهل ${skipped})` : ''}`);
  }
}

// ─────────────────────────────────────────────
// Parse grade rows from a sheet
// ─────────────────────────────────────────────
function parseGradeSheet(
  rows: Record<string, unknown>[],
  sheetName: string,
  result: ExcelImportResult,
) {
  let parsed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.trim().toLowerCase()] = String(v ?? '').trim();
    }

    const studentName =
      normalized['اسم الطالب'] || normalized['الاسم'] || normalized['اسم'] || normalized['name'] || '';
    const className =
      normalized['الفصل'] || normalized['فصل'] || normalized['class'] || '';
    const subjectName =
      normalized['المادة'] || normalized['مادة'] || normalized['subject'] || '';
    const scoreRaw =
      normalized['الدرجة'] || normalized['درجة'] || normalized['score'] || normalized['grade'] || '';
    const totalRaw =
      normalized['الدرجة الكلية'] || normalized['total'] || normalized['total score'] || '100';

    if (!studentName || !subjectName || !scoreRaw) {
      skipped++;
      continue;
    }

    const score = parseFloat(scoreRaw);
    const totalScore = parseFloat(totalRaw) || 100;

    if (isNaN(score)) {
      result.warnings.push(`صف ${rowNum}: درجة غير صحيحة للطالب "${studentName}"`);
      skipped++;
      continue;
    }

    const numberRaw =
      normalized['رقم'] || normalized['م'] || normalized['no'] || normalized['number'] || '';
    const studentNumber = parseInt(numberRaw, 10) || undefined;

    result.grades.push({ studentName, studentNumber, className, subjectName, score, totalScore });
    parsed++;
  }

  if (parsed > 0 || skipped > 0) {
    result.warnings.push(
      `شيت "${sheetName}": تم استيراد ${parsed} درجة${skipped > 0 ? ` (تجاهل ${skipped})` : ''}`,
    );
  }
}

// ─────────────────────────────────────────────
// Import multiple Excel files at once
// ─────────────────────────────────────────────
export const readMultipleExcelFiles = async (
  files: FileList | File[],
): Promise<MultiFileImportResult> => {
  const fileArray = Array.from(files);
  const results: ExcelImportResult[] = [];

  for (const file of fileArray) {
    const result = await readExcelFile(file);
    results.push(result);
  }

  return {
    results,
    totalStudents: results.reduce((s, r) => s + r.students.length, 0),
    totalGrades: results.reduce((s, r) => s + r.grades.length, 0),
    totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
  };
};

// ─────────────────────────────────────────────
// Convert imported rows to Student objects
// ─────────────────────────────────────────────
export const importedRowsToStudents = (rows: ImportedStudentRow[]): Omit<Student, 'id'>[] => {
  return rows.map(row => ({
    name: row.name,
    classId: row.className.replace(/\s/g, '_'),
    className: row.className,
    number: row.number,
    nationalId: row.nationalId || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    createdAt: new Date(),
  }));
};

// ─────────────────────────────────────────────
// Convert imported grade rows to Grade objects
// ─────────────────────────────────────────────
export const importedRowsToGrades = (
  rows: ImportedGradeRow[],
  teacherId: string,
): Omit<Grade, 'id'>[] => {
  return rows.map(row => {
    const percentage = Math.round((row.score / row.totalScore) * 100);
    const gradeLabel =
      percentage >= 90 ? 'A+' :
      percentage >= 85 ? 'A' :
      percentage >= 80 ? 'B+' :
      percentage >= 75 ? 'B' :
      percentage >= 70 ? 'C+' :
      percentage >= 65 ? 'C' :
      percentage >= 60 ? 'D' : 'F';

    return {
      studentId: '',           // will be resolved when saving
      studentName: row.studentName,
      classId: row.className.replace(/\s/g, '_'),
      subjectId: '',           // will be resolved when saving
      subjectName: row.subjectName,
      score: row.score,
      totalScore: row.totalScore,
      percentage,
      grade: gradeLabel,
      teacherId,
      createdAt: new Date(),
    };
  });
};

// ─────────────────────────────────────────────
// Export students to Excel (for download)
// ─────────────────────────────────────────────
export const exportStudentsToExcel = (students: Student[], fileName = 'students.xlsx'): void => {
  const data = students.map(s => ({
    'م': s.number,
    'اسم الطالب': s.name,
    'الفصل': s.className,
    'الرقم القومي': s.nationalId || '',
    'الهاتف': s.phone || '',
    'البريد الإلكتروني': s.email || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');

  // Auto column widths
  const cols = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }];
  ws['!cols'] = cols;

  XLSX.writeFile(wb, fileName);
};

// ─────────────────────────────────────────────
// Export grades to Excel
// ─────────────────────────────────────────────
export const exportGradesToExcel = (grades: Grade[], fileName = 'grades.xlsx'): void => {
  const data = grades.map(g => ({
    'اسم الطالب': g.studentName,
    'الفصل': g.classId,
    'المادة': g.subjectName,
    'الدرجة': g.score,
    'الدرجة الكلية': g.totalScore,
    'النسبة %': g.percentage,
    'التقدير': g.grade,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الدرجات');

  const cols = [{ wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  ws['!cols'] = cols;

  XLSX.writeFile(wb, fileName);
};

// ─────────────────────────────────────────────
// Generate Excel template for student import
// ─────────────────────────────────────────────
export const downloadStudentTemplate = (): void => {
  const template = [
    { 'م': 1, 'اسم الطالب': 'احمد محمد عبدالله', 'الفصل': '1/1 بنين', 'الرقم القومي': '30501011234567', 'الهاتف': '01012345678', 'البريد الإلكتروني': '' },
    { 'م': 2, 'اسم الطالب': 'محمد علي حسن', 'الفصل': '1/1 بنين', 'الرقم القومي': '', 'الهاتف': '', 'البريد الإلكتروني': '' },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');

  ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }];

  XLSX.writeFile(wb, 'template_students.xlsx');
};

// ─────────────────────────────────────────────
// Generate Excel template for grades import
// ─────────────────────────────────────────────
export const downloadGradesTemplate = (): void => {
  const template = [
    { 'اسم الطالب': 'احمد محمد عبدالله', 'الفصل': '1/1 بنين', 'المادة': 'علم التشريح', 'الدرجة': 85, 'الدرجة الكلية': 100 },
    { 'اسم الطالب': 'محمد علي حسن',      'الفصل': '1/1 بنين', 'المادة': 'علم التشريح', 'الدرجة': 90, 'الدرجة الكلية': 100 },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الدرجات');

  ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 14 }];

  XLSX.writeFile(wb, 'template_grades.xlsx');
};
