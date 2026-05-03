/**
 * groupService.js — Serviço de Grupos (localStorage)
 * 
 * CRUD completo de grupos com sistema de convite por código.
 * Arquitetura preparada para futura migração para API/backend.
 * 
 * Estrutura no localStorage (chave: 'date_plan_groups'):
 * Array de grupos, cada um com: id, name, code, ownerUid, members[], dates[], createdAt
 */

const STORAGE_KEY = 'date_plan_groups';

// ========================================
// Helpers
// ========================================

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I/O/0/1 para evitar confusão
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function loadGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGroups(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

// ========================================
// CRUD de Grupos
// ========================================

/**
 * Cria um novo grupo
 * @returns {Object} O grupo criado
 */
export function createGroup(name, ownerUid, ownerEmail) {
  const groups = loadGroups();

  // Gerar código único (verificar colisão)
  let code;
  do {
    code = generateInviteCode();
  } while (groups.some((g) => g.code === code));

  const newGroup = {
    id: generateId(),
    name: name.trim(),
    code,
    ownerUid,
    members: [
      { uid: ownerUid, email: ownerEmail, role: 'owner', joinedAt: new Date().toISOString() },
    ],
    dates: [],
    createdAt: new Date().toISOString(),
  };

  groups.push(newGroup);
  saveGroups(groups);
  return newGroup;
}

/**
 * Retorna todos os grupos onde o usuário é membro ou owner
 */
export function getMyGroups(uid) {
  const groups = loadGroups();
  return groups.filter((g) => g.members.some((m) => m.uid === uid));
}

/**
 * Retorna um grupo pelo ID
 */
export function getGroupById(groupId) {
  const groups = loadGroups();
  return groups.find((g) => g.id === groupId) || null;
}

/**
 * Entra em um grupo via código de convite
 * @returns {{ success: boolean, group?: Object, error?: string }}
 */
export function joinGroupByCode(code, uid, email) {
  const groups = loadGroups();
  const group = groups.find((g) => g.code === code.toUpperCase().trim());

  if (!group) {
    return { success: false, error: 'Código de convite inválido' };
  }

  // Verificar se já é membro
  if (group.members.some((m) => m.uid === uid)) {
    return { success: false, error: 'Você já faz parte deste grupo' };
  }

  // Adicionar membro
  group.members.push({
    uid,
    email,
    role: 'member',
    joinedAt: new Date().toISOString(),
  });

  saveGroups(groups);
  return { success: true, group };
}

/**
 * Remove um membro do grupo (apenas o owner pode)
 */
export function removeGroupMember(groupId, ownerUid, memberUid) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid !== ownerUid) return { success: false, error: 'Apenas o criador pode remover membros' };
  if (memberUid === ownerUid) return { success: false, error: 'O criador não pode se remover' };

  group.members = group.members.filter((m) => m.uid !== memberUid);
  saveGroups(groups);
  return { success: true };
}

/**
 * Sair de um grupo voluntariamente
 */
export function leaveGroup(groupId, uid) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid === uid) return { success: false, error: 'O criador não pode sair do grupo. Delete-o.' };

  group.members = group.members.filter((m) => m.uid !== uid);
  saveGroups(groups);
  return { success: true };
}

/**
 * Deleta um grupo (apenas o owner pode)
 */
export function deleteGroup(groupId, ownerUid) {
  let groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid !== ownerUid) return { success: false, error: 'Apenas o criador pode deletar o grupo' };

  groups = groups.filter((g) => g.id !== groupId);
  saveGroups(groups);
  return { success: true };
}

// ========================================
// CRUD de Dates dentro de Grupos
// ========================================

/**
 * Retorna os dates de um grupo
 */
export function getGroupDates(groupId) {
  const group = getGroupById(groupId);
  return group ? group.dates : [];
}

/**
 * Salva (cria ou atualiza) um date no grupo
 */
export function saveGroupDate(groupId, dateData) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const idx = group.dates.findIndex((d) => d.id === dateData.id);
  if (idx >= 0) {
    group.dates[idx] = { ...group.dates[idx], ...dateData };
  } else {
    group.dates.push(dateData);
  }

  saveGroups(groups);
  return dateData;
}

/**
 * Remove um date de um grupo
 */
export function deleteGroupDate(groupId, dateId) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;

  group.dates = group.dates.filter((d) => d.id !== dateId);
  saveGroups(groups);
  return true;
}

/**
 * Marca/desmarca um date como concluído
 */
export function toggleGroupDateCompleted(groupId, dateId) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const date = group.dates.find((d) => d.id === dateId);
  if (!date) return null;

  date.completed = !date.completed;
  saveGroups(groups);
  return date;
}
