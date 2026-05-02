/**
 * notificationService.js — Serviço de notificações (Browser Only)
 * 
 * Envia lembretes de dates agendados para hoje via:
 * 1. Web Notifications API (Notificação nativa do navegador)
 */

/**
 * Verifica e envia notificações para dates de hoje
 * @param {Array} dates - Lista de todos os dates
 * @returns {Array} IDs dos dates notificados
 */
export async function checkAndNotify(dates) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Buscar dates de hoje que não foram concluídos
  const todayDates = dates.filter(
    (d) => d.date === todayStr && !d.completed
  );

  if (todayDates.length === 0) return [];

  // Verificar quais já foram notificados hoje (para não repetir ao dar refresh)
  const notifiedKey = `date_plan_notified_${todayStr}`;
  const alreadyNotified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
  const toNotify = todayDates.filter((d) => !alreadyNotified.includes(d.id));

  if (toNotify.length === 0) return [];

  const notifiedIds = [];

  for (const dateEntry of toNotify) {
    try {
      // Enviar notificação do navegador
      const sent = await sendBrowserNotification(dateEntry);
      if (sent) notifiedIds.push(dateEntry.id);
    } catch (err) {
      console.warn(`Erro ao notificar date "${dateEntry.title}":`, err);
    }
  }

  // Salvar IDs notificados
  if (notifiedIds.length > 0) {
    const updated = [...alreadyNotified, ...notifiedIds];
    localStorage.setItem(notifiedKey, JSON.stringify(updated));
  }

  // Limpar notificações antigas
  cleanOldNotifications();

  return notifiedIds;
}

/**
 * Envia notificação do navegador usando a Notification API
 */
async function sendBrowserNotification(dateEntry) {
  if (!('Notification' in window)) return false;

  // Pedir permissão se estiver em default
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification('❤️ DATE PLAN — Lembrete!', {
      body: `Hoje é dia do date: "${dateEntry.title}"${dateEntry.location ? `\n📍 ${dateEntry.location}` : ''}`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❤️</text></svg>',
      tag: `date-plan-${dateEntry.id}`,
      requireInteraction: true,
    });

    // Abrir o app/Maps ao clicar
    notification.onclick = () => {
      window.focus();
      if (dateEntry.location) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dateEntry.location)}`;
        window.open(mapsUrl, '_blank');
      }
    };
    return true;
  }
  return false;
}

/**
 * Solicita permissão para notificações do navegador
 */
export async function requestBrowserPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/**
 * Limpa registros de notificações com mais de 7 dias
 */
function cleanOldNotifications() {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('date_plan_notified_')) {
      const dateStr = key.replace('date_plan_notified_', '');
      const date = new Date(dateStr);
      if (now - date.getTime() > sevenDays) {
        localStorage.removeItem(key);
      }
    }
  }
}
