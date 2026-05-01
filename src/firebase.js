import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let db = null;

/**
 * Inicializa o Firebase se houver uma configuração válida
 * @param {object} config - Configuração do Firebase do usuário
 */
export function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) {
    db = null;
    return null;
  }

  try {
    // Se já estiver inicializado, não faz nada (ou re-inicializa se necessário, 
    // mas o Firebase desencoraja re-inicializar o app '[DEFAULT]')
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(config);
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    db = null;
    return null;
  }
}

/**
 * Retorna a instância do Firestore
 */
export function getDb() {
  return db;
}
