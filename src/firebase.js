// ============================================================
// BIRGE — Firebase SDK Configuration
// ============================================================
// Вставьте сюда конфиг из Firebase Console:
// Project Settings → General → Your apps → Web app → firebaseConfig
// ИЛИ используйте переменные окружения в .env:
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   и т.д.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyDxQD4ZxPOYu-hdv22yBCIJr8Xj6GoZ0FY",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "birge-5c900.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "birge-5c900",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "birge-5c900.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "521408348706",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:521408348706:web:94a3dcba448517e8f3c07b",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-36R8BEM8GR",
};

// Инициализация Firebase App
const app = initializeApp(firebaseConfig);

// Сервисы Firebase
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const storage  = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // регион Cloud Functions

// Firebase Cloud Messaging (push-уведомления) — только в браузерах с поддержкой
export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export default app;
