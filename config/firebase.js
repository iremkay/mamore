import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_1Y1aIbLul-s2alg9rRAZUgDMkUaYG68",
  authDomain: "mamore-app.firebaseapp.com",
  projectId: "mamore-app",
  storageBucket: "mamore-app.firebasestorage.app",
  messagingSenderId: "700441211276",
  appId: "1:700441211276:web:38bf849da8ed10fe1c66a9",
  measurementId: "G-PD9ND3933M"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth, Firestore ve Storage servislerini export et
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
