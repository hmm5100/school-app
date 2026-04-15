// scripts/migrateStudents.ts
// سكريبت لرفع بيانات الطلاب على Firestore مرة واحدة
// شغّله مرة واحدة بس: npx ts-node scripts/migrateStudents.ts
// بعدين احذف students.ts أو فرّغه من البيانات الحساسة

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { studentsData } from '../src/data/students';

// حط مسار الـ service account key بتاعك هنا
// حمّله من Firebase Console > Project Settings > Service Accounts
import serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function migrateStudents() {
  console.log(`🚀 بدء رفع ${studentsData.length} طالب على Firestore...`);

  const batchSize = 400; // Firestore batch limit هو 500
  let uploaded = 0;

  for (let i = 0; i < studentsData.length; i += batchSize) {
    const batch = db.batch();
    const chunk = studentsData.slice(i, i + batchSize);

    for (const student of chunk) {
      const docRef = db.collection('students').doc(student.nationalId);
      batch.set(docRef, {
        number:      student.number,
        name:        student.name,
        className:   student.className,
        nationalId:  student.nationalId,
        birthDate:   student.birthDate,
        createdAt:   new Date().toISOString(),
      });
    }

    await batch.commit();
    uploaded += chunk.length;
    console.log(`✅ تم رفع ${uploaded} / ${studentsData.length}`);
  }

  console.log('🎉 تم رفع كل الطلاب بنجاح!');
  console.log('');
  console.log('⚠️  الخطوة التالية:');
  console.log('   احذف البيانات الحساسة من src/data/students.ts');
  console.log('   واستخدم Firestore لجلب البيانات بدلاً منها');
}

migrateStudents().catch(console.error);
