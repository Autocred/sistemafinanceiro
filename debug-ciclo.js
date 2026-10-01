// Simulate calcularCicloFatura logic
function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function getLastBusinessDayOfMonth(year, month) {
  let d = new Date(year, month, 0);
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

function getBusinessDayOrBefore(year, month, day) {
  let d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1) d = new Date(year, month, 0);
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

function calcularCicloFatura(dataCompraStr, diaFechamento, diaVencimento) {
  const [anoStr, mesStr, diaStr] = dataCompraStr.split('-');
  const anoCompra = parseInt(anoStr, 10);
  const mesCompra = parseInt(mesStr, 10);
  const diaCompra = parseInt(diaStr, 10);

  let dataFechamentoAtual;
  if (diaFechamento >= 30) {
    dataFechamentoAtual = getLastBusinessDayOfMonth(anoCompra, mesCompra);
  } else {
    dataFechamentoAtual = getBusinessDayOrBefore(anoCompra, mesCompra, diaFechamento);
  }

  const diaFechamentoReal = dataFechamentoAtual.getDate();
  console.log(`diaCompra=${diaCompra}, diaFechamentoReal=${diaFechamentoReal}`);
  
  let mesFatura = mesCompra;
  let anoFatura = anoCompra;
  
  if (diaCompra > diaFechamentoReal) {
    mesFatura += 1;
    if (mesFatura > 12) { mesFatura = 1; anoFatura += 1; }
  }

  let dataFechamentoFatura;
  if (diaFechamento >= 30) {
    dataFechamentoFatura = getLastBusinessDayOfMonth(anoFatura, mesFatura);
  } else {
    dataFechamentoFatura = getBusinessDayOrBefore(anoFatura, mesFatura, diaFechamento);
  }

  let mesVencimentoReal = mesFatura;
  let anoVencimentoReal = anoFatura;
  
  if (diaVencimento <= diaFechamento) {
    mesVencimentoReal += 1;
    if (mesVencimentoReal > 12) { mesVencimentoReal = 1; anoVencimentoReal += 1; }
  }

  let dataVencimentoFatura = getBusinessDayOrBefore(anoVencimentoReal, mesVencimentoReal, diaVencimento);

  const pad = (n) => String(n).padStart(2, '0');
  const mesReferencia = `${anoFatura}-${pad(mesFatura)}`;
  const strFechamento = `${dataFechamentoFatura.getFullYear()}-${pad(dataFechamentoFatura.getMonth() + 1)}-${pad(dataFechamentoFatura.getDate())}`;
  const strVencimento = `${dataVencimentoFatura.getFullYear()}-${pad(dataVencimentoFatura.getMonth() + 1)}-${pad(dataVencimentoFatura.getDate())}`;

  return { mesReferencia, dataFechamento: strFechamento, dataVencimento: strVencimento };
}

// Card config: fechamento=28, vencimento=4
const diaFechamento = 28;
const diaVencimento = 4;

// Test with yesterday: 2026-09-30 (data de ontem do lançamento Loovi)
const test1 = calcularCicloFatura('2026-09-30', diaFechamento, diaVencimento);
console.log('Compra 30/09:', test1);
// Expected: mesFatura=10 (outubro), vencimento=04/11

// Test with today 2026-10-01
const test2 = calcularCicloFatura('2026-10-01', diaFechamento, diaVencimento);
console.log('Compra 01/10:', test2);
// Expected: mesFatura=10 (outubro), vencimento=04/11

// The system uses dataLancamento - what date is that? Let's test both possible dates
console.log('\n--- If dataVencimentoManual = 2026-11-04 ---');
const ciclo30 = calcularCicloFatura('2026-09-30', diaFechamento, diaVencimento);
console.log('ciclo.dataVencimento for 30/09:', ciclo30.dataVencimento);
console.log('dataVencimentoManual === ciclo.dataVencimento?', '2026-11-04' === ciclo30.dataVencimento);
// If they are equal, the code will NOT enter the manual override branch!
