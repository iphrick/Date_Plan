import React, { useState } from 'react';

/**
 * CalendarDay — Célula individual do calendário
 * Mostra imagem de capa do álbum ou URL, badge de conclusão, tooltip no hover
 */
export default function CalendarDay({ dayData, onDayClick, onDateClick }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { day, isCurrentMonth, isToday, dateStr, dateEntry, coverPhoto } = dayData;

  if (!isCurrentMonth) {
    return (
      <div className="day day--other-month">
        <span className="day__number">{day}</span>
      </div>
    );
  }

  const hasDate = !!dateEntry;
  const isCompleted = hasDate && dateEntry.completed;

  // Imagem de fundo: prioridade → capa do álbum > URL do date
  const bgImage = coverPhoto || (hasDate ? dateEntry.imageUrl : null);

  const handleClick = () => {
    if (hasDate) {
      onDateClick(dateEntry);
    } else {
      onDayClick(dateStr);
    }
  };

  const handleMapsClick = (e) => {
    if (hasDate && dateEntry.location) {
      e.stopPropagation();
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dateEntry.location)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const classNames = [
    'day',
    isToday && 'day--today',
    hasDate && 'day--has-date',
    isCompleted && 'day--completed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={0}
      aria-label={`Dia ${day}${hasDate ? `, compromisso: ${dateEntry.title}` : ''}`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Imagem de fundo */}
      {bgImage && (
        <>
          <div
            className="day__bg"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="day__overlay" />
        </>
      )}

      {/* Badge de conclusão */}
      {isCompleted && (
        <div className="day__badge">✅</div>
      )}

      {/* Conteúdo do dia */}
      <div className="day__content">
        <span className="day__number">{day}</span>
        {hasDate && (
          <>
            <span className="day__title">{dateEntry.title}</span>
            {dateEntry.cost > 0 && (
              <span className="day__cost">R$ {Number(dateEntry.cost).toFixed(0)}</span>
            )}
          </>
        )}
      </div>

      {/* Tooltip no hover (desktop) */}
      {hasDate && showTooltip && (
        <div className="day__tooltip">
          <div className="day__tooltip-title">
            {isCompleted && '✅ '}{dateEntry.title}
          </div>
          {dateEntry.location && (
            <div className="day__tooltip-location" onClick={handleMapsClick}>
              📍 {dateEntry.location}
            </div>
          )}
          {dateEntry.cost > 0 && (
            <div className="day__tooltip-cost">
              💰 R$ {Number(dateEntry.cost).toFixed(2)}
            </div>
          )}
          {isCompleted && (
            <div className="day__tooltip-album">📸 Clique para ver álbum</div>
          )}
        </div>
      )}
    </div>
  );
}
