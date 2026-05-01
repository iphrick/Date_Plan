import React from 'react';

/**
 * BudgetAlert — Modal elegante de alerta quando orçamento é insuficiente
 * Oferece opção de mover o date para o próximo mês
 */
export default function BudgetAlert({
  isOpen,
  onClose,
  monthName,
  nextMonthName,
  remaining,
  dateCost,
  onReschedule,
  onForceCreate,
}) {
  if (!isOpen) return null;

  const deficit = dateCost - remaining;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal budget-alert">
        <div className="budget-alert__header">
          <div className="budget-alert__icon">⚠️</div>
          <h2 className="budget-alert__title">Orçamento Insuficiente</h2>
        </div>

        <div className="budget-alert__body">
          <p className="budget-alert__message">
            Seu orçamento para o mês de <strong>{monthName}</strong> não é suficiente para este date.
          </p>

          <div className="budget-alert__info">
            <div className="budget-alert__info-row">
              <span>Restante no mês:</span>
              <span className="budget-alert__value budget-alert__value--remaining">
                R$ {remaining.toFixed(2)}
              </span>
            </div>
            <div className="budget-alert__info-row">
              <span>Custo do date:</span>
              <span className="budget-alert__value budget-alert__value--cost">
                R$ {dateCost.toFixed(2)}
              </span>
            </div>
            <div className="budget-alert__info-row budget-alert__info-row--deficit">
              <span>Faltam:</span>
              <span className="budget-alert__value budget-alert__value--deficit">
                R$ {deficit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="budget-alert__actions">
          <button
            className="modal__btn budget-alert__btn--reschedule"
            onClick={onReschedule}
          >
            📅 Agendar para {nextMonthName}
          </button>
          <button
            className="modal__btn budget-alert__btn--force"
            onClick={onForceCreate}
          >
            Criar mesmo assim
          </button>
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
