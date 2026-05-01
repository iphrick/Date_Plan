import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Calendar from './components/Calendar';
import DateModal from './components/DateModal';
import BudgetPanel from './components/BudgetPanel';
import BudgetAlert from './components/BudgetAlert';
import PhotoGallery from './components/PhotoGallery';
import NotificationSettings from './components/NotificationSettings';
import { deleteAlbum } from './utils/photoDb';
import { checkAndNotify } from './utils/notificationService';
import { initFirebase } from './firebase';
import './App.css';

/**
 * DATE PLAN — App Principal
 * Agenda visual de encontros com calendário, orçamento inteligente,
 * conclusão de dates e álbum de fotos
 */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getMonthKey(month, year) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function App() {
  // ========================================
  // Estado
  // ========================================
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [dates, setDates] = useState([]);
  const [budgets, setBudgets] = useState({}); // { "2026-05": 500, "2026-06": 300 }
  const [coverPhotos, setCoverPhotos] = useState({}); // { dateId: dataUrl }

  // Modais
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // Dados temporários
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [pendingDate, setPendingDate] = useState(null); // Date aguardando aprovação de orçamento
  const [galleryDate, setGalleryDate] = useState(null); // Date sendo visualizado na galeria

  // Feedback
  const [toastMessage, setToastMessage] = useState('');

  // Notificações
  const [notifSettings, setNotifSettings] = useState({});
  const [notificationsChecked, setNotificationsChecked] = useState(false);

  // ========================================
  // Persistência — localStorage
  // ========================================
  useEffect(() => {
    try {
      const savedDates = localStorage.getItem('date_plan_dates');
      const savedBudgets = localStorage.getItem('date_plan_budgets');
      const savedCovers = localStorage.getItem('date_plan_covers');
      if (savedDates) setDates(JSON.parse(savedDates));
      if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
      if (savedCovers) setCoverPhotos(JSON.parse(savedCovers));

      // Migrar orçamento antigo (global → mensal)
      const oldBudget = localStorage.getItem('date_plan_budget');
      if (oldBudget && !savedBudgets) {
        const val = parseFloat(oldBudget) || 0;
        if (val > 0) {
          const key = getMonthKey(today.getMonth(), today.getFullYear());
          setBudgets({ [key]: val });
        }
        localStorage.removeItem('date_plan_budget');
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do localStorage:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('date_plan_dates', JSON.stringify(dates));
  }, [dates]);

  useEffect(() => {
    localStorage.setItem('date_plan_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('date_plan_covers', JSON.stringify(coverPhotos));
  }, [coverPhotos]);

  // Carregar configurações de notificação
  useEffect(() => {
    try {
      const savedNotif = localStorage.getItem('date_plan_notif_settings');
      let config = {};
      
      if (savedNotif) {
        config = JSON.parse(savedNotif);
      }

      // Mesclar com variáveis de ambiente (prioridade para env vars se localStorage estiver vazio)
      const envConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey || '',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId || '',
        email: config.email || '',
        userName: config.userName || '',
        emailEnabled: config.emailEnabled ?? (!!import.meta.env.VITE_FIREBASE_API_KEY),
      };

      setNotifSettings(envConfig);
      initFirebase(envConfig);
    } catch (e) {
      console.warn('Erro ao carregar config de notificação:', e);
    }
  }, []);

  // Salvar configurações de notificação
  useEffect(() => {
    if (Object.keys(notifSettings).length > 0) {
      localStorage.setItem('date_plan_notif_settings', JSON.stringify(notifSettings));
      initFirebase(notifSettings); // Re-inicializar se as configs mudarem
    }
  }, [notifSettings]);

  // Verificar notificações ao carregar (uma vez por sessão)
  useEffect(() => {
    if (dates.length > 0 && !notificationsChecked) {
      setNotificationsChecked(true);
      checkAndNotify(dates, notifSettings).then((notified) => {
        if (notified.length > 0) {
          showToast(`🔔 ${notified.length} lembrete${notified.length > 1 ? 's' : ''} enviado${notified.length > 1 ? 's' : ''}!`);
        }
      });
    }
  }, [dates, notificationsChecked, notifSettings]);

  // ========================================
  // Cálculos de orçamento mensal
  // ========================================
  const currentMonthKey = getMonthKey(currentMonth, currentYear);
  const monthBudget = budgets[currentMonthKey] || 0;

  const getMonthSpent = useCallback((month, year) => {
    const key = getMonthKey(month, year);
    return dates
      .filter((d) => d.date && d.date.startsWith(key))
      .reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
  }, [dates]);

  const monthSpent = getMonthSpent(currentMonth, currentYear);
  const monthRemaining = monthBudget - monthSpent;

  // ========================================
  // Navegação do calendário
  // ========================================
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // ========================================
  // Helpers de mês seguinte
  // ========================================
  const getNextMonth = () => {
    if (currentMonth === 11) return { month: 0, year: currentYear + 1 };
    return { month: currentMonth + 1, year: currentYear };
  };

  const getNextMonthName = () => {
    const { month, year } = getNextMonth();
    return `${MONTH_NAMES[month]} ${year}`;
  };

  // ========================================
  // CRUD de dates com validação de orçamento
  // ========================================
  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setEditingDate(null);
    setShowDateModal(true);
  };

  const handleDateClick = (dateEntry) => {
    setEditingDate(dateEntry);
    setSelectedDate(null);
    setShowDateModal(true);
  };

  const saveDateDirectly = (dateData) => {
    setDates((prev) => {
      const existing = prev.findIndex((d) => d.id === dateData.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...dateData };
        return updated;
      }
      return [...prev, dateData];
    });
  };

  const handleSaveDate = (dateData) => {
    const isEditing = dates.some((d) => d.id === dateData.id);
    const cost = parseFloat(dateData.cost) || 0;

    // Verificar orçamento apenas para novos dates ou quando custo aumenta
    if (cost > 0 && monthBudget > 0) {
      const existingCost = isEditing
        ? parseFloat(dates.find((d) => d.id === dateData.id)?.cost) || 0
        : 0;
      const additionalCost = cost - existingCost;

      if (additionalCost > 0 && additionalCost > monthRemaining) {
        // Orçamento insuficiente — mostrar alerta
        setPendingDate(dateData);
        setShowDateModal(false);
        setShowBudgetAlert(true);
        return;
      }
    }

    // Orçamento ok — salvar
    saveDateDirectly(dateData);
    showToast(isEditing ? '✏️ Date atualizado!' : '❤️ Date criado com sucesso!');
  };

  const handleRescheduleNextMonth = () => {
    if (!pendingDate) return;
    const { month, year } = getNextMonth();
    const day = pendingDate.date ? pendingDate.date.split('-')[2] : '01';
    const newDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;

    // Verificar se o dia existe no mês seguinte
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(parseInt(day), lastDay);
    const safeDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

    const rescheduled = { ...pendingDate, date: safeDateStr };
    saveDateDirectly(rescheduled);
    setPendingDate(null);
    setShowBudgetAlert(false);
    showToast(`📅 Date agendado para ${MONTH_NAMES[month]}!`);
  };

  const handleForceCreate = () => {
    if (!pendingDate) return;
    saveDateDirectly(pendingDate);
    setPendingDate(null);
    setShowBudgetAlert(false);
    showToast('❤️ Date criado (acima do orçamento)!');
  };

  const handleDeleteDate = async (dateId) => {
    setDates((prev) => prev.filter((d) => d.id !== dateId));
    // Limpar fotos do IndexedDB
    try {
      await deleteAlbum(dateId);
    } catch (e) {
      console.warn('Erro ao deletar álbum:', e);
    }
    // Limpar capa
    setCoverPhotos((prev) => {
      const updated = { ...prev };
      delete updated[dateId];
      return updated;
    });
    showToast('🗑️ Date removido');
  };

  // ========================================
  // Conclusão de date
  // ========================================
  const handleToggleCompleted = (dateId) => {
    setDates((prev) =>
      prev.map((d) => {
        if (d.id === dateId) {
          const nowCompleted = !d.completed;
          if (nowCompleted) {
            showToast('🎉 Muito bom, continue assim!');
          }
          return { ...d, completed: nowCompleted };
        }
        return d;
      })
    );
  };

  // ========================================
  // Orçamento
  // ========================================
  const handleBudgetChange = (newBudget) => {
    setBudgets((prev) => ({
      ...prev,
      [currentMonthKey]: newBudget,
    }));
    showToast('💰 Orçamento atualizado!');
  };

  // ========================================
  // Álbum de fotos
  // ========================================
  const handleOpenGallery = (dateEntry) => {
    setGalleryDate(dateEntry);
    setShowPhotoGallery(true);
  };

  const handleCoverChange = (dateId, dataUrl) => {
    setCoverPhotos((prev) => {
      const updated = { ...prev };
      if (dataUrl) {
        updated[dateId] = dataUrl;
      } else {
        delete updated[dateId];
      }
      return updated;
    });
  };

  // ========================================
  // Toast
  // ========================================
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // ========================================
  // Render
  // ========================================
  return (
    <>
      <Header
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        monthBudget={monthBudget}
        monthSpent={monthSpent}
        onBudgetClick={() => setShowBudgetPanel(true)}
        onNotifClick={() => setShowNotifSettings(true)}
      />

      <Calendar
        currentMonth={currentMonth}
        currentYear={currentYear}
        dates={dates}
        coverPhotos={coverPhotos}
        onDayClick={handleDayClick}
        onDateClick={handleDateClick}
      />

      {/* FAB */}
      <button
        className="fab"
        onClick={() => {
          setSelectedDate(null);
          setEditingDate(null);
          setShowDateModal(true);
        }}
        aria-label="Adicionar novo date"
      >
        +
      </button>

      {/* Modal — Criar/Editar date */}
      <DateModal
        isOpen={showDateModal}
        onClose={() => {
          setShowDateModal(false);
          setEditingDate(null);
          setSelectedDate(null);
        }}
        onSave={handleSaveDate}
        onDelete={handleDeleteDate}
        onToggleCompleted={handleToggleCompleted}
        onOpenGallery={handleOpenGallery}
        onCoverChange={handleCoverChange}
        editingDate={editingDate}
        selectedDate={selectedDate}
      />

      {/* Alerta de orçamento */}
      <BudgetAlert
        isOpen={showBudgetAlert}
        onClose={() => {
          setShowBudgetAlert(false);
          setPendingDate(null);
        }}
        monthName={MONTH_NAMES[currentMonth]}
        nextMonthName={getNextMonthName()}
        remaining={Math.max(monthRemaining, 0)}
        dateCost={pendingDate ? parseFloat(pendingDate.cost) || 0 : 0}
        onReschedule={handleRescheduleNextMonth}
        onForceCreate={handleForceCreate}
      />

      {/* Painel de orçamento */}
      <BudgetPanel
        isOpen={showBudgetPanel}
        onClose={() => setShowBudgetPanel(false)}
        budget={monthBudget}
        onBudgetChange={handleBudgetChange}
        dates={dates.filter((d) => d.date && d.date.startsWith(currentMonthKey))}
        monthName={MONTH_NAMES[currentMonth]}
        currentYear={currentYear}
      />

      {/* Galeria de fotos */}
      <PhotoGallery
        isOpen={showPhotoGallery}
        onClose={() => {
          setShowPhotoGallery(false);
          setGalleryDate(null);
        }}
        dateEntry={galleryDate}
        onCoverChange={handleCoverChange}
      />

      {/* Configurações de notificação */}
      <NotificationSettings
        isOpen={showNotifSettings}
        onClose={() => setShowNotifSettings(false)}
        settings={notifSettings}
        onSaveSettings={(s) => {
          setNotifSettings(s);
          showToast('🔔 Configurações de notificação salvas!');
        }}
      />

      {/* Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}

export default App;
