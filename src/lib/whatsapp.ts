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
