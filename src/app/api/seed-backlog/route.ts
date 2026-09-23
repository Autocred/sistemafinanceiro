import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  if (adminDb) {
    await adminDb.collection('saas_backlog').add({ titulo: 'Novo menu Formas de Pagamento (Personalizado)', tipo: 'novo', status: 'pendente', data: new Date().toISOString() });
    await adminDb.collection('saas_backlog').add({ titulo: 'Correção: Menu Atualizações redirecionando para Dashboard', tipo: 'correcao', status: 'pendente', data: new Date().toISOString() });
    await adminDb.collection('saas_backlog').add({ titulo: 'Visual Bradesco Premium nas Telas de Cadastro (Bordas arredondadas)', tipo: 'melhoria', status: 'pendente', data: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}
