// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            "AIzaSyCjPeZ09Dv8q9asALk71bzeAeSiYUXPvZA",
  authDomain:        "school-exams-app.firebaseapp.com",
  projectId:         "school-exams-app",
  storageBucket:     "school-exams-app.firebasestorage.app",
  messagingSenderId: "559973195647",
  appId:             "1:559973195647:web:f15e289f5e770ad72ac44a",
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export default app;
