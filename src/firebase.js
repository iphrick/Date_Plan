/**
 * firebase.js — Firebase Authentication Configuration
 * 
 * Inicializa APENAS o Firebase Auth (sem Firestore/Realtime Database).
 * Credenciais vêm de variáveis de ambiente (VITE_FIREBASE_*).
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Inicializar apenas se ainda não existe (evita erro em HMR/StrictMode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);

// Persistir sessão no localStorage do navegador
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Erro ao configurar persistência do Firebase Auth:', err);
});

export { auth };
export default app;
