// lib/whatsapp.ts
// Módulo de Integração com WhatsApp (Arquitetura Desacoplada)

/**
 * Função principal para disparar mensagens de texto no WhatsApp.
 */
export async function enviarMensagemWhatsApp(numero: string, mensagem: string, apiUrl?: string, apiToken?: string) {
  try {
    let numStr = numero.replace(/\D/g, '');
    if (!numStr.startsWith('55')) numStr = '55' + numStr;

    console.log(`[WHATSAPP] Preparando envio para: ${numStr}`);

    const WHATSAPP_API_URL = apiUrl || process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = apiToken || process.env.WHATSAPP_API_TOKEN;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'autocred';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      try {
        await fetch(`${WHATSAPP_API_URL}/`, { signal: AbortSignal.timeout(5000) });
      } catch (e) {
        console.log('[WHATSAPP] Ping timeout (servidor pode estar acordando).');
      }

      const endpoint = `${WHATSAPP_API_URL}/message/sendText/${INSTANCE_NAME}`;
      console.log(`[WHATSAPP] Enviando para: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': WHATSAPP_API_TOKEN },
        body: JSON.stringify({
          number: numStr,
          text: mensagem,
          options: { delay: 1200, presence: 'composing' }
        }),
        signal: AbortSignal.timeout(15000)
      });

      const result = await response.text();
      console.log(`[WHATSAPP] Resposta (${response.status}):`, result);

      if (!response.ok) {
        console.error('[WHATSAPP] Erro na API:', result);
      } else {
        console.log('[WHATSAPP] ✅ Mensagem enviada com sucesso!');
      }
    } else {
      console.log('[WHATSAPP AVISO] Variáveis de ambiente ausentes. Mensagem não enviada de verdade.');
    }

    return { sucesso: true, messageId: 'simulated_' + Date.now() };
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar mensagem:', error);
    return { sucesso: false, erro: error instanceof Error ? error.message : 'Erro desconhecido' };
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

    console.log(`[WHATSAPP DOC] Preparando envio de arquivo ${nomeArquivo} para: ${numStr}`);

    const WHATSAPP_API_URL = apiUrl || process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = apiToken || process.env.WHATSAPP_API_TOKEN;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'autocred';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      try {
        await fetch(`${WHATSAPP_API_URL}/`, { signal: AbortSignal.timeout(5000) });
      } catch (e) {
        console.log('[WHATSAPP DOC] Ping timeout.');
      }

      const cleanBase64 = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf;
      const mediaUri = `data:application/pdf;base64,${cleanBase64}`;

      const endpoint = `${WHATSAPP_API_URL}/message/sendMedia/${INSTANCE_NAME}`;
      console.log(`[WHATSAPP DOC] Enviando documento para: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': WHATSAPP_API_TOKEN },
        body: JSON.stringify({
          number: numStr,
          mediaMessage: {
            mediatype: 'document',
            fileName: nomeArquivo,
            caption: legenda || '',
            media: mediaUri
          },
          options: { delay: 1200, presence: 'composing' }
        }),
        signal: AbortSignal.timeout(30000)
      });

      const result = await response.text();
      console.log(`[WHATSAPP DOC] Resposta (${response.status}):`, result);

      if (!response.ok) {
        console.error('[WHATSAPP DOC] Erro na API:', result);
        return { sucesso: false, erro: result };
      }

      console.log('[WHATSAPP DOC] ✅ Documento PDF enviado com sucesso!');
      return { sucesso: true, retorno: result };
    } else {
      console.log('[WHATSAPP DOC] Credenciais ausentes. Modo simulação.');
      return { sucesso: true, messageId: 'simulated_doc_' + Date.now() };
    }
  } catch (error: any) {
    console.error('[WHATSAPP DOC] Erro ao enviar documento:', error);
    return { sucesso: false, erro: error.message };
  }
}
