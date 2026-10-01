// Helper to check if a date is a weekend
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function getLastBusinessDayOfMonth(year: number, month: number): Date {
  let d = new Date(year, month, 0);
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function getBusinessDayOrBefore(year: number, month: number, day: number): Date {
  let d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1) {
    d = new Date(year, month, 0);
  }
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * REGRA DE OURO DO CICLO
 * Retorna as datas exatas do ciclo para uma data de compra, baseada nas configurações do cartão.
 * 
 * Regra:
 * - Se a compra foi feita DEPOIS do dia de fechamento → vai para a fatura do próximo mês
 * - O FECHAMENTO da fatura é sempre o dia configurado no cartão (ex: 28 de cada mês)
 * - O VENCIMENTO é no mês seguinte ao fechamento quando diaVencimento < diaFechamento
 *   Exemplo: fecha dia 28, vence dia 4 → vencimento é no mês seguinte (4 < 28)
 */
export function calcularCicloFatura(dataCompraStr: string, diaFechamento: number, diaVencimento: number) {
  const [anoStr, mesStr, diaStr] = dataCompraStr.split('-');
  const anoCompra = parseInt(anoStr, 10);
  const mesCompra = parseInt(mesStr, 10);
  const diaCompra = parseInt(diaStr, 10);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Dia de fechamento real neste mês (respeita o último dia do mês)
  const ultimoDiaMesCompra = new Date(anoCompra, mesCompra, 0).getDate();
  const diaFechamentoNoMesCompra = Math.min(diaFechamento, ultimoDiaMesCompra);

  // Se a compra foi feita DEPOIS do fechamento → vai para fatura do mês seguinte
  let mesFatura = mesCompra;
  let anoFatura = anoCompra;

  if (diaCompra > diaFechamentoNoMesCompra) {
    mesFatura += 1;
    if (mesFatura > 12) {
      mesFatura = 1;
      anoFatura += 1;
    }
  }

  // FECHAMENTO da fatura: sempre o dia configurado no cartão no mês da fatura
  const ultimoDiaMesFatura = new Date(anoFatura, mesFatura, 0).getDate();
  const diaFechamentoFatura = Math.min(diaFechamento, ultimoDiaMesFatura);
  const strFechamento = `${anoFatura}-${pad(mesFatura)}-${pad(diaFechamentoFatura)}`;

  // VENCIMENTO: se diaVencimento < diaFechamento → vence no mês SEGUINTE ao mesFatura
  // Exemplo: vence dia 4, fecha dia 28 → 4 <= 28 → vencimento em novembro para fatura de outubro
  let mesVencimento = mesFatura;
  let anoVencimento = anoFatura;

  if (diaVencimento <= diaFechamento) {
    mesVencimento += 1;
    if (mesVencimento > 12) {
      mesVencimento = 1;
      anoVencimento += 1;
    }
  }

  const ultimoDiaMesVenc = new Date(anoVencimento, mesVencimento, 0).getDate();
  const diaVencimentoFinal = Math.min(diaVencimento, ultimoDiaMesVenc);
  const strVencimento = `${anoVencimento}-${pad(mesVencimento)}-${pad(diaVencimentoFinal)}`;

  const mesReferencia = `${anoFatura}-${pad(mesFatura)}`;

  return {
    mesReferencia,      // "2026-10"
    dataFechamento: strFechamento, // "2026-10-28"
    dataVencimento: strVencimento  // "2026-11-04"
  };
}
