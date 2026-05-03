import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar';
import DateModal from './DateModal';
import BudgetPanel from './BudgetPanel';
import BudgetAlert from './BudgetAlert';
import PhotoGallery from './PhotoGallery';
import {
  getGroupById,
  saveGroupDate,
  deleteGroupDate,
  toggleGroupDateCompleted,
  removeGroupMember,
} from '../utils/groupService';

/**
 * GroupView — Visualização de um grupo selecionado
 * Reutiliza Calendar, DateModal, BudgetPanel, etc. com dados do grupo
 */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getMonthKey(month, year) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function GroupView({ group: initialGroup, onBack, showToast }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(initialGroup);
  const [showMembers, setShowMembers] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [dates, setDates] = useState(group.dates || []);
  const [budgets, setBudgets] = useState({});
  const [coverPhotos, setCoverPhotos] = useState({});

  // Modals
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  const [galleryDate, setGalleryDate] = useState(null);

  const isOwner = group.ownerUid === user?.uid;

  // Recarregar dados do grupo
  const refreshGroup = useCallback(() => {
    const updated = getGroupById(group.id);
    if (updated) {
      setGroup(updated);
      setDates(updated.dates || []);
    }
  }, [group.id]);

  // Carregar budgets do grupo do localStorage
  useEffect(() => {
    try {
      const key = `date_plan_group_budgets_${group.id}`;
      const saved = localStorage.getItem(key);
      if (saved) setBudgets(JSON.parse(saved));
    } catch {}
  }, [group.id]);

  // Salvar budgets do grupo
  useEffect(() => {
    if (Object.keys(budgets).length > 0) {
      localStorage.setItem(`date_plan_group_budgets_${group.id}`, JSON.stringify(budgets));
    }
  }, [budgets, group.id]);

  // Budget calculations
  const currentMonthKey = getMonthKey(currentMonth, currentYear);
  const monthBudget = budgets[currentMonthKey] || 0;
  const monthSpent = dates
    .filter((d) => d.date && d.date.startsWith(currentMonthKey))
    .reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
  const monthRemaining = monthBudget - monthSpent;

  // Navigation
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

  // CRUD
  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr); setEditingDate(null); setShowDateModal(true);
  };

  const handleDateClick = (dateEntry) => {
    setEditingDate(dateEntry); setSelectedDate(null); setShowDateModal(true);
  };

  const saveDateDirectly = (dateData) => {
    saveGroupDate(group.id, dateData);
    refreshGroup();
  };

  const handleSaveDate = (dateData) => {
    const isEditing = dates.some((d) => d.id === dateData.id);
    const cost = parseFloat(dateData.cost) || 0;

    if (cost > 0 && monthBudget > 0) {
      const existingCost = isEditing ? parseFloat(dates.find((d) => d.id === dateData.id)?.cost) || 0 : 0;
      const additionalCost = cost - existingCost;
      if (additionalCost > 0 && additionalCost > monthRemaining) {
        setPendingDate(dateData); setShowDateModal(false); setShowBudgetAlert(true);
        return;
      }
    }

    saveDateDirectly(dateData);
    showToast(isEditing ? '✏️ Date atualizado!' : '❤️ Date criado!');
  };

  const handleDeleteDate = (dateId) => {
    deleteGroupDate(group.id, dateId);
    refreshGroup();
    showToast('🗑️ Date removido');
  };

  const handleToggleCompleted = (dateId) => {
    const result = toggleGroupDateCompleted(group.id, dateId);
    if (result && result.completed) showToast('🎉 Muito bom, continue assim!');
    refreshGroup();
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

  const handleRemoveMember = (memberUid) => {
    const member = group.members.find((m) => m.uid === memberUid);
    if (!confirm(`Remover ${member?.email} do grupo?`)) return;
    const result = removeGroupMember(group.id, user.uid, memberUid);
    if (result.success) {
      refreshGroup();
      showToast('Membro removido.');
    } else {
      showToast(result.error);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <>
      {/* Group Header */}
      <header className="header group-header">
        <button className="header__nav-btn group-header__back" onClick={onBack} aria-label="Voltar">
          ←
        </button>

        <div className="group-header__info">
          <h2 className="group-header__name">{group.name}</h2>
          <div className="group-header__meta">
            <button className="group-header__code-btn" onClick={handleCopyCode}>
              📋 {copiedCode ? 'Copiado!' : group.code}
            </button>
            <button className="group-header__members-btn" onClick={() => setShowMembers(!showMembers)}>
              👤 {group.members.length}
            </button>
          </div>
        </div>

        {/* Nav Mês + Orçamento */}
        <div className="header__right">
          <div className="header__month-nav" style={{ minWidth: 'auto' }}>
            <button className="header__nav-btn" onClick={goToPrevMonth}>◀</button>
            <span className="header__month-label" style={{ fontSize: '0.75rem' }}>
              {MONTH_NAMES[currentMonth].substring(0, 3)} {currentYear}
            </span>
            <button className="header__nav-btn" onClick={goToNextMonth}>▶</button>
          </div>
          <button className="header__budget-btn" onClick={() => setShowBudgetPanel(true)} style={{ minWidth: '70px' }}>
            <div className="header__budget-info">
              <span className="header__budget-icon">💰</span>
              <div className="header__budget-text">
                <span className="header__budget-value">R$ {(monthBudget - monthSpent).toFixed(0)}</span>
                <span className="header__budget-label">restante</span>
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Members Panel (dropdown) */}
      {showMembers && (
        <div className="group-members-panel">
          <div className="group-members-panel__title">Membros do Grupo</div>
          {group.members.map((member) => (
            <div key={member.uid} className="group-member-item">
              <div className="group-member-item__avatar">
                {member.email[0].toUpperCase()}
              </div>
              <div className="group-member-item__info">
                <span className="group-member-item__email">{member.email}</span>
                <span className={`group-member-item__role group-member-item__role--${member.role}`}>
                  {member.role === 'owner' ? '👑 Criador' : 'Membro'}
                </span>
              </div>
              {isOwner && member.role !== 'owner' && (
                <button
                  className="group-member-item__remove"
                  onClick={() => handleRemoveMember(member.uid)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <Calendar
        currentMonth={currentMonth}
        currentYear={currentYear}
        dates={dates}
        coverPhotos={coverPhotos}
        onDayClick={handleDayClick}
        onDateClick={handleDateClick}
      />

      {/* FAB */}
      <button className="fab" onClick={() => { setSelectedDate(null); setEditingDate(null); setShowDateModal(true); }}>
        +
      </button>

      {/* Modals */}
      <DateModal
        isOpen={showDateModal}
        onClose={() => { setShowDateModal(false); setEditingDate(null); setSelectedDate(null); }}
        onSave={handleSaveDate}
        onDelete={handleDeleteDate}
        onToggleCompleted={handleToggleCompleted}
        onOpenGallery={(d) => { setGalleryDate(d); setShowPhotoGallery(true); }}
        onCoverChange={(id, url) => setCoverPhotos((p) => { const u = { ...p }; url ? u[id] = url : delete u[id]; return u; })}
        editingDate={editingDate}
        selectedDate={selectedDate}
      />

      <BudgetAlert
        isOpen={showBudgetAlert}
        onClose={() => { setShowBudgetAlert(false); setPendingDate(null); }}
        monthName={MONTH_NAMES[currentMonth]}
        nextMonthName={`${MONTH_NAMES[getNextMonth().month]} ${getNextMonth().year}`}
        remaining={Math.max(monthRemaining, 0)}
        dateCost={pendingDate ? parseFloat(pendingDate.cost) || 0 : 0}
        onReschedule={handleRescheduleNextMonth}
        onForceCreate={handleForceCreate}
      />

      <BudgetPanel
        isOpen={showBudgetPanel}
        onClose={() => setShowBudgetPanel(false)}
        budget={monthBudget}
        onBudgetChange={(val) => { setBudgets((p) => ({ ...p, [currentMonthKey]: val })); showToast('💰 Orçamento atualizado!'); }}
        dates={dates.filter((d) => d.date && d.date.startsWith(currentMonthKey))}
        monthName={MONTH_NAMES[currentMonth]}
        currentYear={currentYear}
      />

      <PhotoGallery
        isOpen={showPhotoGallery}
        onClose={() => { setShowPhotoGallery(false); setGalleryDate(null); }}
        dateEntry={galleryDate}
        onCoverChange={(id, url) => setCoverPhotos((p) => { const u = { ...p }; url ? u[id] = url : delete u[id]; return u; })}
      />
    </>
  );
}
