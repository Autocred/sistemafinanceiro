// src/lib/pix.ts
// Gerador de PIX Oficial (Padrão EMVCo / Banco Central do Brasil - BR Code)

function removerAcentos(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixConfig {
  chave: string;
  tipoChave?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  nomeTitular: string;
  cidadeTitular: string;
  valor?: number;
  txid?: string;
  descricao?: string;
}

/**
 * Normaliza a chave PIX de acordo com o tipo
 */
export function normalizarChavePix(chave: string, tipo?: string): string {
  if (!chave) return '';
  const limpa = chave.trim();
  if (tipo === 'cpf' || tipo === 'cnpj') {
    return limpa.replace(/\D/g, '');
  }
  if (tipo === 'telefone') {
    let num = limpa.replace(/\D/g, '');
    if (!num.startsWith('55')) num = '55' + num;
    return '+' + num;
  }
  return limpa;
}

/**
 * Gera a string oficial do PIX Copia e Cola (BR Code)
 */
export function gerarPixCopiaECola(config: PixConfig): string {
  const chaveFormatada = normalizarChavePix(config.chave, config.tipoChave);
  const nome = removerAcentos(config.nomeTitular || 'Beneficiario').substring(0, 25).toUpperCase();
  const cidade = removerAcentos(config.cidadeTitular || 'BRASIL').substring(0, 15).toUpperCase();
  const txid = (config.txid || '***').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';

  let merchantAccountInfo =
    formatField('00', 'br.gov.bcb.pix') +
    formatField('01', chaveFormatada);

  if (config.descricao) {
    const desc = removerAcentos(config.descricao).substring(0, 40);
    merchantAccountInfo += formatField('02', desc);
  }

  let payload =
    formatField('00', '01') + // Payload Format Indicator
    formatField('01', '12') + // Point of Initiation (12 = Estático com valor)
    formatField('26', merchantAccountInfo) +
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986') + // Moeda: BRL (986)
    (config.valor && config.valor > 0 ? formatField('54', config.valor.toFixed(2)) : '') +
    formatField('58', 'BR') + // País
    formatField('59', nome) + // Nome do Beneficiário
    formatField('60', cidade) + // Cidade
    formatField('62', formatField('05', txid)); // Reference Label / TxID

  // CRC16
  payload += '6304';
  const checksum = crc16(payload);
  return payload + checksum;
}

/**
 * Retorna a URL da imagem do QR Code pronta para exibição
 */
export function gerarUrlQrCodePix(copiaECola: string, tamanho = 250): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&margin=10&data=${encodeURIComponent(copiaECola)}`;
}

/**
 * Monta o texto elegante para cobrança no WhatsApp
 */
export function montarMensagemCobrancaPix(params: {
  clienteNome: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  nomeSistema: string;
  copiaECola: string;
}): string {
  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.valor || 0);

  return `Olá *${params.clienteNome || 'Cliente'}*, tudo bem? 👋
Segue a cobrança referente a *${params.descricao}*:

💰 *Valor:* ${valorFormatado}
📅 *Vencimento:* ${params.dataVencimento || 'Imediato'}
🏢 *Emissor:* ${params.nomeSistema}

👇 *Código PIX Copia e Cola:*
\`\`\`${params.copiaECola}\`\`\`

_Para pagar, copie o código acima e cole na opção "PIX Copia e Cola" do aplicativo do seu banco. A baixa no sistema é confirmada imediatamente após o pagamento!_

_Mensagem automática enviada por ${params.nomeSistema}_`;
}
