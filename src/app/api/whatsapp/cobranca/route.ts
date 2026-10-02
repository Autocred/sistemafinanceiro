import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { numero, mensagem, tenantId } = body;

    if (!numero) {
      return NextResponse.json({ error: 'Número de WhatsApp do cliente não informado.' }, { status: 400 });
    }

    if (!mensagem) {
      return NextResponse.json({ error: 'Mensagem de cobrança não informada.' }, { status: 400 });
    }

    // Obter configurações da API do WhatsApp
    const db = adminDb!;
    let apiUrl: string | undefined;
    let apiToken: string | undefined;

    // Se tiver tenantId, tenta buscar do config do tenant
    if (tenantId && tenantId !== 'master') {
      try {
        const tenantSnap = await db.collection(`tenants/${tenantId}/config`).doc('geral').get();
        if (tenantSnap.exists) {
          const data = tenantSnap.data();
          if (data?.whatsappApiUrl) apiUrl = data.whatsappApiUrl;
          if (data?.whatsappApiToken) apiToken = data.whatsappApiToken;
        }
      } catch (e) {}
    }

    // Fallback para configuracoes/geral
    if (!apiUrl || !apiToken) {
      try {
        const configSnap = await db.collection('configuracoes').doc('geral').get();
        if (configSnap.exists) {
          const data = configSnap.data();
          if (!apiUrl) apiUrl = data?.whatsappApiUrl;
          if (!apiToken) apiToken = data?.whatsappApiToken;
        }
      } catch (e) {}
    }

    console.log(`[API COBRANCA PIX] Enviando cobrança interna via Evolution API para ${numero}...`);
    const resultado = await enviarMensagemWhatsApp(numero, mensagem, apiUrl, apiToken);

    if (resultado.sucesso) {
      return NextResponse.json({ success: true, retorno: resultado.retorno });
    } else {
      return NextResponse.json({ success: false, error: resultado.erro || 'Falha ao entregar mensagem no WhatsApp' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API COBRANCA PIX] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
