import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Header — Navegação do mês, logo central, orçamento e menu do avatar
 */
export default function Header({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  monthBudget,
  monthSpent,
  onBudgetClick,
  onNotifClick,
  onGroupsClick,
  onLogout,
}) {
  const { user, username } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const remaining = monthBudget - monthSpent;
  const isOver = remaining < 0;
  const percentage = monthBudget > 0 ? Math.min((monthSpent / monthBudget) * 100, 100) : 0;

  let barColor = 'var(--success)';
  let valueColor = 'var(--accent)';
  if (monthBudget > 0) {
    if (percentage > 90) { barColor = 'var(--danger)'; valueColor = 'var(--danger)'; }
    else if (percentage > 70) { barColor = 'var(--warning)'; valueColor = 'var(--warning)'; }
  }
  if (isOver) valueColor = 'var(--danger)';

  const userInitial = username ? username[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : '?';
  const displayName = username || user?.email || '';
  const userEmail = user?.email || '';

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // Fechar menu com ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    if (menuOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [menuOpen]);

  const handleMenuAction = (action) => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="header">
      {/* Navegação do mês */}
      <div className="header__month-nav">
        <button className="header__nav-btn" onClick={onPrevMonth} aria-label="Mês anterior">
          ◀
        </button>
        <span className="header__month-label">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button className="header__nav-btn" onClick={onNextMonth} aria-label="Próximo mês">
          ▶
        </button>
      </div>

      {/* Logo central */}
      <div className="header__brand">
        <span className="header__heart">❤️</span>
        <span className="header__logo">DATE PLAN</span>
      </div>

      {/* Área direita: orçamento + avatar */}
      <div className="header__right">
        {/* Botão de orçamento com mini barra */}
        <button className="header__budget-btn" onClick={onBudgetClick} aria-label="Abrir orçamento">
          <div className="header__budget-info">
            <span className="header__budget-icon">💰</span>
            <div className="header__budget-text">
              <span className="header__budget-value" style={{ color: valueColor }}>
                R$ {remaining.toFixed(2)}
              </span>
              <span className="header__budget-label">restante</span>
            </div>
          </div>
          {monthBudget > 0 && (
            <div className="header__budget-bar">
              <div
                className="header__budget-bar-fill"
                style={{ width: `${percentage}%`, background: barColor }}
              />
            </div>
          )}
        </button>

        {/* Avatar + Dropdown Menu */}
        <div className="avatar-menu" ref={menuRef}>
          <button
            className={`header__avatar ${menuOpen ? 'header__avatar--active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu do usuário"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {userInitial}
          </button>

          {menuOpen && (
            <>
              <div className="avatar-menu__backdrop" />
              <div className="avatar-menu__dropdown" role="menu">
                {/* Info do usuário */}
                <div className="avatar-menu__user">
                  <div className="avatar-menu__user-avatar">{userInitial}</div>
                  <div className="avatar-menu__user-info">
                    <span className="avatar-menu__user-name">{displayName}</span>
                    <span className="avatar-menu__user-label">{userEmail}</span>
                  </div>
                </div>

                <div className="avatar-menu__divider" />

                {/* Opções */}
                <button
                  className="avatar-menu__item"
                  onClick={() => handleMenuAction(onGroupsClick)}
                  role="menuitem"
                >
                  <span className="avatar-menu__item-icon">👥</span>
                  <span className="avatar-menu__item-text">Meus Grupos</span>
                </button>

                <button
                  className="avatar-menu__item"
                  onClick={() => handleMenuAction(onNotifClick)}
                  role="menuitem"
                >
                  <span className="avatar-menu__item-icon">🔔</span>
                  <span className="avatar-menu__item-text">Notificações</span>
                </button>

                <div className="avatar-menu__divider" />

                <button
                  className="avatar-menu__item avatar-menu__item--danger"
                  onClick={() => handleMenuAction(onLogout)}
                  role="menuitem"
                >
                  <span className="avatar-menu__item-icon">🚪</span>
                  <span className="avatar-menu__item-text">Sair da Conta</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
