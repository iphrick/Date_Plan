/**
 * photoDb.js — Wrapper leve para IndexedDB
 * Armazena fotos de álbuns dos dates com suporte a blobs
 */

const DB_NAME = 'date_plan_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

/**
 * Abre (ou cria) o banco IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('dateId', 'dateId', { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Salva uma foto no álbum de um date
 * @param {string} dateId - ID do compromisso
 * @param {string} dataUrl - Imagem como data URL (base64)
 * @param {boolean} isCover - Se é a foto de capa
 * @returns {Promise<number>} ID da foto salva
 */
export async function savePhoto(dateId, dataUrl, isCover = false) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const photo = {
      dateId,
      dataUrl,
      isCover,
      createdAt: Date.now(),
    };

    const request = store.add(photo);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Busca todas as fotos de um date
 * @param {string} dateId
 * @returns {Promise<Array>} Array de fotos
 */
export async function getPhotos(dateId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('dateId');
    const request = index.getAll(dateId);

    request.onsuccess = (e) => resolve(e.target.result || []);
    request.onerror = (e) => reject(e.target.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Busca a foto de capa de um date
 * @param {string} dateId
 * @returns {Promise<object|null>} Foto de capa ou null
 */
export async function getCoverPhoto(dateId) {
  const photos = await getPhotos(dateId);
  // Priorizar a marcada como capa, senão pegar a primeira
  const cover = photos.find((p) => p.isCover);
  return cover || photos[0] || null;
}

/**
 * Define uma foto como capa (desmarca as outras)
 * @param {string} dateId
 * @param {number} photoId
 */
export async function setCoverPhoto(dateId, photoId) {
  const db = await openDB();
  const photos = await getPhotos(dateId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    photos.forEach((photo) => {
      const updated = { ...photo, isCover: photo.id === photoId };
      store.put(updated);
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Exclui uma foto individual
 * @param {number} photoId
 */
export async function deletePhoto(photoId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(photoId);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove todas as fotos de um date (ao excluir o date)
 * @param {string} dateId
 */
export async function deleteAlbum(dateId) {
  const db = await openDB();
  const photos = await getPhotos(dateId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    photos.forEach((photo) => {
      store.delete(photo.id);
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Conta fotos de um date
 * @param {string} dateId
 * @returns {Promise<number>}
 */
export async function getPhotoCount(dateId) {
  const photos = await getPhotos(dateId);
  return photos.length;
}
