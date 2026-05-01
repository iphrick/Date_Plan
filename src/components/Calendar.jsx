import React from 'react';
import CalendarDay from './CalendarDay';

/**
 * Calendar — Grid mensal com dias da semana e renderização dos dias
 * Agora recebe coverPhotos para passar para cada CalendarDay
 */
export default function Calendar({
  currentMonth,
  currentYear,
  dates,
  coverPhotos,
  onDayClick,
  onDateClick,
}) {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Dias do mês anterior (preencher início)
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: null,
      });
    }

    // Dias do mês atual
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday =
        d === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

      // Encontrar compromisso neste dia
      const dateEntry = dates.find((dt) => dt.date === dateStr);

      // Capa do álbum (se existir)
      const coverPhoto = dateEntry && coverPhotos ? coverPhotos[dateEntry.id] : null;

      days.push({
        day: d,
        isCurrentMonth: true,
        isToday,
        dateStr,
        dateEntry,
        coverPhoto,
      });
    }

    // Dias do próximo mês (preencher final para completar grid)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: null,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="calendar">
      {/* Cabeçalho dias da semana */}
      <div className="calendar__weekdays">
        {weekdays.map((wd) => (
          <div key={wd} className="calendar__weekday">
            {wd}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="calendar__grid">
        {calendarDays.map((dayData, index) => (
          <CalendarDay
            key={index}
            dayData={dayData}
            onDayClick={onDayClick}
            onDateClick={onDateClick}
          />
        ))}
      </div>
    </div>
  );
}
