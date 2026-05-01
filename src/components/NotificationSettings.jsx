import React, { useState, useEffect } from 'react';
import { sendTestEmail, requestBrowserPermission } from '../utils/notificationService';

/**
 * NotificationSettings — Modal de configurações de notificação (Firebase Edition)
 */
export default function NotificationSettings({ isOpen, onClose, settings, onSaveSettings }) {
  const [formData, setFormData] = useState({
    email: '',
    userName: '',
    emailEnabled: false,
    // Firebase Config
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [testStatus, setTestStatus] = useState(''); // '', 'sending', 'success', 'error'
  const [browserPermission, setBrowserPermission] = useState('default');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: settings?.email || '',
        userName: settings?.userName || '',
        emailEnabled: settings?.emailEnabled || false,
        apiKey: settings?.apiKey || '',
        authDomain: settings?.authDomain || '',
        projectId: settings?.projectId || '',
        storageBucket: settings?.storageBucket || '',
        messagingSenderId: settings?.messagingSenderId || '',
        appId: settings?.appId || '',
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
    if (!formData.email || !formData.apiKey || !formData.projectId) {
      setTestStatus('error');
      return;
    }
    setTestStatus('sending');
    try {
      await sendTestEmail(formData);
      setTestStatus('success');
    } catch (err) {
      console.error(err);
      setTestStatus('error');
    }
  };

  const isFirebaseConfigured = formData.apiKey && formData.projectId;

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

          {/* Firebase Email */}
          <div className="notif-section">
            <div className="notif-section__header">
              <span className="notif-section__icon">🔥</span>
              <div>
                <h3 className="notif-section__title">Email via Firebase</h3>
                <p className="notif-section__desc">Envia email usando Firestore + Trigger Email</p>
              </div>
              <label className="notif-toggle">
                <input type="checkbox" checked={formData.emailEnabled} onChange={handleChange('emailEnabled')} />
                <span className="notif-toggle__slider" />
              </label>
            </div>
          </div>

          {formData.emailEnabled && (
            <>
              <div className="modal__field">
                <label className="modal__label">Email de Destino</label>
                <input className="modal__input" type="email" placeholder="seu@email.com" value={formData.email} onChange={handleChange('email')} />
              </div>

              <div className="modal__field">
                <label className="modal__label">Seu Nome</label>
                <input className="modal__input" type="text" placeholder="Ex: Pedro" value={formData.userName} onChange={handleChange('userName')} />
              </div>

              <div className="notif-service-config">
                <button className="notif-service-config__toggle" onClick={() => setShowSetup(!showSetup)}>
                  ⚙️ Configurar Firebase {showSetup ? '▲' : '▼'}
                </button>

                {showSetup && (
                  <div className="notif-service-config__fields">
                    <div className="notif-service-config__guide">
                      <p><strong>Configuração:</strong></p>
                      <ol>
                        <li>No Firebase Console, instale a extensão <strong>Trigger Email</strong></li>
                        <li>Configure a coleção como <code>mail</code></li>
                        <li>Cole sua <strong>Configuração do Web App</strong> abaixo:</li>
                      </ol>
                    </div>

                    <div className="modal__field">
                      <label className="modal__label">
                        API Key {import.meta.env.VITE_FIREBASE_API_KEY && <span className="notif-env-badge">(Vercel ENV)</span>}
                      </label>
                      <input className="modal__input" type="text" value={formData.apiKey} onChange={handleChange('apiKey')} placeholder={import.meta.env.VITE_FIREBASE_API_KEY ? "Configurado via Vercel" : ""} />
                    </div>

                    <div className="modal__field">
                      <label className="modal__label">
                        Project ID {import.meta.env.VITE_FIREBASE_PROJECT_ID && <span className="notif-env-badge">(Vercel ENV)</span>}
                      </label>
                      <input className="modal__input" type="text" value={formData.projectId} onChange={handleChange('projectId')} placeholder={import.meta.env.VITE_FIREBASE_PROJECT_ID ? "Configurado via Vercel" : ""} />
                    </div>

                    <div className="modal__field">
                      <label className="modal__label">
                        Auth Domain {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && <span className="notif-env-badge">(Vercel ENV)</span>}
                      </label>
                      <input className="modal__input" type="text" value={formData.authDomain} onChange={handleChange('authDomain')} placeholder={import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? "Configurado via Vercel" : ""} />
                    </div>
                    
                    <div className="modal__field">
                      <label className="modal__label">
                        App ID {import.meta.env.VITE_FIREBASE_APP_ID && <span className="notif-env-badge">(Vercel ENV)</span>}
                      </label>
                      <input className="modal__input" type="text" value={formData.appId} onChange={handleChange('appId')} placeholder={import.meta.env.VITE_FIREBASE_APP_ID ? "Configurado via Vercel" : ""} />
                    </div>
                  </div>
                )}
              </div>

              {isFirebaseConfigured && formData.email && (
                <button
                  className={`notif-test-btn ${testStatus === 'sending' ? 'notif-test-btn--sending' : ''}`}
                  onClick={handleTestEmail}
                  disabled={testStatus === 'sending'}
                >
                  {testStatus === '' && '📨 Enviar Email de Teste (Firebase)'}
                  {testStatus === 'sending' && '⏳ Enviando para Firestore...'}
                  {testStatus === 'success' && '✅ Documento adicionado! Verifique o console Firebase'}
                  {testStatus === 'error' && '❌ Erro. Verifique o console do navegador'}
                </button>
              )}
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
