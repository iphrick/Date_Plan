import React, { useState, useEffect } from 'react';
import { requestBrowserPermission } from '../utils/notificationService';

/**
 * NotificationSettings — Modal de configurações de notificação
 * Simplificado para apenas notificações do navegador
 */
export default function NotificationSettings({ isOpen, onClose }) {
  const [browserPermission, setBrowserPermission] = useState('default');

  useEffect(() => {
    if (isOpen && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [isOpen]);

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

  const handleRequestPermission = async () => {
    const result = await requestBrowserPermission();
    setBrowserPermission(result);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal notif-settings">
        <div className="modal__header">
          <h2 className="modal__title">🔔 Notificações</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <div className="notif-section">
            <div className="notif-section__header">
              <span className="notif-section__icon">🌐</span>
              <div>
                <h3 className="notif-section__title">Notificações do Navegador</h3>
                <p className="notif-section__desc">Receba lembretes nativos no seu dispositivo quando houver um date hoje.</p>
              </div>
            </div>
            
            <div className="notif-section__status" style={{ marginTop: '20px' }}>
              {browserPermission === 'granted' ? (
                <div className="notif-badge notif-badge--active" style={{ fontSize: '1rem', padding: '8px 16px' }}>
                  ✅ Notificações Ativadas
                </div>
              ) : browserPermission === 'denied' ? (
                <div className="notif-badge notif-badge--denied">
                  ❌ Bloqueado pelo navegador (Ative nas configurações do site)
                </div>
              ) : (
                <button 
                  className="notif-section__enable-btn" 
                  onClick={handleRequestPermission}
                  style={{ width: '100%', padding: '16px' }}
                >
                  🔔 Ativar Lembretes Diários
                </button>
              )}
            </div>

            <div className="notif-guide" style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <p><strong>Como funciona:</strong></p>
              <ul>
                <li>O app verifica automaticamente se você tem encontros marcados para o dia atual.</li>
                <li>Se houver um date, você receberá uma notificação visual.</li>
                <li>Ao clicar na notificação, você será levado para os detalhes do encontro.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--primary" onClick={onClose} style={{ width: '100%' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
