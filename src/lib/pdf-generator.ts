import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transacao } from './types';
import { formatarMoeda, getTenantId } from './storage';

// ─── Helpers Visuais Estilo Bancário Santander / Bradesco ────────────────────

const hexToRgb = (hex: string, defaultColor = { r: 204, g: 0, b: 0 }) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : defaultColor;
};

const getBrandingInfo = () => {
  let nome = 'Sistema Financeiro';
  let corHex = '#cc0000'; // padrão Santander / Bradesco
  let logoUrl = '';

  if (typeof window !== 'undefined') {
    try {
      const tenant = getTenantId();
      if (tenant === 'autocred-promotora-de-credito') {
        nome = 'Autocred Promotora';
        corHex = '#0284c7'; // Azul corporativo
      } else if (tenant === 'master' || tenant === '9yxuafoC0AV9BrIKem05ponbmgn2') {
        nome = 'Gestão Financeira Master';
        corHex = '#10b981';
      }

      const savedName = localStorage.getItem('app_name') || localStorage.getItem('tenant_name');
      if (savedName) nome = savedName;

      const savedColor = localStorage.getItem('saved_primary_color');
      if (savedColor) corHex = savedColor;
    } catch (e) {
      // safe fallback
    }
  }

  return { nome, cor: hexToRgb(corHex), corHex, logoUrl };
};

// ─── Recibo Individual em PDF ────────────────────────────────────────────────

export const gerarReciboPDF = (transacao: Transacao) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const branding = getBrandingInfo();

  // Cabeçalho institucional estilo bancário
  doc.setFillColor(branding.cor.r, branding.cor.g, branding.cor.b);
  doc.rect(0, 0, width, 32, 'F');

  // Nome do Banco / Sistema
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.nome.toUpperCase(), 14, 14);

  // Título do documento
  doc.setFontSize(18);
  const titulo = transacao.tipo === 'receita' ? 'RECIBO DE RECEBIMENTO' : 'COMPROVANTE DE PAGAMENTO';
  doc.text(titulo, 14, 24);

  // Box Principal
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, 40, width - 24, 120, 3, 3, 'S');

  // Valor Destaque (Azul para Receita, Vermelho para Despesa)
  const isReceita = transacao.tipo === 'receita';
  doc.setFillColor(isReceita ? 239 : 254, isReceita ? 246 : 242, isReceita ? 255 : 242);
  doc.roundedRect(16, 45, width - 32, 24, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR TOTAL:', 22, 54);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  if (isReceita) {
    doc.setTextColor(2, 132, 199); // Azul Banco (#0284c7)
  } else {
    doc.setTextColor(220, 38, 38); // Vermelho (#dc2626)
  }
  doc.text(formatarMoeda(Number(transacao.valor) || 0), width - 22, 60, { align: 'right' });

  // Linhas de detalhe
  let y = 80;
  const renderLinha = (label: string, valor: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), 20, y);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(valor || '-', 20, y + 6);

    doc.setDrawColor(241, 245, 249);
    doc.line(20, y + 10, width - 20, y + 10);
    y += 16;
  };

  renderLinha('Descrição', transacao.descricao);
  renderLinha('Data de Efetivação', transacao.data ? format(new Date(transacao.data + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-');
  renderLinha('Contato', transacao.clienteNome || transacao.fornecedorNome || 'Não informado');
  renderLinha('Conta / Canal', transacao.contaNome || '-');

  // Rodapé estilo banco oficial
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Autenticação digital gerada por ${branding.nome}`, width / 2, height - 12, { align: 'center' });
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}`, width / 2, height - 8, { align: 'center' });

  const nomeArquivo = `${titulo.replace(/ /g, '_')}_${(transacao.descricao || 'doc').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(nomeArquivo);
};

// ─── Extrato Bancário Profissional (Santander / Bradesco) ───────────────────

export const gerarPDFExtrato = (extratoComSaldo: any[], info: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const branding = getBrandingInfo();

  // Barra Superior Santander/Bradesco com a cor primária da licença
  doc.setFillColor(branding.cor.r, branding.cor.g, branding.cor.b);
  doc.rect(0, 0, width, 24, 'F');

  // Nome da Instituição / Sistema no topo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.nome.toUpperCase(), 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('EXTRATO DE CONTA CORRENTE', width - 14, 15, { align: 'right' });

  // Cabeçalho com dados da conta e período (estilo extrato bancário oficial)
  let yHeader = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Extrato de Movimentações Financeiras', 14, yHeader);

  yHeader += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Conta: ${info.contaNome || 'Todas as Contas'}`, 14, yHeader);
  doc.text(`Período Consultado: ${info.periodo || 'Completo'}`, 14, yHeader + 5);

  doc.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, width - 14, yHeader, { align: 'right' });
  doc.text(`Total de Lançamentos: ${extratoComSaldo.length}`, width - 14, yHeader + 5, { align: 'right' });

  // Quadro de Resumo de Saldos (Santander/Bradesco)
  const yBox = yHeader + 11;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, yBox, width - 28, 20, 2, 2, 'FD');

  const colW = (width - 28) / 3;

  // 1. Total Entradas (AZUL BANCÁRIO)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ENTRADAS (+):', 18, yBox + 7);
  doc.setFontSize(13);
  doc.setTextColor(2, 132, 199); // Azul bancário
  doc.text(`+ ${formatarMoeda(info.totalEntradas || 0)}`, 18, yBox + 15);

  // 2. Total Saídas (VERMELHO)
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SAÍDAS (-):', 18 + colW, yBox + 7);
  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38); // Vermelho bancário
  doc.text(`- ${formatarMoeda(Math.abs(info.totalSaidas || 0))}`, 18 + colW, yBox + 15);

  // 3. Saldo Final / Acumulado (VERDE)
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('SALDO DISPONÍVEL (=):', 18 + colW * 2, yBox + 7);
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74); // Verde saldo bancário
  doc.text(formatarMoeda(info.saldoFinal || 0), 18 + colW * 2, yBox + 15);

  // Colunas da Tabela Oficial - Estilo Extrato Bancário Real (1 linha por registro, coluna FIXA/VAR separada)
  const head = [['DATA', 'HISTÓRICO / CONTATO', 'TIPO', 'CATEGORIA', 'CONTA / CANAL', 'VALOR (R$)', 'SALDO (R$)']];

  const body = extratoComSaldo.map(t => {
    const rawDate = t.dataExtrato || t.dataPagamento || t.dataLancamento || t.data;
    const dtFormatada = rawDate ? format(new Date(rawDate + 'T12:00:00'), 'dd/MM/yyyy') : '-';
    
    // Histórico em linha única com contato se houver
    const contato = t.clienteNome || t.fornecedorNome;
    const historico = contato ? `${t.descricao || '-'} - ${contato}` : (t.descricao || '-');
    const comp = t.comportamento === 'fixa' ? 'Fixa' : 'Variável';

    const valorNum = Number(t.impacto !== undefined ? t.impacto : (t.tipo === 'despesa' ? -t.valor : t.valor)) || 0;
    const valorStr = (valorNum > 0 ? '+' : '') + formatarMoeda(valorNum);
    const saldoStr = formatarMoeda(Number(t.saldoApos) || 0);

    return [
      dtFormatada,
      historico,
      comp,
      t.categoriaNome || '-',
      t.contaNome || '-',
      valorStr,
      saldoStr
    ];
  });

  autoTable(doc, {
    startY: yBox + 26,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      valign: 'middle',
      overflow: 'ellipsize',
      minCellHeight: 5.5
    },
    headStyles: {
      fillColor: [branding.cor.r, branding.cor.g, branding.cor.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7.5,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'left' },
      4: { cellWidth: 28, halign: 'left' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    // REGRAS DE CORES EXATAS DO USUÁRIO:
    // Receitas = AZUL, Despesas = VERMELHO, Saldos = VERDE
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Coluna 2: Fixa / Variável
        if (data.column.index === 2) {
          const val = String(data.cell.raw || '');
          if (val === 'Fixa') {
            data.cell.styles.textColor = [109, 40, 217]; // Roxo discreto
          } else {
            data.cell.styles.textColor = [180, 83, 9]; // Âmbar discreto
          }
        }
        // Coluna 5: Valor da Movimentação
        if (data.column.index === 5) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('+') || !val.startsWith('-')) {
            data.cell.styles.textColor = [2, 132, 199]; // AZUL SANTANDER/BRADESCO PARA RECEITAS
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // VERMELHO PARA DESPESAS
          }
        }
        // Coluna 6: Saldo Acumulado
        if (data.column.index === 6) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38]; // Negativo = Vermelho
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // SALDO POSITIVO = VERDE OFICIAL
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Rodapé da página
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Extrato Oficial — Página ${data.pageNumber} — Gerado por ${branding.nome}`,
        width / 2,
        height - 8,
        { align: 'center' }
      );
    }
  });

  doc.save(`Extrato_Bancario_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ─── Relatório Gerencial Detalhado em PDF ────────────────────────────────────

export const gerarPDFRelatorioGerencial = (transacoes: Transacao[], filtros: any, totais: { receitas: number; despesas: number; saldo: number }) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const branding = getBrandingInfo();

  // Faixa topo
  doc.setFillColor(branding.cor.r, branding.cor.g, branding.cor.b);
  doc.rect(0, 0, width, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.nome.toUpperCase(), 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DEMONSTRATIVO ANALÍTICO DE LANÇAMENTOS', width - 14, 14, { align: 'right' });

  // Título e Período
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Financeiro Detalhado', 14, 30);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const pInicio = filtros.dataInicio ? filtros.dataInicio.split('-').reverse().join('/') : '';
  const pFim = filtros.dataFim ? filtros.dataFim.split('-').reverse().join('/') : '';
  doc.text(`Período: ${pInicio} a ${pFim}`, 14, 36);
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, width - 14, 36, { align: 'right' });

  // Quadro de Resumo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 40, width - 28, 16, 2, 2, 'FD');

  const colW = (width - 28) / 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('RECEITAS (+):', 20, 46);
  doc.setFontSize(12);
  doc.setTextColor(2, 132, 199); // Azul para Receitas
  doc.text(`+ ${formatarMoeda(totais.receitas)}`, 20, 52);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('DESPESAS (-):', 20 + colW, 46);
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38); // Vermelho para Despesas
  doc.text(`- ${formatarMoeda(totais.despesas)}`, 20 + colW, 52);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('SALDO LÍQUIDO (=):', 20 + colW * 2, 46);
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74); // Verde para Saldos
  doc.text(formatarMoeda(totais.saldo), 20 + colW * 2, 52);

  // Montagem da tabela analítica - Linha única estilo bancário com coluna TIPO (Fixa/Var) separada
  const head = [['DATA', 'HISTÓRICO / CONTATO', 'TIPO', 'COMP', 'CATEGORIA', 'CENTRO DE CUSTO', 'CONTA / CANAL', 'VALOR (R$)', 'SALDO ACUM. (R$)']];

  let acumulado = 0;
  const sorted = [...transacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const body = sorted.map(t => {
    const isReceita = t.tipo === 'receita';
    const isDespesa = t.tipo === 'despesa';
    const valor = Number(t.valor) || 0;

    if (isReceita) acumulado += valor;
    else if (isDespesa) acumulado -= valor;

    const contato = t.clienteNome || t.fornecedorNome;
    const historico = contato ? `${t.descricao || '-'} - ${contato}` : (t.descricao || '-');
    const compText = (t.comportamento === 'fixa' ? 'Fixa' : 'Variável');
    const valorStr = (isReceita ? '+' : isDespesa ? '-' : '') + formatarMoeda(valor);

    return [
      t.data ? t.data.split('-').reverse().join('/') : '-',
      historico,
      t.tipo.toUpperCase(),
      compText,
      t.categoriaNome || '-',
      t.centroCustoNome || '-',
      t.contaNome || '-',
      valorStr,
      formatarMoeda(acumulado)
    ];
  });

  autoTable(doc, {
    startY: 60,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.6,
      textColor: [15, 23, 42],
      valign: 'middle',
      overflow: 'ellipsize',
      minCellHeight: 5
    },
    headStyles: {
      fillColor: [branding.cor.r, branding.cor.g, branding.cor.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'left' },
      5: { cellWidth: 26, halign: 'left' },
      6: { cellWidth: 26, halign: 'left' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    // REGRAS DE CORES: Receitas = Azul, Despesas = Vermelho, Saldo = Verde
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Coluna 3: Fixa / Variável
        if (data.column.index === 3) {
          const val = String(data.cell.raw || '');
          if (val === 'Fixa') {
            data.cell.styles.textColor = [109, 40, 217];
          } else {
            data.cell.styles.textColor = [180, 83, 9];
          }
        }
        // Coluna 7: Valor
        if (data.column.index === 7) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('+')) {
            data.cell.styles.textColor = [2, 132, 199]; // AZUL
          } else if (val.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38]; // VERMELHO
          }
        }
        // Coluna 8: Saldo Acumulado
        if (data.column.index === 8) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // VERDE
          }
        }
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Demonstrativo Oficial — Página ${data.pageNumber} — Gerado por ${branding.nome}`,
        width / 2,
        height - 8,
        { align: 'center' }
      );
    }
  });

  doc.save(`Relatorio_Financeiro_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
