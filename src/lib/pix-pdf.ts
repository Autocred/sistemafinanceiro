import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transacao } from './types';
import { formatarMoeda } from './storage';

export interface DadosFaturaPix {
  transacao: Transacao;
  copiaECola: string;
  nomeSistema: string;
  corPrimaria?: string;
  fotoPerfil?: string;
  nomeTitular: string;
  chavePix: string;
  tipoChave: string;
  cidadeTitular: string;
  clienteNome?: string;
  clienteTelefone?: string;
}

export async function gerarFaturaPixPDF(dados: DadosFaturaPix): Promise<{
  doc: jsPDF;
  base64: string;
  nomeArquivo: string;
  download: () => void;
}> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth(); // 210
  const height = doc.internal.pageSize.getHeight(); // 297

  // Helper converter cor HEX para RGB
  const hexToRgb = (hex: string) => {
    let clean = (hex || '').replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length === 6) {
      return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
      };
    }
    return { r: 15, g: 23, b: 42 }; // fallback slate 900
  };

  const primaryRgb = hexToRgb(dados.corPrimaria || '#0f172a');
  const valorNum = Number(dados.transacao.valor) || 0;
  const valorFormatado = formatarMoeda(valorNum);

  // 1. TOPO: Faixa Superior Elegante
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, width, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(dados.nomeSistema.toUpperCase(), 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('FATURA & COBRANÇA PIX', width - 15, 16, { align: 'right' });

  // 2. LINHA DE STATUS E NÚMERO DA FATURA
  let currentY = 36;
  const numFatura = `FAT-${(dados.transacao.id || Date.now().toString()).substring(0, 8).toUpperCase()}`;

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO AUXILIAR DE COBRANÇA', 15, currentY);

  doc.setFont('helvetica', 'normal');
  doc.text(`Nº: ${numFatura}`, width - 15, currentY, { align: 'right' });

  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, width - 15, currentY);

  // 3. BOXES LADO A LADO: BENEFICIÁRIO (CEDENTE) E PAGADOR (SACADO)
  currentY += 6;
  const boxWidth = (width - 30 - 8) / 2; // ~86mm cada
  const boxHeight = 36;

  // Box Beneficiário
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BENEFICIÁRIO (RECEBEDOR):', 19, currentY + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text((dados.nomeTitular || dados.nomeSistema).substring(0, 32), 19, currentY + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Chave PIX (${dados.tipoChave.toUpperCase()}):`, 19, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(dados.chavePix || 'Não informada', 19, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cidade/UF: ${dados.cidadeTitular || 'Brasil'}`, 19, currentY + 31);

  // Box Pagador
  const pagadorX = 15 + boxWidth + 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pagadorX, currentY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pagadorX, currentY, boxWidth, boxHeight, 2, 2, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGADOR (CLIENTE):', pagadorX + 4, currentY + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text((dados.clienteNome || dados.transacao.clienteNome || 'Cliente / Consumidor').substring(0, 32), pagadorX + 4, currentY + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Telefone / WhatsApp:', pagadorX + 4, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(dados.clienteTelefone || 'Não informado', pagadorX + 4, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.text('Forma de Pagamento: PIX Instantâneo', pagadorX + 4, currentY + 31);

  // 4. TABELA DE DETALHES DO LANÇAMENTO
  currentY += boxHeight + 8;

  // Header da tabela
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, width - 30, 8, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DO LANÇAMENTO / SERVIÇO', 19, currentY + 5.5);
  doc.text('CATEGORIA', 115, currentY + 5.5);
  doc.text('VENCIMENTO', 145, currentY + 5.5);
  doc.text('VALOR TOTAL', width - 19, currentY + 5.5, { align: 'right' });

  // Linha da tabela
  currentY += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(15, currentY, width - 30, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, currentY, width - 30, 14, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(dados.transacao.descricao.substring(0, 48), 19, currentY + 6);
  if (dados.transacao.observacoes) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(dados.transacao.observacoes.substring(0, 60), 19, currentY + 11);
  }

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text((dados.transacao.categoriaNome || 'Geral').substring(0, 18), 115, currentY + 8);

  // Vencimento formatado
  let vencimentoStr = dados.transacao.dataVencimento || dados.transacao.data || '';
  if (vencimentoStr.includes('-')) {
    const parts = vencimentoStr.split('-');
    if (parts.length === 3) vencimentoStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  doc.text(vencimentoStr, 145, currentY + 8);

  // Valor
  doc.setTextColor(16, 185, 129); // verde esmeralda
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(valorFormatado, width - 19, currentY + 8.5, { align: 'right' });

  // 5. ÁREA PRINCIPAL DE PAGAMENTO PIX (QR CODE + INSTRUÇÕES + COPIA E COLA)
  currentY += 22;

  const pixBoxHeight = 100;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, currentY, width - 30, pixBoxHeight, 3, 3, 'F');
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, currentY, width - 30, pixBoxHeight, 3, 3, 'S');

  // Título da Área PIX
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.roundedRect(15, currentY, width - 30, 9, 3, 3, 'F');
  doc.rect(15, currentY + 5, width - 30, 4, 'F'); // retira canto arredondado inferior
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGAMENTO INSTANTÂNEO VIA PIX (BANCO CENTRAL DO BRASIL)', width / 2, currentY + 6, { align: 'center' });

  // Gerar QR Code PNG base64
  try {
    const qrDataUrl = await QRCode.toDataURL(dados.copiaECola, {
      width: 400,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });

    // Desenha card branco para o QR Code
    const qrSize = 64;
    const qrX = 22;
    const qrY = currentY + 16;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Aponte a câmera do seu banco', qrX + (qrSize / 2), qrY + qrSize + 5, { align: 'center' });

    // Instruções à direita
    const textX = qrX + qrSize + 8;
    const textWidth = width - 15 - textX - 6;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUÇÕES DE PAGAMENTO:', textX, currentY + 18);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('1. Abra o aplicativo do seu banco ou carteira digital.', textX, currentY + 25);
    doc.text('2. Selecione a opção PIX e escolha Ler QR Code.', textX, currentY + 31);
    doc.text('3. Confirme os dados do beneficiário e o valor.', textX, currentY + 37);
    doc.text('4. Ou utilize o código PIX Copia e Cola abaixo:', textX, currentY + 43);

    // Box Copia e Cola
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(textX, currentY + 46, textWidth, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(textX, currentY + 46, textWidth, 34, 2, 2, 'S');

    doc.setFontSize(6.5);
    doc.setFont('courier', 'normal');
    doc.setTextColor(30, 41, 59);

    const splitCode = doc.splitTextToSize(dados.copiaECola, textWidth - 4);
    doc.text(splitCode.slice(0, 6), textX + 2, currentY + 52);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Baixa automática e confirmação imediata!', textX, currentY + 88);

  } catch (err) {
    console.error('Erro ao gerar QRCode no PDF:', err);
  }

  // 6. RODAPÉ E AUTENTICAÇÃO
  const footerY = height - 28;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, width - 15, footerY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Autenticação Digital / Transação segura via Banco Central do Brasil.', 15, footerY + 5);
  doc.text(`Fatura emitida em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por ${dados.nomeSistema}.`, 15, footerY + 10);
  doc.text('Pagamento válido até a data de vencimento.', width - 15, footerY + 5, { align: 'right' });

  // Faixa inferior decorativa
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, height - 6, width, 6, 'F');

  // Nome do arquivo
  const nomeLimpo = (dados.transacao.descricao || 'fatura').replace(/[^a-z0-9]/gi, '_');
  const nomeArquivo = `Fatura_PIX_${numFatura}_${nomeLimpo}.pdf`;

  const base64DataUri = doc.output('datauristring');

  return {
    doc,
    base64: base64DataUri,
    nomeArquivo,
    download: () => doc.save(nomeArquivo)
  };
}
