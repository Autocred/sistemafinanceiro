// Helper to check if a date is a weekend
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  // Future: Add holiday checking here
}

export function getLastBusinessDayOfMonth(year: number, month: number): Date {
  // month is 1-indexed here if we pass it directly, but Date uses 0-indexed.
  // So new Date(year, month, 0) gives the LAST day of the previous month.
  // E.g., if we want last day of September (month=9), we do new Date(year, 9, 0)
  let d = new Date(year, month, 0);
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function getBusinessDayOrBefore(year: number, month: number, day: number): Date {
  // month is 1-indexed
  let d = new Date(year, month - 1, day);
  // If the day we asked for overflows the month (e.g., Feb 30 -> Mar 2), fix it
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
 */
export function calcularCicloFatura(dataCompraStr: string, diaFechamento: number, diaVencimento: number) {
  const [anoStr, mesStr, diaStr] = dataCompraStr.split('-');
  const anoCompra = parseInt(anoStr, 10);
  const mesCompra = parseInt(mesStr, 10);
  const diaCompra = parseInt(diaStr, 10);

  // Determinar a data exata de fechamento para o mês da compra
  let dataFechamentoAtual: Date;
  
  // Se for configurado como 30 ou 31, assumimos a intenção de "Último dia do mês / último dia útil"
  if (diaFechamento >= 30) {
    dataFechamentoAtual = getLastBusinessDayOfMonth(anoCompra, mesCompra);
  } else {
    dataFechamentoAtual = getBusinessDayOrBefore(anoCompra, mesCompra, diaFechamento);
  }

  const diaFechamentoReal = dataFechamentoAtual.getDate();

  // Se a compra foi feita DEPOIS do fechamento, ela cai na fatura do mês seguinte
  let mesFatura = mesCompra;
  let anoFatura = anoCompra;
  
  if (diaCompra > diaFechamentoReal) {
    mesFatura += 1;
    if (mesFatura > 12) {
      mesFatura = 1;
      anoFatura += 1;
    }
  }

  // Agora calculamos o fechamento real e vencimento real DESSA fatura (mesFatura/anoFatura)
  let dataFechamentoFatura: Date;
  if (diaFechamento >= 30) {
    dataFechamentoFatura = getLastBusinessDayOfMonth(anoFatura, mesFatura);
  } else {
    dataFechamentoFatura = getBusinessDayOrBefore(anoFatura, mesFatura, diaFechamento);
  }

  // O vencimento geralmente é no mês SEGUINTE ao mês de faturamento?
  // Pela especificação do usuário: Compra Setembro, Fechamento 30/09, Vencimento 04/10.
  // Então o vencimento cai no mês `mesFatura + 1` se o diaVencimento for menor que o diaFechamento.
  let mesVencimentoReal = mesFatura;
  let anoVencimentoReal = anoFatura;
  
  if (diaVencimento <= diaFechamento) {
    mesVencimentoReal += 1;
    if (mesVencimentoReal > 12) {
      mesVencimentoReal = 1;
      anoVencimentoReal += 1;
    }
  }

  let dataVencimentoFatura = getBusinessDayOrBefore(anoVencimentoReal, mesVencimentoReal, diaVencimento);

  const pad = (n: number) => String(n).padStart(2, '0');

  // mesReferencia é a identificação unívoca da Fatura. Usaremos o anoFatura-mesFatura.
  const mesReferencia = `${anoFatura}-${pad(mesFatura)}`;
  const strFechamento = `${dataFechamentoFatura.getFullYear()}-${pad(dataFechamentoFatura.getMonth() + 1)}-${pad(dataFechamentoFatura.getDate())}`;
  const strVencimento = `${dataVencimentoFatura.getFullYear()}-${pad(dataVencimentoFatura.getMonth() + 1)}-${pad(dataVencimentoFatura.getDate())}`;

  return {
    mesReferencia, // "2026-09"
    dataFechamento: strFechamento, // "2026-09-30"
    dataVencimento: strVencimento // "2026-10-04"
  };
}
