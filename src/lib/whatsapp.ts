// lib/whatsapp.ts
// Módulo de Integração com WhatsApp (Arquitetura Desacoplada)

/**
 * Função principal para disparar mensagens de WhatsApp.
 * Esta função deve ser adaptada para a API escolhida (Z-API, Evolution API, Meta API, etc).
 */
export async function enviarMensagemWhatsApp(numero: string, mensagem: string) {
  try {
    // FORMATAR NÚMERO
    // Remove tudo que não for dígito
    let numStr = numero.replace(/\D/g, '');
    if (!numStr.startsWith('55')) numStr = '55' + numStr; // Assume DDI do Brasil se não houver

    console.log(`[WHATSAPP] Preparando envio para: ${numStr}`);
    console.log(`[WHATSAPP] Mensagem:\n${mensagem}`);

    // =========================================================================
    
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      // Exemplo padrão (Evolution API ou Z-API)
      await fetch(`${WHATSAPP_API_URL}/message/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_TOKEN,
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        },
        body: JSON.stringify({
          number: numStr,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: mensagem }
        })
      }).catch(e => console.error('Erro ao enviar WhatsApp:', e));
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
