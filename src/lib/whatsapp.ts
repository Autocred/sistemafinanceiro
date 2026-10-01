// lib/whatsapp.ts
// Módulo de Integração com WhatsApp (Arquitetura Desacoplada)

/**
 * Função principal para disparar mensagens de WhatsApp.
 * Esta função deve ser adaptada para a API escolhida (Z-API, Evolution API, Meta API, etc).
 */
export async function enviarMensagemWhatsApp(numero: string, mensagem: string, apiUrl?: string, apiToken?: string) {
  try {
    // FORMATAR NÚMERO
    // Remove tudo que não for dígito
    let numStr = numero.replace(/\D/g, '');
    if (!numStr.startsWith('55')) numStr = '55' + numStr; // Assume DDI do Brasil se não houver

    console.log(`[WHATSAPP] Preparando envio para: ${numStr}`);
    console.log(`[WHATSAPP] Mensagem:\n${mensagem}`);

    // =========================================================================
    
    const WHATSAPP_API_URL = apiUrl || process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = apiToken || process.env.WHATSAPP_API_TOKEN;
    const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'autocred';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      // 1. Ping para acordar o servidor Railway (pode estar dormindo)
      console.log('[WHATSAPP] Acordando servidor Railway...');
      try {
        await fetch(`${WHATSAPP_API_URL}/`, { signal: AbortSignal.timeout(8000) });
      } catch (e) {
        console.log('[WHATSAPP] Ping timeout (normal se servidor estava dormindo). Aguardando 3s...');
        await new Promise(r => setTimeout(r, 3000));
      }

      // 2. Enviar mensagem com timeout de 15s
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

// IMPLEMENTAÇÃO REAL DA API VAI AQUI (SUBSTITUA PELO SEU GATEWAY)
    // =========================================================================
    // Exemplo genérico:
    /*
    const apiKey = process.env.WHATSAPP_API_KEY;
    const url = process.env.WHATSAPP_API_URL;
    
    const response = await fetch(`${url}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        number: numStr,
        text: mensagem
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API do WhatsApp: ${await response.text()}`);
    }
    */
    
    // Simulação de sucesso para fins de log
    return { sucesso: true, messageId: 'simulated_' + Date.now() };
  } catch (error) {
    console.error('[WHATSAPP] Erro ao enviar mensagem:', error);
    return { sucesso: false, erro: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
