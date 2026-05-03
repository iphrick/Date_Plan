import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * UsernameSetup — Modal para criação de username na primeira vez
 * Aparece após login/cadastro se o usuário ainda não definiu um username
 */
export default function UsernameSetup() {
  const { saveUsername } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();

    if (!trimmed) {
      setError('Digite um nome de usuário.');
      return;
    }

    if (trimmed.length < 2) {
      setError('O nome precisa ter pelo menos 2 caracteres.');
      return;
    }

    if (trimmed.length > 20) {
      setError('O nome pode ter no máximo 20 caracteres.');
      return;
    }

    // Permitir letras, números, espaços, _, -
    if (!/^[a-zA-ZÀ-ÿ0-9 _-]+$/.test(trimmed)) {
      setError('Use apenas letras, números, espaços, _ ou -');
      return;
    }

    setSaving(true);
    try {
      await saveUsername(trimmed);
    } catch (err) {
      console.error(err);
      setError(`Erro: ${err.message || 'Falha ao salvar'}`);
      setSaving(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-card__logo">
          <span className="auth-card__heart">👤</span>
          <h1 className="auth-card__title">Bem-vindo!</h1>
          <p className="auth-card__subtitle">
            Escolha um nome de usuário para ser identificado nos grupos
          </p>
        </div>

        {/* Form */}
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="username-input">
              ✨ Nome de Usuário
            </label>
            <input
              id="username-input"
              className="auth-card__input"
              type="text"
              placeholder="Ex: Pedro, Ana Maria, Love123"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={20}
              autoComplete="off"
            />
          </div>

          {/* Preview */}
          {name.trim() && (
            <div className="username-preview">
              <div className="username-preview__avatar">
                {name.trim()[0].toUpperCase()}
              </div>
              <span className="username-preview__name">{name.trim()}</span>
              <span className="username-preview__hint">— assim você aparecerá nos grupos</span>
            </div>
          )}

          {error && <div className="auth-card__error">{error}</div>}

          <button
            className="auth-card__submit"
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <span className="auth-card__spinner">⏳</span>
            ) : (
              '🚀 Começar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
