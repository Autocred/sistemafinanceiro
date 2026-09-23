'use client';

import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getDb } from './firebase';
import { AuditLogRecord } from './types';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function detectEnvironment() {
  if (!isBrowser()) return { os: 'Servidor', browser: 'Desconhecido', device: 'Desktop' };
  const ua = navigator.userAgent;
  let os = 'Outro';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Outro';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Celular / Tablet' : 'Desktop';
  return { os, browser, device };
}

export async function registrarAuditoria(params: {
  usuarioNome?: string;
  usuarioEmail?: string;
  usuarioRole?: string;
  acao: string;
  categoria: 'financeiro' | 'seguranca' | 'sistema' | 'usuario';
  detalhes: string;
  resultado: 'SUCESSO' | 'FALHA' | 'NEGADO' | 'ALERTA';
}): Promise<void> {
  if (!isBrowser()) return;
  try {
    const now = new Date();
    const data = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];
    const env = detectEnvironment();
    const id = gerarId();
    const sessionName = isBrowser() ? (localStorage.getItem('current_user_name') || sessionStorage.getItem('current_user_name')) : null;
    const sessionEmail = isBrowser() ? (localStorage.getItem('current_user_email') || sessionStorage.getItem('current_user_email')) : null;
    const sessionRole = isBrowser() ? (localStorage.getItem('current_user_role') || sessionStorage.getItem('current_user_role')) : null;
    const sessionStart = isBrowser() ? (localStorage.getItem('current_session_start') || sessionStorage.getItem('current_session_start')) : null;
    
    let extraDetails = '';
    if (sessionStart) {
      const sd = new Date(sessionStart);
      extraDetails = ` [Sessão: ${sd.toLocaleDateString('pt-BR')} ${sd.getHours().toString().padStart(2,'0')}h${sd.getMinutes().toString().padStart(2,'0')}]`;
    }

    const record: AuditLogRecord = {
      id,
      data,
      hora,
      usuarioNome: params.usuarioNome || sessionName || 'Sistema / Convidado',
      usuarioEmail: params.usuarioEmail || sessionEmail || 'sistema@financeai.com',
      usuarioRole: params.usuarioRole || sessionRole || 'usuario',
      acao: params.acao,
      categoria: params.categoria,
      detalhes: params.detalhes + extraDetails,
      resultado: params.resultado,
      ip: 'Localhost / Dynamic',
      navegador: env.browser,
      os: env.os,
      dispositivo: env.device,
      criadoEm: now.toISOString(),
    };

    await setDoc(doc(getDb(), 'auditoria', id), record);
  } catch (e) {
    console.error('[AUDIT LOG ERROR]', e);
  }
}

export async function getAuditoriaLogs(limite: number = 200): Promise<AuditLogRecord[]> {
  if (!isBrowser()) return [];
  try {
    const q = query(collection(getDb(), 'auditoria'), orderBy('criadoEm', 'desc'), limit(limite));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogRecord));
  } catch (e) {
    console.error('[AUDIT FETCH ERROR]', e);
    return [];
  }
}
