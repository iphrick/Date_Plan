import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthScreen — Tela fullscreen de Login/Cadastro
 * Visual dark mode consistente com o app DATE PLAN
 */
export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const translateError = (code) => {
    const errors = {
      'auth/invalid-email': 'Email inválido.',
      'auth/user-disabled': 'Esta conta foi desativada.',
      'auth/user-not-found': 'Nenhuma conta encontrada com este email.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'Email ou senha incorretos.',
      'auth/email-already-in-use': 'Este email já está em uso.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
    };
    return errors[code] || 'Ocorreu um erro. Tente novamente.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signup(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // onAuthStateChanged no AuthContext cuidará da navegação
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-card__logo">
          <span className="auth-card__heart">❤️</span>
          <h1 className="auth-card__title">DATE PLAN</h1>
          <p className="auth-card__subtitle">Planeje seus encontros especiais</p>
        </div>

        {/* Formulário */}
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="auth-email">📧 Email</label>
            <input
              id="auth-email"
              className="auth-card__input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="auth-password">🔒 Senha</label>
            <input
              id="auth-password"
              className="auth-card__input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignup && (
            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="auth-confirm">🔒 Confirmar Senha</label>
              <input
                id="auth-confirm"
                className="auth-card__input"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="auth-card__error">{error}</div>}

          <button
            className="auth-card__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-card__spinner">⏳</span>
            ) : isSignup ? (
              '✨ Criar Conta'
            ) : (
              '🚀 Entrar'
            )}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="auth-card__toggle">
          <span className="auth-card__toggle-text">
            {isSignup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
          </span>
          <button className="auth-card__toggle-btn" onClick={toggleMode} type="button">
            {isSignup ? 'Fazer Login' : 'Criar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
