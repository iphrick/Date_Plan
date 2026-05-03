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
 * @param {string} displayName - Username do usuário
 * @returns {Object} O grupo criado (com id do Firestore)
 */
export async function createGroup(name, ownerUid, displayName) {
  let code = generateInviteCode();

  const groupData = {
    name: name.trim(),
    code,
    ownerUid,
    memberUids: [ownerUid],
    members: [
      { uid: ownerUid, displayName, role: 'owner', joinedAt: new Date().toISOString() },
    ],
    dates: [],
    createdAt: serverTimestamp(),
  };

  console.log('[GroupService] Criando grupo:', { name: groupData.name, code, ownerUid });

  const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);

  console.log('[GroupService] ✅ Grupo criado com sucesso! ID:', docRef.id, 'Código:', code);

  return { id: docRef.id, ...groupData };
}

/**
 * Retorna todos os grupos onde o usuário é membro
 */
export async function getMyGroups(uid) {
  console.log('[GroupService] Buscando grupos do usuário:', uid);
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('memberUids', 'array-contains', uid)
  );
  const snapshot = await getDocs(q);
  console.log('[GroupService] Grupos encontrados:', snapshot.size);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
 * @param {string} displayName - Username do usuário
 * @returns {{ success: boolean, group?: Object, error?: string }}
 */
export async function joinGroupByCode(code, uid, displayName) {
  const cleanCode = code.toUpperCase().trim();
  console.log('[GroupService] Tentando entrar com código:', cleanCode);

  try {
    // Abordagem 1: Query direta por código
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('code', '==', cleanCode)
    );
    const snapshot = await getDocs(q);

    console.log('[GroupService] Query por código - documentos encontrados:', snapshot.size);

    // Se a query direta falhar (0 resultados), tenta buscar TODOS e filtrar
    // Isso diagnostica se o problema é na query ou nos dados
    if (snapshot.empty) {
      console.log('[GroupService] Query direta vazia. Tentando busca completa...');

      const allSnapshot = await getDocs(collection(db, GROUPS_COLLECTION));
      console.log('[GroupService] Total de grupos no Firestore:', allSnapshot.size);

      let foundGroup = null;
      allSnapshot.forEach((d) => {
        const data = d.data();
        console.log('[GroupService] Grupo:', d.id, '→ code:', data.code, '| name:', data.name);
        if (data.code === cleanCode) {
          foundGroup = { id: d.id, ...data };
        }
      });

      if (!foundGroup) {
        console.log('[GroupService] ❌ Código não existe em nenhum grupo');
        return { success: false, error: 'Código de convite inválido. Verifique se digitou corretamente.' };
      }

      // Encontrado via busca completa — usar este grupo
      console.log('[GroupService] ✅ Grupo encontrado via busca completa:', foundGroup.name);

      if (foundGroup.memberUids && foundGroup.memberUids.includes(uid)) {
        return { success: false, error: 'Você já faz parte deste grupo' };
      }

      await updateDoc(doc(db, GROUPS_COLLECTION, foundGroup.id), {
        memberUids: arrayUnion(uid),
        members: arrayUnion({
          uid,
          displayName,
          role: 'member',
          joinedAt: new Date().toISOString(),
        }),
      });

      return { success: true, group: foundGroup };
    }

    // Query direta encontrou resultados
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();
    console.log('[GroupService] ✅ Grupo encontrado:', groupData.name);

    if (groupData.memberUids && groupData.memberUids.includes(uid)) {
      return { success: false, error: 'Você já faz parte deste grupo' };
    }

    await updateDoc(doc(db, GROUPS_COLLECTION, groupDoc.id), {
      memberUids: arrayUnion(uid),
      members: arrayUnion({
        uid,
        displayName,
        role: 'member',
        joinedAt: new Date().toISOString(),
      }),
    });

    return {
      success: true,
      group: { id: groupDoc.id, ...groupData },
    };
  } catch (err) {
    console.error('[GroupService] ❌ Erro ao buscar grupo:', err.code, err.message);
    return {
      success: false,
      error: `Erro ao buscar grupo: ${err.code || err.message}. Verifique as regras do Firestore.`,
    };
  }
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
