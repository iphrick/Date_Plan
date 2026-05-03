/**
 * groupService.js — Serviço de Grupos (Firebase Firestore)
 * 
 * CRUD completo de grupos com sistema de convite por código.
 * Dados compartilhados entre todos os usuários via Firestore.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const GROUPS_COLLECTION = 'groups';

// ========================================
// Helpers
// ========================================

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ========================================
// CRUD de Grupos
// ========================================

/**
 * Cria um novo grupo no Firestore
 * @returns {Object} O grupo criado (com id do Firestore)
 */
export async function createGroup(name, ownerUid, ownerEmail) {
  // Gerar código único
  let code = generateInviteCode();

  // Verificar colisão (raro mas possível)
  const codeQuery = query(collection(db, GROUPS_COLLECTION), where('code', '==', code));
  const existing = await getDocs(codeQuery);
  if (!existing.empty) {
    code = generateInviteCode(); // Tenta outro
  }

  const groupData = {
    name: name.trim(),
    code,
    ownerUid,
    memberUids: [ownerUid], // Array simples para queries eficientes
    members: [
      { uid: ownerUid, email: ownerEmail, role: 'owner', joinedAt: new Date().toISOString() },
    ],
    dates: [],
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);

  return { id: docRef.id, ...groupData };
}

/**
 * Retorna todos os grupos onde o usuário é membro
 */
export async function getMyGroups(uid) {
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('memberUids', 'array-contains', uid)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retorna um grupo pelo ID
 */
export async function getGroupById(groupId) {
  const docSnap = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * Entra em um grupo via código de convite
 * @returns {{ success: boolean, group?: Object, error?: string }}
 */
export async function joinGroupByCode(code, uid, email) {
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('code', '==', code.toUpperCase().trim())
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: 'Código de convite inválido' };
  }

  const groupDoc = snapshot.docs[0];
  const groupData = groupDoc.data();

  // Verificar se já é membro
  if (groupData.memberUids && groupData.memberUids.includes(uid)) {
    return { success: false, error: 'Você já faz parte deste grupo' };
  }

  // Adicionar membro ao grupo
  await updateDoc(doc(db, GROUPS_COLLECTION, groupDoc.id), {
    memberUids: arrayUnion(uid),
    members: arrayUnion({
      uid,
      email,
      role: 'member',
      joinedAt: new Date().toISOString(),
    }),
  });

  return {
    success: true,
    group: { id: groupDoc.id, ...groupData },
  };
}

/**
 * Remove um membro do grupo (apenas o owner pode)
 */
export async function removeGroupMember(groupId, ownerUid, memberUid) {
  const group = await getGroupById(groupId);
  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid !== ownerUid) return { success: false, error: 'Apenas o criador pode remover membros' };
  if (memberUid === ownerUid) return { success: false, error: 'O criador não pode se remover' };

  const memberToRemove = group.members.find((m) => m.uid === memberUid);
  if (!memberToRemove) return { success: false, error: 'Membro não encontrado' };

  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    memberUids: arrayRemove(memberUid),
    members: arrayRemove(memberToRemove),
  });

  return { success: true };
}

/**
 * Sair de um grupo voluntariamente
 */
export async function leaveGroup(groupId, uid) {
  const group = await getGroupById(groupId);
  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid === uid) return { success: false, error: 'O criador não pode sair do grupo. Delete-o.' };

  const memberData = group.members.find((m) => m.uid === uid);
  if (!memberData) return { success: false, error: 'Você não está neste grupo' };

  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    memberUids: arrayRemove(uid),
    members: arrayRemove(memberData),
  });

  return { success: true };
}

/**
 * Deleta um grupo (apenas o owner pode)
 */
export async function deleteGroup(groupId, ownerUid) {
  const group = await getGroupById(groupId);
  if (!group) return { success: false, error: 'Grupo não encontrado' };
  if (group.ownerUid !== ownerUid) return { success: false, error: 'Apenas o criador pode deletar o grupo' };

  await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
  return { success: true };
}

// ========================================
// CRUD de Dates dentro de Grupos
// ========================================

/**
 * Retorna os dates de um grupo
 */
export async function getGroupDates(groupId) {
  const group = await getGroupById(groupId);
  return group ? group.dates : [];
}

/**
 * Salva (cria ou atualiza) um date no grupo
 */
export async function saveGroupDate(groupId, dateData) {
  const group = await getGroupById(groupId);
  if (!group) return null;

  const dates = group.dates || [];
  const idx = dates.findIndex((d) => d.id === dateData.id);

  if (idx >= 0) {
    dates[idx] = { ...dates[idx], ...dateData };
  } else {
    dates.push(dateData);
  }

  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), { dates });
  return dateData;
}

/**
 * Remove um date de um grupo
 */
export async function deleteGroupDate(groupId, dateId) {
  const group = await getGroupById(groupId);
  if (!group) return false;

  const dates = (group.dates || []).filter((d) => d.id !== dateId);
  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), { dates });
  return true;
}

/**
 * Marca/desmarca um date como concluído
 */
export async function toggleGroupDateCompleted(groupId, dateId) {
  const group = await getGroupById(groupId);
  if (!group) return null;

  const dates = group.dates || [];
  const date = dates.find((d) => d.id === dateId);
  if (!date) return null;

  date.completed = !date.completed;
  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), { dates });
  return date;
}
