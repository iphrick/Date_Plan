import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * AuthContext — Contexto global de autenticação Firebase
 * 
 * Provê: user, loading, login, signup, logout, username, setUsername
 * Observa mudanças de autenticação via onAuthStateChanged
 * Busca/salva username no Firestore (collection: users)
 */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [username, setUsernameState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Buscar username do Firestore
  const fetchUsername = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists() && userDoc.data().username) {
        setUsernameState(userDoc.data().username);
        return userDoc.data().username;
      }
    } catch (e) {
      console.warn('Erro ao buscar username:', e);
    }
    return null;
  };

  // Salvar username no Firestore
  const saveUsername = async (newUsername) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        username: newUsername.trim(),
        email: user.email,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUsernameState(newUsername.trim());
    } catch (e) {
      console.error('Erro ao salvar username:', e);
      throw e;
    }
  };

  // Observar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
        await fetchUsername(firebaseUser.uid);
      } else {
        setUser(null);
        setUsernameState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login com email e senha
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Cadastro com email e senha
  const signup = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Logout
  const logout = async () => {
    return signOut(auth);
  };

  const value = { user, username, loading, login, signup, logout, saveUsername };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
