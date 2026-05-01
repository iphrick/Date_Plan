/**
 * notificationService.js — Serviço de notificações (Browser + Email via Firebase Firestore)
 * 
 * Envia lembretes de dates agendados para hoje via:
 * 1. Web Notifications API (automático)
 * 2. Firebase Firestore (adiciona doc na coleção 'mail' para disparar extensão 'Trigger Email')
 */

import { collection, addDoc } from 'firebase/firestore';
import { getDb } from '../firebase';

/**
 * Verifica e envia notificações para dates de hoje
 */
export async function checkAndNotify(dates, settings) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayDates = dates.filter(
    (d) => d.date === todayStr && !d.completed
  );

  if (todayDates.length === 0) return [];

  const notifiedKey = `date_plan_notified_${todayStr}`;
  const alreadyNotified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
  const toNotify = todayDates.filter((d) => !alreadyNotified.includes(d.id));

  if (toNotify.length === 0) return [];

  const notifiedIds = [];

  for (const dateEntry of toNotify) {
    try {
      // 1. Browser Notification
      await sendBrowserNotification(dateEntry);

      // 2. Email via Firebase Firestore (se habilitado)
      if (settings?.emailEnabled && settings?.email) {
        await sendFirebaseEmail(dateEntry, settings);
      }

      notifiedIds.push(dateEntry.id);
    } catch (err) {
      console.warn(`Erro ao notificar date "${dateEntry.title}":`, err);
      notifiedIds.push(dateEntry.id);
    }
  }

  if (notifiedIds.length > 0) {
    const updated = [...alreadyNotified, ...notifiedIds];
    localStorage.setItem(notifiedKey, JSON.stringify(updated));
  }

  cleanOldNotifications();
  return notifiedIds;
}

/**
 * Envia notificação do navegador
 */
async function sendBrowserNotification(dateEntry) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();

  if (Notification.permission === 'granted') {
    new Notification('❤️ DATE PLAN — Lembrete!', {
      body: `Hoje é dia do date: "${dateEntry.title}"${dateEntry.location ? `\n📍 ${dateEntry.location}` : ''}`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❤️</text></svg>',
      tag: `date-plan-${dateEntry.id}`,
      requireInteraction: true,
    });
  }
}

/**
 * Adiciona documento na coleção 'mail' do Firestore para disparar envio de email
 */
async function sendFirebaseEmail(dateEntry, settings) {
  const db = getDb();
  if (!db) throw new Error('Firebase não inicializado');

  const formattedDate = dateEntry.date ? dateEntry.date.split('-').reverse().join('/') : 'Hoje';
  
  const mailDoc = {
    to: settings.email,
    message: {
      subject: `❤️ DATE PLAN: Lembrete de Encontro!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
          <h1 style="color: #ff4d6d; text-align: center;">DATE PLAN</h1>
          <p>Olá ${settings.userName || 'Amor'}, passando para lembrar que você tem um date hoje!</p>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #333;">${dateEntry.title}</h2>
            <p><strong>📅 Data:</strong> ${formattedDate}</p>
            ${dateEntry.location ? `<p><strong>📍 Local:</strong> ${dateEntry.location}</p>` : ''}
            ${dateEntry.cost > 0 ? `<p><strong>💰 Gasto:</strong> R$ ${Number(dateEntry.cost).toFixed(2)}</p>` : ''}
            ${dateEntry.description ? `<p><strong>📝 Detalhes:</strong> ${dateEntry.description}</p>` : ''}
          </div>
          ${dateEntry.location ? `
            <div style="text-align: center;">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dateEntry.location)}" 
                 style="background: #ff4d6d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📍 Ver no Google Maps
              </a>
            </div>
          ` : ''}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Gerado automaticamente pelo seu DATE PLAN ❤️</p>
        </div>
      `,
    },
    createdAt: new Date(),
  };

  // Coleção padrão usada pela extensão 'Trigger Email' é 'mail'
  await addDoc(collection(db, 'mail'), mailDoc);
}

/**
 * Envia email de teste via Firebase
 */
export async function sendTestEmail(settings) {
  const testDate = {
    title: '🧪 Teste de Notificação Firebase',
    description: 'Este é um email de teste disparado via Firestore!',
    location: 'Seu local favorito',
    cost: 100,
    date: new Date().toISOString().split('T')[0],
  };

  return sendFirebaseEmail(testDate, settings);
}

export async function requestBrowserPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

function cleanOldNotifications() {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('date_plan_notified_')) {
      const dateStr = key.replace('date_plan_notified_', '');
      const date = new Date(dateStr);
      if (now - date.getTime() > sevenDays) localStorage.removeItem(key);
    }
  }
}
