// lib/whatsapp.ts
// Módulo de Integração com WhatsApp (Arquitetura Desacoplada)

/**
 * Consulta a API do WhatsApp (Evolution API) para obter o JID exato registrado no servidor.
 * Resolve divergências de 9º dígito em contas brasileiras (ex: 5549998266304 -> 554998266304).
 */
async function resolverNumeroWhatsAppReal(
  numero: string,
  apiUrl: string,
  apiToken: string,
  instanceName: string
): Promise<string> {
  let numStr = numero.replace(/\D/g, '');
  if (!numStr.startsWith('55')) numStr = '55' + numStr;

  try {
    const res = await fetch(`${apiUrl}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiToken },
      body: JSON.stringify({ numbers: [numStr] }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.jid) {
        const resolved = data[0].jid.split('@')[0];
        if (resolved && resolved.length >= 10) {
          console.log(`[WHATSAPP RESOLVER] Número ${numStr} resolvido para JID oficial: ${resolved}`);
          return resolved;
        }
      }
    }
  } catch (err: any) {
    console.log('[WHATSAPP RESOLVER] Consulta de JID falhou ou timed out:', err.message);
  }

  return numStr;
}

/**
 * Função principal para disparar mensagens de texto no WhatsApp.
 */
export async function enviarMensagemWhatsApp(numero: string, mensagem: string, apiUrl?: string, apiToken?: string) {
  try {
    let numStr = numero.replace(/\D/g, '');
    if (!numStr.startsWith('55')) numStr = '55' + numStr;

    const WHATSAPP_API_URL = apiUrl || process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = apiToken || process.env.WHATSAPP_API_TOKEN;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'autocred';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      try {
        await fetch(`${WHATSAPP_API_URL}/`, { signal: AbortSignal.timeout(5000) });
      } catch (e) {
        console.log('[WHATSAPP] Ping timeout.');
      }

      // Resolve o JID real do destinatário
      numStr = await resolverNumeroWhatsAppReal(numStr, WHATSAPP_API_URL, WHATSAPP_API_TOKEN, INSTANCE_NAME);

      console.log(`[WHATSAPP] Disparando texto para: ${numStr}`);

      const endpoint = `${WHATSAPP_API_URL}/message/sendText/${INSTANCE_NAME}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: WHATSAPP_API_TOKEN },
        body: JSON.stringify({
          number: numStr,
          text: mensagem,
          options: { delay: 1000, presence: 'composing' }
        }),
        signal: AbortSignal.timeout(20000)
      });

      const result = await response.text();
      console.log(`[WHATSAPP] Resposta (${response.status}):`, result);

      if (!response.ok) {
        console.error('[WHATSAPP] Erro na API:', result);
        return { sucesso: false, erro: result };
      }

      console.log('[WHATSAPP] ✅ Mensagem entregue com sucesso!');
      return { sucesso: true, retorno: result };
    } else {
      console.log('[WHATSAPP AVISO] Variáveis de ambiente ausentes. Mensagem simulada.');
      return { sucesso: false, erro: 'Configurações de WhatsApp ausentes' };
    }
  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao enviar mensagem:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Função para disparar documentos/PDFs via WhatsApp (Evolution API / Gateway)
 */
export async function enviarDocumentoWhatsApp(
  numero: string,
  base64Pdf: string,
  nomeArquivo: string,
  legenda?: string,
  apiUrl?: string,
  apiToken?: string
) {
  try {
    let numStr = numero.replace(/\D/g, '');
    if (!numStr.startsWith('55')) numStr = '55' + numStr;

    const WHATSAPP_API_URL = apiUrl || process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = apiToken || process.env.WHATSAPP_API_TOKEN;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'autocred';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      try {
        await fetch(`${WHATSAPP_API_URL}/`, { signal: AbortSignal.timeout(5000) });
      } catch (e) {
        console.log('[WHATSAPP DOC] Ping timeout.');
      }

      // Resolve o JID real do destinatário
      numStr = await resolverNumeroWhatsAppReal(numStr, WHATSAPP_API_URL, WHATSAPP_API_TOKEN, INSTANCE_NAME);

      console.log(`[WHATSAPP DOC] Disparando documento ${nomeArquivo} para: ${numStr}`);

      const cleanBase64 = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf;
      const mediaUri = `data:application/pdf;base64,${cleanBase64}`;

      const endpoint = `${WHATSAPP_API_URL}/message/sendMedia/${INSTANCE_NAME}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: WHATSAPP_API_TOKEN },
        body: JSON.stringify({
          number: numStr,
          mediaMessage: {
            mediatype: 'document',
            fileName: nomeArquivo,
            caption: legenda || '',
            media: mediaUri
          },
          options: { delay: 1000, presence: 'composing' }
        }),
        signal: AbortSignal.timeout(30000)
      });

      const result = await response.text();
      console.log(`[WHATSAPP DOC] Resposta (${response.status}):`, result);

      if (!response.ok) {
        console.error('[WHATSAPP DOC] Erro na API:', result);
        return { sucesso: false, erro: result };
      }

      console.log('[WHATSAPP DOC] ✅ Documento PDF entregue com sucesso!');
      return { sucesso: true, retorno: result };
    } else {
      console.log('[WHATSAPP DOC] Credenciais ausentes. Modo simulação.');
      return { sucesso: false, erro: 'Configurações de WhatsApp ausentes' };
    }
  } catch (error: any) {
    console.error('[WHATSAPP DOC] Erro ao enviar documento:', error);
    return { sucesso: false, erro: error.message };
  }
}
