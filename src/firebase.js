/**
 * firebase.js — Firebase Auth + Firestore Configuration
 * 
 * Auth: Login/Cadastro com email e senha
 * Firestore: Armazenamento de grupos (compartilhado entre usuários)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Inicializar apenas se ainda não existe (evita erro em HMR/StrictMode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

// Persistir sessão no localStorage do navegador
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Erro ao configurar persistência do Firebase Auth:', err);
});

export { auth, db };
export default app;
