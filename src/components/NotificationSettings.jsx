import React, { useState, useEffect } from 'react';
import { sendTestEmail, requestBrowserPermission } from '../utils/notificationService';

/**
 * NotificationSettings — Modal de configurações de notificação
 * Agora simplificado: Chaves ficam no .env, usuário só fornece email
 */
export default function NotificationSettings({ isOpen, onClose, settings, onSaveSettings }) {
  const [formData, setFormData] = useState({
    email: '',
    userName: '',
    emailEnabled: false,
  });
  const [testStatus, setTestStatus] = useState(''); // '', 'sending', 'success', 'error'
  const [browserPermission, setBrowserPermission] = useState('default');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: settings?.email || '',
        userName: settings?.userName || '',
        emailEnabled: settings?.emailEnabled || false,
      });
      setTestStatus('');
      if ('Notification' in window) setBrowserPermission(Notification.permission);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const handleRequestPermission = async () => {
    const result = await requestBrowserPermission();
    setBrowserPermission(result);
  };

  const handleTestEmail = async () => {
    if (!formData.email) {
      setTestStatus('error');
      return;
    }
    setTestStatus('sending');
    try {
      await sendTestEmail({ ...settings, ...formData });
      setTestStatus('success');
    } catch (err) {
      console.error(err);
      setTestStatus('error');
    }
  };

  const isFirebaseActive = !!import.meta.env.VITE_FIREBASE_API_KEY;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal notif-settings">
        <div className="modal__header">
          <h2 className="modal__title">🔔 Notificações</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {/* Browser Notifications */}
          <div className="notif-section">
            <div className="notif-section__header">
              <span className="notif-section__icon">🌐</span>
              <div>
                <h3 className="notif-section__title">Notificações do Navegador</h3>
                <p className="notif-section__desc">Receba lembretes locais no navegador</p>
              </div>
            </div>
            <div className="notif-section__status">
              {browserPermission === 'granted' ? (
                <span className="notif-badge notif-badge--active">✅ Ativado</span>
              ) : browserPermission === 'denied' ? (
                <span className="notif-badge notif-badge--denied">❌ Bloqueado</span>
              ) : (
                <button className="notif-section__enable-btn" onClick={handleRequestPermission}>Ativar Notificações</button>
              )}
            </div>
          </div>

          <div className="notif-divider" />

          {/* Email Settings */}
          <div className="notif-section">
            <div className="notif-section__header">
              <span className="notif-section__icon">📧</span>
              <div>
                <h3 className="notif-section__title">Lembretes por Email</h3>
                <p className="notif-section__desc">Envia um lembrete no dia do seu date</p>
              </div>
              <label className="notif-toggle">
                <input 
                  type="checkbox" 
                  checked={formData.emailEnabled} 
                  onChange={handleChange('emailEnabled')}
                  disabled={!isFirebaseActive} 
                />
                <span className="notif-toggle__slider" />
              </label>
            </div>
          </div>

          {!isFirebaseActive && (
            <div className="notif-warning">
              ⚠️ O serviço de email não está configurado no servidor.
            </div>
          )}

          {formData.emailEnabled && isFirebaseActive && (
            <>
              <div className="modal__field">
                <label className="modal__label">Email de Destino</label>
                <input 
                  className="modal__input" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={formData.email} 
                  onChange={handleChange('email')} 
                />
              </div>

              <div className="modal__field">
                <label className="modal__label">Seu Nome (como quer ser chamado)</label>
                <input 
                  className="modal__input" 
                  type="text" 
                  placeholder="Ex: Pedro" 
                  value={formData.userName} 
                  onChange={handleChange('userName')} 
                />
              </div>

              <button
                className={`notif-test-btn ${testStatus === 'sending' ? 'notif-test-btn--sending' : ''}`}
                onClick={handleTestEmail}
                disabled={testStatus === 'sending' || !formData.email}
              >
                {testStatus === '' && '📨 Enviar Email de Teste'}
                {testStatus === 'sending' && '⏳ Enviando...'}
                {testStatus === 'success' && '✅ Teste enviado com sucesso!'}
                {testStatus === 'error' && '❌ Erro ao enviar. Verifique seu email.'}
              </button>
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="modal__btn modal__btn--primary" onClick={handleSave}>💾 Salvar Configurações</button>
        </div>
      </div>
    </div>
  );
}

