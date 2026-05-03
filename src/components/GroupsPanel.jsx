import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createGroup,
  getMyGroups,
  joinGroupByCode,
  deleteGroup,
  leaveGroup,
} from '../utils/groupService';

/**
 * GroupsPanel — Modal "Meus Grupos"
 * Lista grupos, cria novos, entra via código de convite
 */
export default function GroupsPanel({ isOpen, onClose, onSelectGroup }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'join'
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [copiedGroupId, setCopiedGroupId] = useState(null);

  // Carregar grupos ao abrir
  useEffect(() => {
    if (isOpen && user) {
      setGroups(getMyGroups(user.uid));
      setView('list');
      setMessage({ text: '', type: '' });
    }
  }, [isOpen, user]);

  // ESC para fechar
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

  if (!isOpen || !user) return null;

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      showMsg('Digite um nome para o grupo.', 'error');
      return;
    }
    const group = createGroup(newGroupName.trim(), user.uid, user.email);
    setGroups(getMyGroups(user.uid));
    setNewGroupName('');
    setView('list');
    showMsg(`Grupo "${group.name}" criado! Código: ${group.code}`);
  };

  const handleJoinGroup = () => {
    if (!joinCode.trim()) {
      showMsg('Digite o código de convite.', 'error');
      return;
    }
    const result = joinGroupByCode(joinCode.trim(), user.uid, user.email);
    if (result.success) {
      setGroups(getMyGroups(user.uid));
      setJoinCode('');
      setView('list');
      showMsg(`Você entrou no grupo "${result.group.name}"!`);
    } else {
      showMsg(result.error, 'error');
    }
  };

  const handleDeleteGroup = (groupId, groupName) => {
    if (!confirm(`Tem certeza que deseja deletar "${groupName}"? Todos os dates serão perdidos.`)) return;
    const result = deleteGroup(groupId, user.uid);
    if (result.success) {
      setGroups(getMyGroups(user.uid));
      showMsg('Grupo deletado.');
    } else {
      showMsg(result.error, 'error');
    }
  };

  const handleLeaveGroup = (groupId, groupName) => {
    if (!confirm(`Sair do grupo "${groupName}"?`)) return;
    const result = leaveGroup(groupId, user.uid);
    if (result.success) {
      setGroups(getMyGroups(user.uid));
      showMsg('Você saiu do grupo.');
    } else {
      showMsg(result.error, 'error');
    }
  };

  const handleCopyCode = (code, groupId) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedGroupId(groupId);
      setTimeout(() => setCopiedGroupId(null), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal groups-panel">
        <div className="modal__header">
          <h2 className="modal__title">
            {view === 'list' && '👥 Meus Grupos'}
            {view === 'create' && '✨ Criar Grupo'}
            {view === 'join' && '🔗 Entrar com Código'}
          </h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {/* Mensagem de feedback */}
          {message.text && (
            <div className={`groups-msg groups-msg--${message.type}`}>
              {message.text}
            </div>
          )}

          {/* === VIEW: LISTA DE GRUPOS === */}
          {view === 'list' && (
            <>
              {/* Ações */}
              <div className="groups-actions">
                <button className="groups-action-btn groups-action-btn--create" onClick={() => setView('create')}>
                  ✨ Criar Grupo
                </button>
                <button className="groups-action-btn groups-action-btn--join" onClick={() => setView('join')}>
                  🔗 Entrar com Código
                </button>
              </div>

              {/* Lista */}
              {groups.length === 0 ? (
                <div className="groups-empty">
                  <span className="groups-empty__icon">👥</span>
                  <p>Você ainda não faz parte de nenhum grupo.</p>
                  <p className="groups-empty__hint">Crie um grupo ou entre com um código de convite!</p>
                </div>
              ) : (
                <div className="groups-list">
                  {groups.map((group) => {
                    const isOwner = group.ownerUid === user.uid;
                    return (
                      <div key={group.id} className="group-card">
                        <div className="group-card__header">
                          <div className="group-card__info" onClick={() => onSelectGroup(group)}>
                            <h3 className="group-card__name">{group.name}</h3>
                            <div className="group-card__meta">
                              <span className="group-card__members">
                                👤 {group.members.length} membro{group.members.length !== 1 ? 's' : ''}
                              </span>
                              <span className="group-card__dates">
                                📅 {group.dates.length} date{group.dates.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          {isOwner && <span className="group-card__badge">Owner</span>}
                        </div>

                        {/* Código de convite */}
                        <div className="group-card__code-row">
                          <span className="group-card__code-label">Código:</span>
                          <code className="group-card__code">{group.code}</code>
                          <button
                            className="group-card__copy-btn"
                            onClick={() => handleCopyCode(group.code, group.id)}
                          >
                            {copiedGroupId === group.id ? '✅' : '📋'}
                          </button>
                        </div>

                        {/* Ações do card */}
                        <div className="group-card__actions">
                          <button
                            className="group-card__enter-btn"
                            onClick={() => onSelectGroup(group)}
                          >
                            Entrar →
                          </button>
                          {isOwner ? (
                            <button
                              className="group-card__delete-btn"
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                            >
                              🗑️
                            </button>
                          ) : (
                            <button
                              className="group-card__leave-btn"
                              onClick={() => handleLeaveGroup(group.id, group.name)}
                            >
                              Sair
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* === VIEW: CRIAR GRUPO === */}
          {view === 'create' && (
            <div className="groups-form">
              <div className="modal__field">
                <label className="modal__label">Nome do Grupo</label>
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Ex: Nossos Dates ❤️"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  autoFocus
                  maxLength={50}
                />
              </div>
              <div className="groups-form__buttons">
                <button className="modal__btn modal__btn--secondary" onClick={() => setView('list')}>
                  ← Voltar
                </button>
                <button className="modal__btn modal__btn--primary" onClick={handleCreateGroup}>
                  ✨ Criar
                </button>
              </div>
            </div>
          )}

          {/* === VIEW: ENTRAR COM CÓDIGO === */}
          {view === 'join' && (
            <div className="groups-form">
              <div className="modal__field">
                <label className="modal__label">Código de Convite</label>
                <input
                  className="modal__input groups-code-input"
                  type="text"
                  placeholder="Ex: ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                  autoFocus
                  maxLength={6}
                  style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 700, fontSize: '1.25rem' }}
                />
              </div>
              <div className="groups-form__buttons">
                <button className="modal__btn modal__btn--secondary" onClick={() => setView('list')}>
                  ← Voltar
                </button>
                <button className="modal__btn modal__btn--primary" onClick={handleJoinGroup}>
                  🔗 Entrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
