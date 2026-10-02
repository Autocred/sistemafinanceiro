import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp, enviarDocumentoWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { numero, mensagem, pdfBase64, nomeArquivo, tenantId } = body;

    if (!numero) {
      return NextResponse.json({ error: 'Número de WhatsApp do cliente não informado.' }, { status: 400 });
    }

    if (!mensagem && !pdfBase64) {
      return NextResponse.json({ error: 'Nenhum conteúdo (mensagem ou PDF) informado para cobrança.' }, { status: 400 });
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

    let docResult: any = null;
    let msgResult: any = null;

    // 1. Enviar PDF da fatura com QR Code se fornecido
    if (pdfBase64) {
      console.log(`[API COBRANCA PIX] Enviando fatura PDF (${nomeArquivo || 'Fatura_PIX.pdf'})...`);
      docResult = await enviarDocumentoWhatsApp(
        numero,
        pdfBase64,
        nomeArquivo || 'Fatura_PIX.pdf',
        '📄 Segue em anexo a sua Fatura / Cobrança PIX detalhada com QR Code.',
        apiUrl,
        apiToken
      );
    }

    // 2. Enviar texto complementar com código Copia e Cola
    if (mensagem) {
      console.log(`[API COBRANCA PIX] Enviando texto com Copia e Cola...`);
      msgResult = await enviarMensagemWhatsApp(numero, mensagem, apiUrl, apiToken);
    }

    // Se algum dos envios teve sucesso
    const sucesso = (docResult && docResult.sucesso) || (msgResult && msgResult.sucesso);

    if (sucesso) {
      return NextResponse.json({
        success: true,
        docEnviado: docResult?.sucesso || false,
        msgEnviada: msgResult?.sucesso || false,
        retorno: docResult?.retorno || msgResult?.retorno
      });
    } else {
      const erro = docResult?.erro || msgResult?.erro || 'Falha ao entregar mensagem no WhatsApp';
      return NextResponse.json({ success: false, error: erro }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API COBRANCA PIX] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
