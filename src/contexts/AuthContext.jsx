import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * AuthContext — Contexto global de autenticação Firebase
 * 
 * Provê: user, loading, login, signup, logout
 * Observa mudanças de autenticação via onAuthStateChanged
 */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Observar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
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

  const value = { user, loading, login, signup, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
