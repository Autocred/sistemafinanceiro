// src/lib/pdf-fechamento-mensal.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DadosFechamentoMensal {
  nomeSistema: string;
  mesReferencia: string; // "2026-09"
  mesExtenso: string; // "Setembro de 2026"
  corPrimaria?: string; // hex
  totalReceitas: number;
  totalDespesas: number;
  resultadoLiquido: number;
  margemLiquida: number; // %
  totalLancamentos: number;
  // Comparativo com mês anterior
  variacaoReceita?: number; // %
  variacaoDespesa?: number; // %
  variacaoResultado?: number; // %
  mesAnteriorExtenso?: string;
  totalReceitasAnterior?: number;
  totalDespesasAnterior?: number;
  resultadoLiquidoAnterior?: number;
  // Metas do mês
  metas?: {
    titulo: string;
    valorAlvo: number;
    valorAlcancado: number;
    porcentagem: number;
    status: 'superada' | 'atingida' | 'deficit';
  }[];
  // Maiores despesas
  topDespesas: {
    categoria: string;
    valor: number;
    porcentagem: number;
  }[];
  // Maiores receitas
  topReceitas: {
    categoria: string;
    valor: number;
    porcentagem: number;
  }[];
  // Saldos das contas
  contasBancarias?: {
    nome: string;
    saldo: number;
  }[];
  saldoTotalContas?: number;
  // Pendências
  contasPagarPendentes?: number;
  contasReceberPendentes?: number;
  // Diagnóstico
  diagnosticoTexto: string;
}

function hexToRgb(hex: string) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#0f172a');
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 15, g: 23, b: 42 };
}

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

export function gerarFechamentoMensalPDF(dados: DadosFechamentoMensal): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const primaryRgb = hexToRgb(dados.corPrimaria || '#0f172a');

  // ==========================================
  // 1. CABEÇALHO EXECUTIVO
  // ==========================================
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, width, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(dados.nomeSistema.toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('RELATÓRIO EXECUTIVO DE FECHAMENTO MENSAL', 14, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Competência: ${dados.mesExtenso}`, width - 14, 13, { align: 'right' });

  const dataEmissao = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emitido em: ${dataEmissao}`, width - 14, 20, { align: 'right' });

  let curY = 38;

  // ==========================================
  // 2. SCORECARDS DE KPIS (4 CARDS)
  // ==========================================
  const cardW = (width - 28 - 9) / 4;
  const cardH = 24;

  const kpis = [
    {
      label: 'RECEITAS DO MÊS',
      valor: formatarMoeda(dados.totalReceitas),
      corBarra: [16, 185, 129], // green
      varText: dados.variacaoReceita !== undefined ? `${dados.variacaoReceita >= 0 ? '+' : ''}${dados.variacaoReceita.toFixed(1)}% vs anterior` : ''
    },
    {
      label: 'DESPESAS PAGAS',
      valor: formatarMoeda(dados.totalDespesas),
      corBarra: [239, 68, 68], // red
      varText: dados.variacaoDespesa !== undefined ? `${dados.variacaoDespesa >= 0 ? '+' : ''}${dados.variacaoDespesa.toFixed(1)}% vs anterior` : ''
    },
    {
      label: 'RESULTADO LÍQUIDO',
      valor: formatarMoeda(dados.resultadoLiquido),
      corBarra: dados.resultadoLiquido >= 0 ? [16, 185, 129] : [239, 68, 68],
      varText: dados.resultadoLiquido >= 0 ? 'Superávit Operacional' : 'Déficit no Período'
    },
    {
      label: 'MARGEM LÍQUIDA',
      valor: `${dados.margemLiquida.toFixed(1)}%`,
      corBarra: [30, 58, 138], // navy blue
      varText: `${dados.totalLancamentos} lançamentos`
    }
  ];

  kpis.forEach((k, idx) => {
    const x = 14 + idx * (cardW + 3);
    // Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, curY, cardW, cardH, 2, 2, 'FD');

    // Colored top border
    doc.setFillColor(k.corBarra[0], k.corBarra[1], k.corBarra[2]);
    doc.rect(x, curY, cardW, 2, 'F');

    // Label
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(k.label, x + 3.5, curY + 7);

    // Value
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(k.valor, x + 3.5, curY + 14);

    // Subtext
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(k.varText, x + 3.5, curY + 20);
  });

  curY += cardH + 7;

  // ==========================================
  // 3. COMPARATIVO COM MÊS ANTERIOR (TABELA SINTÉTICA)
  // ==========================================
  if (dados.totalReceitasAnterior !== undefined || dados.totalDespesasAnterior !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text('Evolução vs Mês Anterior (' + (dados.mesAnteriorExtenso || 'Anterior') + ')', 14, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      theme: 'grid',
      head: [['Métrica Financeira', dados.mesAnteriorExtenso || 'Mês Anterior', dados.mesExtenso, 'Variação']],
      body: [
        [
          'Receitas Realizadas',
          formatarMoeda(dados.totalReceitasAnterior || 0),
          formatarMoeda(dados.totalReceitas),
          dados.variacaoReceita !== undefined ? `${dados.variacaoReceita >= 0 ? '▲ +' : '▼ '}${dados.variacaoReceita.toFixed(1)}%` : '-'
        ],
        [
          'Despesas Pagas',
          formatarMoeda(dados.totalDespesasAnterior || 0),
          formatarMoeda(dados.totalDespesas),
          dados.variacaoDespesa !== undefined ? `${dados.variacaoDespesa <= 0 ? '▼ ' : '▲ +'}${dados.variacaoDespesa.toFixed(1)}%` : '-'
        ],
        [
          'Resultado Operacional',
          formatarMoeda(dados.resultadoLiquidoAnterior || 0),
          formatarMoeda(dados.resultadoLiquido),
          dados.variacaoResultado !== undefined ? `${dados.variacaoResultado >= 0 ? '▲ +' : '▼ '}${dados.variacaoResultado.toFixed(1)}%` : '-'
        ]
      ],
      headStyles: {
        fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 30
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    curY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 4. METAS DO MÊS (SE HOUVER)
  // ==========================================
  if (dados.metas && dados.metas.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text('Desempenho de Metas do Mês', 14, curY);
    curY += 3;

    const metasBody = dados.metas.map(m => [
      m.titulo,
      formatarMoeda(m.valorAlvo),
      formatarMoeda(m.valorAlcancado),
      `${m.porcentagem.toFixed(1)}%`,
      m.porcentagem >= 100 ? '✅ SUPERADA' : m.porcentagem >= 85 ? '🟢 NO RITMO' : '🔴 ABAIXO'
    ]);

    autoTable(doc, {
      startY: curY,
      theme: 'grid',
      head: [['Meta', 'Valor Alvo', 'Realizado', '% Atingido', 'Status']],
      body: metasBody,
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8, textColor: 30 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    curY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 5. TOP DESPESAS & TOP RECEITAS (LADO A LADO)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text('Top Maiores Despesas por Categoria', 14, curY);
  curY += 3;

  const despesasRows = dados.topDespesas.length > 0
    ? dados.topDespesas.map(d => [d.categoria, formatarMoeda(d.valor), `${d.porcentagem.toFixed(1)}%`])
    : [['Sem despesas registradas', 'R$ 0,00', '0.0%']];

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    head: [['Categoria de Custo', 'Total Pago', 'Representatividade %']],
    body: despesasRows,
    headStyles: {
      fillColor: [239, 68, 68],
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8, textColor: 30 },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    margin: { left: 14, right: 14 }
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // Se sobrar pouco espaço para a análise, quebra de página
  if (curY > height - 60) {
    doc.addPage();
    curY = 20;
  }

  // ==========================================
  // 6. PARECER EXECUTIVO E DIAGNÓSTICO
  // ==========================================
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, curY, width - 28, 32, 2, 2, 'FD');

  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(14, curY, 3, 32, 'F');

  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('DIAGNÓSTICO E PARECER GERENCIAL DO FECHAMENTO', 21, curY + 6);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const linhasDiagnostico = doc.splitTextToSize(dados.diagnosticoTexto, width - 42);
  doc.text(linhasDiagnostico, 21, curY + 12);

  curY += 38;

  // ==========================================
  // 7. LIQUIDEZ E SALDOS BANCÁRIOS (SE HOUVER)
  // ==========================================
  if (dados.contasBancarias && dados.contasBancarias.length > 0 && curY < height - 35) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text('Posição Consolidada de Caixa e Contas Bancárias', 14, curY);
    curY += 2;

    const contasRows = dados.contasBancarias.map(c => [c.nome, formatarMoeda(c.saldo)]);
    contasRows.push(['TOTAL EM CAIXA / BANCOS', formatarMoeda(dados.saldoTotalContas || 0)]);

    autoTable(doc, {
      startY: curY,
      theme: 'plain',
      body: contasRows,
      bodyStyles: { fontSize: 8, textColor: 51 },
      margin: { left: 14, right: 14 }
    });

    curY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ==========================================
  // 8. RODAPÉ INSTITUCIONAL
  // ==========================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, height - 12, width - 14, height - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Documento confidencial gerado por ${dados.nomeSistema} • Plataforma SaaS`, 14, height - 7);
    doc.text(`Página ${i} de ${totalPages}`, width - 14, height - 7, { align: 'right' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
