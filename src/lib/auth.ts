'use client';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { getDb, getFirebaseApp } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cpf?: string;
  avatar?: string;
  ativo?: boolean;
  status: 'pendente' | 'aprovado' | 'recusado' | 'desativado';
  role: 'admin' | 'manager' | 'financeiro' | 'user';
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  tenantId?: string;
  forceLogout?: boolean;
  permissoes?: Record<string, boolean>;
  username?: string;
  requirePasswordChange?: boolean;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return getAuth(app);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  if (typeof window === 'undefined') return null;
  try {
    const docSnap = await getDoc(doc(getDb(), 'users', uid));
    if (docSnap.exists()) {
      return docSnap.data() as AppUser;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário", error);
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<AppUser>): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const docRef = doc(getDb(), 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil do usuário", error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeAuth(
  callback: (user: FirebaseUser | null, profile: AppUser | null) => void
) {
  return onAuthStateChanged(getFirebaseAuth(), async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    const profile = await getUserProfile(user.uid);
    callback(user, profile);
  });
}

export async function resetarSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}
