import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transacao } from './types';
import { formatarMoeda } from './storage';

export const gerarReciboPDF = (transacao: Transacao) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // A5 is perfect for receipts
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  
  // Theme Color
  const primaryColor = typeof window !== 'undefined' ? localStorage.getItem('saved_primary_color') || '#0f172a' : '#0f172a';
  
  // Converter HEX para RGB para jsPDF
  const hexToRgb = (hex: string) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#0f172a');
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 15, g: 23, b: 42 };
  };
  const color = hexToRgb(primaryColor);

  // Background Header
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(0, 0, width, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titulo = transacao.tipo === 'receita' ? 'RECIBO' : 'COMPROVANTE';
  doc.text(titulo, width / 2, 22, { align: 'center' });

  // Box for Content
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, 45, width - 20, 100, 3, 3, 'S');

  // Value Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 50, width - 30, 25, 2, 2, 'F');

  // Value Text
  doc.setTextColor(color.r, color.g, color.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Valor Total:', 20, 60);
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarMoeda(Number(transacao.valor) || 0), width - 20, 65, { align: 'right' });

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 85, width - 15, 85);

  // Details
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', 20, 95);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(transacao.descricao.substring(0, 40), 20, 102);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA', 20, 115);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const d = new Date(transacao.data + 'T12:00:00');
  doc.text(format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), 20, 122);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TIPO', 100, 115);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(transacao.tipo === 'receita' ? 'Recebimento' : 'Pagamento', 100, 122);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUS', 20, 135);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  if (transacao.status === 'pago') {
    doc.setTextColor(22, 163, 74); // green
    doc.text('CONCLUÍDO', 20, 142);
  } else {
    doc.setTextColor(245, 158, 11); // orange
    doc.text('PENDENTE', 20, 142);
  }

  // Footer / Signature
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const appName = typeof window !== 'undefined' ? localStorage.getItem('app_name') || 'Sistema Financeiro' : 'Sistema Financeiro';
  doc.text('Gerado por ' + appName, width / 2, height - 20, { align: 'center' });
  
  const emissao = format(new Date(), "dd/MM/yyyy 'às' HH:mm");
  doc.text('Emitido em: ' + emissao, width / 2, height - 15, { align: 'center' });

  // Save the PDF
  const nomeArquivo = `${titulo}_${transacao.descricao.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(nomeArquivo);
};

export const gerarPDFExtrato = (extratoComSaldo: any[], info: any) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Extrato Bancário', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Conta: ${info.contaNome}`, 14, 30);
  doc.text(`Período: ${info.periodo}`, 14, 36);
  
  const columns = [
    { header: 'Data', dataKey: 'data' },
    { header: 'Descrição', dataKey: 'descricao' },
    { header: 'Categoria', dataKey: 'categoria' },
    { header: 'Conta', dataKey: 'conta' },
    { header: 'Valor (R$)', dataKey: 'valor' },
    { header: 'Saldo (R$)', dataKey: 'saldo' },
  ];
  
  const data = extratoComSaldo.map(t => ({
    data: (t.dataExtrato || t.dataPagamento || t.dataLancamento || t.data) ? format(new Date((t.dataExtrato || t.dataPagamento || t.dataLancamento || t.data) + 'T12:00:00'), 'dd/MM/yyyy') : '-',
    descricao: t.descricao,
    categoria: t.categoriaNome || '',
    conta: t.contaNome || '',
    valor: formatarMoeda(t.impacto),
    saldo: formatarMoeda(t.saldoApos)
  }));

  autoTable(doc, {
    startY: 45,
    columns,
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }
  });
  
  doc.save('Extrato_Financeiro.pdf');
};
