import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: 'no db' });

  const releaseId = 'v3.6.2-pwa';
  
  const release = {
    versao: 'v3.6.2',
    titulo: 'PWA Nativo 100% White Label',
    descricao: 'O sistema agora é oficialmente um Aplicativo Progressivo (PWA) nativo com suporte dinâmico a White Label. Clientes agora podem instalar o aplicativo em seus dispositivos e o ícone adotará a marca da empresa.',
    changes: [
      { tipo: 'novo', texto: 'Botão e Popup nativo de "Instalar Aplicativo" no Android e iOS.' },
      { tipo: 'novo', texto: 'Geração Dinâmica de Manifesto (App White Label): O ícone e o nome do app instalado mudam conforme o cliente (Tenant).' },
      { tipo: 'melhoria', texto: 'Service Worker atualizado para suporte offline.' },
      { tipo: 'novo', texto: 'Botão manual "Baixar App" adicionado ao menu lateral principal.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  try {
    await db.collection('saas_releases').doc(releaseId).set(release);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
