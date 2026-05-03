import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import GroupsPanel from './components/GroupsPanel';
import GroupView from './components/GroupView';
import Header from './components/Header';
import Calendar from './components/Calendar';
import DateModal from './components/DateModal';
import BudgetPanel from './components/BudgetPanel';
import BudgetAlert from './components/BudgetAlert';
import PhotoGallery from './components/PhotoGallery';
import NotificationSettings from './components/NotificationSettings';
import { deleteAlbum } from './utils/photoDb';
import { checkAndNotify } from './utils/notificationService';
import './App.css';

/**
 * DATE PLAN — App Principal
 * Agenda visual de encontros com calendário, orçamento inteligente,
 * conclusão de dates, álbum de fotos, autenticação e grupos
 */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getMonthKey(month, year) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function App() {
  const { user, loading: authLoading, logout } = useAuth();

  // ========================================
  // Estado — sempre declarado (regras de hooks)
  // ========================================
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [dates, setDates] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [coverPhotos, setCoverPhotos] = useState({});

  // Modais
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);

  // Dados temporários
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  const [galleryDate, setGalleryDate] = useState(null);

  // Grupos
  const [activeGroup, setActiveGroup] = useState(null);

  // Feedback
  const [toastMessage, setToastMessage] = useState('');

  // Notificações
  const [notificationsChecked, setNotificationsChecked] = useState(false);

  // ========================================
  // Toast helper
  // ========================================
  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  // ========================================
  // Persistência — localStorage (sempre roda)
  // ========================================
  useEffect(() => {
    try {
      const savedDates = localStorage.getItem('date_plan_dates');
      const savedBudgets = localStorage.getItem('date_plan_budgets');
      const savedCovers = localStorage.getItem('date_plan_covers');
      if (savedDates) setDates(JSON.parse(savedDates));
      if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
      if (savedCovers) setCoverPhotos(JSON.parse(savedCovers));

      // Migrar orçamento antigo
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

  // Verificar notificações (uma vez por sessão)
  useEffect(() => {
    if (dates.length > 0 && !notificationsChecked && user) {
      setNotificationsChecked(true);
      checkAndNotify(dates).then((notified) => {
        if (notified.length > 0) {
          showToast(`🔔 ${notified.length} lembrete${notified.length > 1 ? 's' : ''} enviado${notified.length > 1 ? 's' : ''}!`);
        }
      });
    }
  }, [dates, notificationsChecked, user, showToast]);

  // ========================================
  // Cálculos de orçamento
  // ========================================
  const currentMonthKey = getMonthKey(currentMonth, currentYear);
  const monthBudget = budgets[currentMonthKey] || 0;
  const monthSpent = dates
    .filter((d) => d.date && d.date.startsWith(currentMonthKey))
    .reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
  const monthRemaining = monthBudget - monthSpent;

  // ========================================
  // Navegação do calendário
  // ========================================
  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const getNextMonth = () => {
    if (currentMonth === 11) return { month: 0, year: currentYear + 1 };
    return { month: currentMonth + 1, year: currentYear };
  };

  const getNextMonthName = () => {
    const { month, year } = getNextMonth();
    return `${MONTH_NAMES[month]} ${year}`;
  };

  // ========================================
  // CRUD de dates
  // ========================================
  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr); setEditingDate(null); setShowDateModal(true);
  };

  const handleDateClick = (dateEntry) => {
    setEditingDate(dateEntry); setSelectedDate(null); setShowDateModal(true);
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

    if (cost > 0 && monthBudget > 0) {
      const existingCost = isEditing
        ? parseFloat(dates.find((d) => d.id === dateData.id)?.cost) || 0
        : 0;
      const additionalCost = cost - existingCost;
      if (additionalCost > 0 && additionalCost > monthRemaining) {
        setPendingDate(dateData); setShowDateModal(false); setShowBudgetAlert(true);
        return;
      }
    }

    saveDateDirectly(dateData);
    showToast(isEditing ? '✏️ Date atualizado!' : '❤️ Date criado com sucesso!');
  };

  const handleRescheduleNextMonth = () => {
    if (!pendingDate) return;
    const { month, year } = getNextMonth();
    const day = pendingDate.date ? pendingDate.date.split('-')[2] : '01';
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(parseInt(day), lastDay);
    const safeDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    saveDateDirectly({ ...pendingDate, date: safeDateStr });
    setPendingDate(null); setShowBudgetAlert(false);
    showToast(`📅 Date agendado para ${MONTH_NAMES[month]}!`);
  };

  const handleForceCreate = () => {
    if (!pendingDate) return;
    saveDateDirectly(pendingDate);
    setPendingDate(null); setShowBudgetAlert(false);
    showToast('❤️ Date criado (acima do orçamento)!');
  };

  const handleDeleteDate = async (dateId) => {
    setDates((prev) => prev.filter((d) => d.id !== dateId));
    try { await deleteAlbum(dateId); } catch (e) { console.warn('Erro ao deletar álbum:', e); }
    setCoverPhotos((prev) => { const u = { ...prev }; delete u[dateId]; return u; });
    showToast('🗑️ Date removido');
  };

  const handleToggleCompleted = (dateId) => {
    setDates((prev) =>
      prev.map((d) => {
        if (d.id === dateId) {
          const nowCompleted = !d.completed;
          if (nowCompleted) showToast('🎉 Muito bom, continue assim!');
          return { ...d, completed: nowCompleted };
        }
        return d;
      })
    );
  };

  const handleBudgetChange = (newBudget) => {
    setBudgets((prev) => ({ ...prev, [currentMonthKey]: newBudget }));
    showToast('💰 Orçamento atualizado!');
  };

  const handleOpenGallery = (dateEntry) => {
    setGalleryDate(dateEntry); setShowPhotoGallery(true);
  };

  const handleCoverChange = (dateId, dataUrl) => {
    setCoverPhotos((prev) => {
      const u = { ...prev };
      if (dataUrl) u[dateId] = dataUrl; else delete u[dateId];
      return u;
    });
  };

  const handleLogout = async () => {
    if (confirm('Deseja sair da sua conta?')) {
      await logout();
    }
  };

  const handleSelectGroup = (group) => {
    setShowGroupsPanel(false);
    setActiveGroup(group);
  };

  // ========================================
  // Render — Auth Loading
  // ========================================
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__heart">❤️</div>
        <p className="auth-loading__text">Carregando...</p>
      </div>
    );
  }

  // ========================================
  // Render — Login Screen
  // ========================================
  if (!user) {
    return <AuthScreen />;
  }

  // ========================================
  // Render — Group View
  // ========================================
  if (activeGroup) {
    return (
      <>
        <GroupView
          group={activeGroup}
          onBack={() => setActiveGroup(null)}
          showToast={showToast}
        />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  // ========================================
  // Render — Personal Calendar
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
        onGroupsClick={() => setShowGroupsPanel(true)}
        onLogout={handleLogout}
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
        onClick={() => { setSelectedDate(null); setEditingDate(null); setShowDateModal(true); }}
        aria-label="Adicionar novo date"
      >
        +
      </button>

      {/* Modal — Criar/Editar date */}
      <DateModal
        isOpen={showDateModal}
        onClose={() => { setShowDateModal(false); setEditingDate(null); setSelectedDate(null); }}
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
        onClose={() => { setShowBudgetAlert(false); setPendingDate(null); }}
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
        onClose={() => { setShowPhotoGallery(false); setGalleryDate(null); }}
        dateEntry={galleryDate}
        onCoverChange={handleCoverChange}
      />

      {/* Configurações de notificação */}
      <NotificationSettings
        isOpen={showNotifSettings}
        onClose={() => setShowNotifSettings(false)}
      />

      {/* Painel de Grupos */}
      <GroupsPanel
        isOpen={showGroupsPanel}
        onClose={() => setShowGroupsPanel(false)}
        onSelectGroup={handleSelectGroup}
      />

      {/* Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}

export default App;
