import React, { useState, useEffect } from 'react';

/**
 * BudgetPanel — Modal de orçamento mensal com barra de progresso e lista de gastos
 */
export default function BudgetPanel({
  isOpen,
  onClose,
  budget,
  onBudgetChange,
  dates,
  monthName,
  currentYear,
}) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue(budget.toString());
    }
  }, [isOpen, budget]);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
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

  const totalSpent = dates.reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
  const remaining = budget - totalSpent;
  const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const completedCount = dates.filter((d) => d.completed).length;

  // Determinar cor da barra
  let barClass = 'budget__progress-bar--ok';
  if (percentage > 90) barClass = 'budget__progress-bar--danger';
  else if (percentage > 70) barClass = 'budget__progress-bar--warning';

  const handleSave = () => {
    const val = parseFloat(inputValue) || 0;
    onBudgetChange(val);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleSave();
    }
  };

  // Dates com custo, ordenados por data
  const datesWithCost = dates
    .filter((d) => d.cost > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal budget">
        <div className="modal__header">
          <h2 className="modal__title">
            💰 Orçamento — {monthName} {currentYear}
          </h2>
          <button className="modal__close" onClick={handleSave} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal__body">
          {/* Input de orçamento */}
          <div className="budget__input-group">
            <span className="budget__input-label">Orçamento Mensal (R$)</span>
            <input
              className="budget__input"
              type="number"
              min="0"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Resumo */}
          <div className="budget__summary">
            <div className="budget__item">
              <div className="budget__item-label">Total</div>
              <div className="budget__item-value budget__item-value--total">
                R$ {budget.toFixed(2)}
              </div>
            </div>
            <div className="budget__item">
              <div className="budget__item-label">Gasto</div>
              <div className="budget__item-value budget__item-value--spent">
                R$ {totalSpent.toFixed(2)}
              </div>
            </div>
            <div className="budget__item">
              <div className="budget__item-label">Restante</div>
              <div
                className={`budget__item-value ${remaining < 0 ? 'budget__item-value--over' : 'budget__item-value--remaining'}`}
              >
                R$ {remaining.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="budget__progress">
            <div
              className={`budget__progress-bar ${barClass}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Progresso mensal */}
          {dates.length > 0 && (
            <div className="budget__monthly-progress">
              <span>{completedCount} de {dates.length} date{dates.length !== 1 ? 's' : ''} concluído{completedCount !== 1 ? 's' : ''}</span>
              <div className="budget__dates-progress-bar">
                <div
                  className="budget__dates-progress-fill"
                  style={{ width: dates.length > 0 ? `${(completedCount / dates.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Lista de gastos */}
          {datesWithCost.length > 0 ? (
            <div className="budget__dates-list">
              {datesWithCost.map((d) => (
                <div
                  key={d.id}
                  className={`budget__date-item ${d.completed ? 'budget__date-item--completed' : ''}`}
                >
                  <span className="budget__date-name">
                    {d.completed && '✅ '}
                    {d.title}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '6px' }}>
                      {d.date.split('-').reverse().join('/')}
                    </span>
                  </span>
                  <span className={`budget__date-cost ${d.completed ? 'budget__date-cost--done' : ''}`}>
                    R$ {Number(d.cost).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="budget__empty">
              Nenhum gasto registrado para {monthName}. Adicione dates ao calendário! 💕
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--primary" onClick={handleSave} style={{ flex: 1 }}>
            ✅ Salvar Orçamento
          </button>
        </div>
      </div>
    </div>
  );
}
