import { FormaPagamentoCustom } from './types';
import { getTenantId, isBrowser } from './storage';
import { query, collection, where, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';  
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';  
import { getStorage, FirebaseStorage } from 'firebase/storage';  

export const firebaseConfig = {  
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',  
  authDomain: 'sistemafinan.firebaseapp.com',  
  projectId: 'sistemafinan',  
  storageBucket: 'sistemafinan.firebasestorage.app',  
  messagingSenderId: '1019353725480',  
  appId: '1:1019353725480:web:a26ac2d2de24e8358d531d',  
  measurementId: 'G-RHLXQ3Z7W2'  
};  

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

export function getDb(): Firestore {
  const app = getFirebaseApp();
  if (!_db) {
    _db = getFirestore(app);
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(_db).catch((err) => {
        console.error('Offline persistence failed:', err);
      });
    }
  }
  return _db;
}

export function getStorageApp(): FirebaseStorage {
  const app = getFirebaseApp();
  if (!_storage) {
    _storage = getStorage(app);
  }
  return _storage;
}


// --- Formas de Pagamento Customizadas ---
export async function getFormasPagamentoCustom(): Promise<FormaPagamentoCustom[]> {
  if (!isBrowser()) return [];
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const q = query(collection(getDb(), 'formas_pagamento'), where('tenantId', '==', tenantId), orderBy('nome'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormaPagamentoCustom));
  } catch (err) {
    console.error('Erro ao buscar formas de pagamento:', err);
    return [];
  }
}
export async function addFormaPagamentoCustom(forma: Omit<FormaPagamentoCustom, 'id'>): Promise<string> {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('Tenant não definido');
  const docRef = doc(collection(getDb(), 'formas_pagamento'));
  await setDoc(docRef, { ...forma, tenantId });
  return docRef.id;
}
export async function updateFormaPagamentoCustom(id: string, forma: Partial<FormaPagamentoCustom>): Promise<void> {
  const docRef = doc(getDb(), 'formas_pagamento', id);
  await updateDoc(docRef, forma);
}
export async function deleteFormaPagamentoCustom(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'formas_pagamento', id));
}
