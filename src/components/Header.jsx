import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Header — Navegação do mês, logo central, notificações, orçamento, grupos e avatar
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
  const { user } = useAuth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const remaining = monthBudget - monthSpent;
  const isOver = remaining < 0;
  const percentage = monthBudget > 0 ? Math.min((monthSpent / monthBudget) * 100, 100) : 0;

  // Cor da barra e do valor
  let barColor = 'var(--success)';
  let valueColor = 'var(--accent)';
  if (monthBudget > 0) {
    if (percentage > 90) {
      barColor = 'var(--danger)';
      valueColor = 'var(--danger)';
    } else if (percentage > 70) {
      barColor = 'var(--warning)';
      valueColor = 'var(--warning)';
    }
  }
  if (isOver) valueColor = 'var(--danger)';

  // Iniciais do email para o avatar
  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

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

      {/* Área direita */}
      <div className="header__right">
        {/* Botão Grupos */}
        <button className="header__notif-btn" onClick={onGroupsClick} aria-label="Meus Grupos" title="Meus Grupos">
          👥
        </button>

        {/* Botão de notificações */}
        <button className="header__notif-btn" onClick={onNotifClick} aria-label="Configurar notificações">
          🔔
        </button>

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
          {/* Mini barra de progresso */}
          {monthBudget > 0 && (
            <div className="header__budget-bar">
              <div
                className="header__budget-bar-fill"
                style={{ width: `${percentage}%`, background: barColor }}
              />
            </div>
          )}
        </button>

        {/* Avatar do usuário */}
        <button className="header__avatar" onClick={onLogout} aria-label="Logout" title={`Sair (${user?.email})`}>
          {userInitial}
        </button>
      </div>
    </header>
  );
}
