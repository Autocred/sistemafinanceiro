import { format } from 'date-fns';
import { Transacao, Fatura, Conta } from './types';
import { ordenarMovimentacoesDesc, ordenarVencimentosAsc } from './sorting';

/**
 * Normaliza qualquer data (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) para YYYY-MM-DD
 */
export function normalizeDate(dateRaw?: any): string {
  if (!dateRaw) return '';
  let d = String(dateRaw).trim();
  if (d.includes('T')) {
    d = d.split('T')[0];
  }
  if (d.includes('/')) {
    const p = d.split('/');
    if (p.length === 3) {
      if (p[0].length === 4) {
        d = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
      } else {
        const yr = p[2].length === 2 ? `20${p[2]}` : p[2];
        d = `${yr}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }
  } else if (d.includes('-')) {
    const p = d.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) {
        d = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
      } else {
        const yr = p[2].length === 2 ? `20${p[2]}` : p[2];
        d = `${yr}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }
  }
  return d;
}

/**
 * Identifica se uma transação de cartão de crédito está pendente
 */
export function isCartaoPendente(t: Transacao, faturas: Fatura[]): boolean {
  if (t.formaPagamento !== 'cartao_credito') return false;
  if (!t.faturaId) return true;
  const fatura = faturas.find(f => f.id === t.faturaId);
  return fatura ? (fatura.status === 'aberta' || fatura.status === 'parcial') : true;
}

/**
 * Filtro Atômico: Contas a Pagar
 * Retorna true SE a despesa deve aparecer não fluxo de contas a pagar pendentes
 */
export function isContaAPagarValida(t: Transacao, hojeData = new Date()): boolean {
  // Ignãora se não for despesa ou se já estiver pago (a menos que seja cartão, que tem lógica própria na fatura)
  if (t.tipo !== 'despesa') return false;
  if (t.formaPagamento === 'cartao_credito') return false; // Cartão é tratado não bloco de faturas
  if (t.status === 'pago') return false;

  const hojeStr = format(hojeData, 'yyyy-MM-dd');
  const mesAtualStr = format(hojeData, 'yyyy-MM');
  const dataVencimento = normalizeDate(t.dataVencimento || t.data);

  if (!dataVencimento) return false;

  // Se for menor que hoje, está vencida (pendente) -> MOSTRAR
  if (dataVencimento < hojeStr) return true;

  // Se for exatamente deste mês -> MOSTRAR
  if (dataVencimento.startsWith(mesAtualStr)) return true;

  // Se faltar até 7 dias não futuro -> MOSTRAR
  try {
    const dV = new Date(`${dataVencimento}T00:00:00`);
    const dH = new Date(`${hojeStr}T00:00:00`);
    const diffDias = (dV.getTime() - dH.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias >= 0 && diffDias <= 7;
  } catch (e) {
    return false;
  }
}

/**
 * Filtro Atômico: Faturas a Pagar
 */
export function isFaturaAPagarValida(f: Fatura, hojeData = new Date()): boolean {
  if (f.status === 'paga') return false;
  const hojeStr = format(hojeData, 'yyyy-MM-dd');
  const mesAtualStr = format(hojeData, 'yyyy-MM');
  const dataVencimento = normalizeDate(f.dataVencimento);

  if (dataVencimento < hojeStr) return true;
  if (dataVencimento.startsWith(mesAtualStr)) return true;

  try {
    const dV = new Date(`${dataVencimento}T00:00:00`);
    const dH = new Date(`${hojeStr}T00:00:00`);
    const diffDias = (dV.getTime() - dH.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias >= 0 && diffDias <= 7;
  } catch (e) {
    return false;
  }
}

/**
 * CÁLCULO CENTRAL DE SALDOS E DRE
 */
export interface SaldosFinanceiros {
  saldoEmContas: number; // Saldo físico real atual
  receitasPagas: number;
  despesasPagas: number;
  despesasPendentesCartao: number;
  despesasPendentesComuns: number;
  despesasAPagarTotal: number;
  saldoPrevistoFimMes: number; // Saldo Real + Receitas Pendentes (do mês) - Despesas Pendentes (do mês)
  contasAPagarOrdenadas: any[];
  ultimasTransacoesOrdenadas: Transacao[];
}

export function getValorFinal(t: Transacao): number {
  return Math.max(0, (Number(t.valor) || 0) + (Number(t.juros) || 0) + (Number(t.multa) || 0) - (Number(t.desconto) || 0));
}

export function calcularTotais(transacoes: Transacao[], faturas: Fatura[] = []) {
  const receitasPagas = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + getValorFinal(t), 0);
  const receitasPendentes = transacoes.filter(t => t.tipo === 'receita' && t.status !== 'pago').reduce((s, t) => s + getValorFinal(t), 0);
  
  const despesasPagas = transacoes.filter(t => t.tipo === 'despesa' && t.formaPagamento !== 'cartao_credito' && t.status === 'pago').reduce((s, t) => s + getValorFinal(t), 0);
  const despesasPendentesComuns = transacoes.filter(t => t.tipo === 'despesa' && t.formaPagamento !== 'cartao_credito' && t.status !== 'pago').reduce((s, t) => s + getValorFinal(t), 0);
  
  const despesasPendentesCartao = transacoes.filter(t => t.tipo === 'despesa' && t.formaPagamento === 'cartao_credito' && isCartaoPendente(t, faturas)).reduce((s, t) => s + getValorFinal(t), 0);
  const despesasAPagarTotal = despesasPendentesComuns + despesasPendentesCartao;
  
  const totalReceitas = receitasPagas + receitasPendentes;
  const totalDespesas = despesasPagas + despesasAPagarTotal;
  
  return {
    receitasPagas, receitasPendentes, totalReceitas,
    despesasPagas, despesasPendentesComuns, despesasPendentesCartao, despesasAPagarTotal, totalDespesas,
    saldoRealizado: receitasPagas - despesasPagas,
    saldoProjetado: totalReceitas - totalDespesas
  };
}

export function gerarExtrato(transacoesFiltradas: Transacao[], contaFiltro: string) {
  let saldoAcumulado = 0;
  const extratoComSaldo = transacoesFiltradas.map(t => {
    let impacto = 0;
    if (t.status === 'pago') {
      if (t.tipo === 'despesa') impacto = -Math.abs(getValorFinal(t));
      else if (t.tipo === 'receita') impacto = Math.abs(getValorFinal(t));
      else if (t.tipo === 'transferencia') {
        if (contaFiltro === 'todas') impacto = 0;
        else if (t.contaId === contaFiltro) impacto = -Math.abs(t.valor);
        else if (t.contaDestinãoId === contaFiltro) impacto = Math.abs(t.valor);
      }
    }
    saldoAcumulado += impacto;
    return {
      ...t,
      impacto,
      saldoApos: saldoAcumulado
    };
  }).reverse();

  const totalEntradas = transacoesFiltradas.filter(t => t.status === 'pago' && t.tipo === 'receita').reduce((s, t) => s + getValorFinal(t), 0);
  const totalSaidas = transacoesFiltradas.filter(t => t.status === 'pago' && t.tipo === 'despesa').reduce((s, t) => s + getValorFinal(t), 0);
  const saldoFinal = totalEntradas - totalSaidas;

  return { extratoComSaldo, totalEntradas, totalSaidas, saldoFinal };
}

export function calcularMotorFinanceiro(
  transacoes: Transacao[],
  faturas: Fatura[],
  contas: Conta[],
  hojeData = new Date()
): SaldosFinanceiros {
  
  const hojeStr = format(hojeData, 'yyyy-MM-dd');
  const mesAtualStr = format(hojeData, 'yyyy-MM');

  // 1. Saldo Real em Contas
  const saldoEmContas = contas.filter(c => c.ativo && c.tipo !== 'investimento').reduce((acc, c) => acc + c.saldo, 0);

  // 2. Filtramos apenas as transações do mês atual (para KPIs)
  const transacoesMes = transacoes.filter(t => {
      const db = normalizeDate(t.dataPagamento || t.dataVencimento || t.data);
      return db.startsWith(mesAtualStr);
  });

  // 3. Receitas e Despesas Pagas (do mês)
  const receitasPagas = transacoesMes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + getValorFinal(t), 0);
  const despesasPagas = transacoesMes.filter(t => t.tipo === 'despesa' && t.formaPagamento !== 'cartao_credito' && t.status === 'pago').reduce((s, t) => s + getValorFinal(t), 0);

  // 4. Receitas Pendentes do Mês (para cálculo do Previsto)
  const receitasPendentesMes = transacoesMes.filter(t => t.tipo === 'receita' && t.status !== 'pago').reduce((s, t) => s + getValorFinal(t), 0);

  // 5. Contas a Pagar (Validadas pela regra atômica)
  const pendentesComuns = transacoes.filter(t => isContaAPagarValida(t, hojeData));
  const despesasPendentesComuns = pendentesComuns.reduce((s, t) => s + getValorFinal(t), 0);

  const faturasValidas = faturas.filter(f => isFaturaAPagarValida(f, hojeData));
  const despesasPendentesCartao = faturasValidas.reduce((s, f) => {
    const pago = f.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
    return s + (f.valorTotal - pago);
  }, 0);

  const despesasAPagarTotal = despesasPendentesComuns + despesasPendentesCartao;

  // 5.b Despesas Pendentes Estritas do Mês (Para cálculo do Previsto Fim do Mês, sem invadir o próximo mês com a regra de +7 dias)
  const despesasPendentesMesComuns = transacoes.filter(t => 
    t.tipo === 'despesa' && 
    t.formaPagamento !== 'cartao_credito' && 
    t.status !== 'pago' && 
    (normalizeDate(t.dataVencimento || t.data) < hojeStr || normalizeDate(t.dataVencimento || t.data).startsWith(mesAtualStr))
  ).reduce((s, t) => s + getValorFinal(t), 0);

  const despesasPendentesMesCartao = faturas.filter(f => 
    f.status !== 'paga' && 
    (normalizeDate(f.dataVencimento) < hojeStr || normalizeDate(f.dataVencimento).startsWith(mesAtualStr))
  ).reduce((s, f) => {
    const pago = f.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
    return s + (f.valorTotal - pago);
  }, 0);

  const despesasAPagarPrevistoMes = despesasPendentesMesComuns + despesasPendentesMesCartao;

  // Saldo Previsto = Saldo Atual + (Receitas Pendentes do Mês) - (Despesas Pendentes do Mês Atual)
  const saldoPrevistoFimMes = saldoEmContas + receitasPendentesMes - despesasAPagarPrevistoMes;

  // Montagem unificada do array de Contas a Pagar para as telas
  const contasAPagarArray = [
    ...pendentesComuns.map(t => ({
      id: t.id,
      titulo: t.descricao,
      subtitulo: t.fornecedorNome || t.categoriaNome || 'Despesa',
      valor: t.valor,
      data: normalizeDate(t.dataVencimento || t.data),
      tipo: 'despesa' as const,
      status: t.status,
      cor: '#cc0000',
      icone: t.categoriaIcone || 'Package',
      objOriginal: t
    })),
    ...faturasValidas.map(f => {
      const pago = f.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
      return {
        id: f.id,
        titulo: `Fatura ${f.cartaoNome}`,
        subtitulo: f.mesReferencia,
        valor: f.valorTotal - pago,
        data: normalizeDate(f.dataVencimento),
        tipo: 'fatura' as const,
        status: f.status,
        cor: f.cartaoCor || '#cc0000',
        icone: 'CreditCard',
        objOriginal: f
      };
    })
  ];

  const contasAPagarOrdenadas = ordenarVencimentosAsc(contasAPagarArray);

  // 6. Últimas Transações (Usando o mês atual e ignãorando bug de Datas Mistas)
  // Ocultar transações de cartão de crédito para que apareçam apenas nos detalhes da fatura
  const ultimasTransacoesFiltradas = transacoesMes.filter(t => !(t.formaPagamento === 'cartao_credito' && t.faturaId));
  const ultimasTransacoesOrdenadas = ordenarMovimentacoesDesc(ultimasTransacoesFiltradas).slice(0, 10);

  return {
    saldoEmContas,
    receitasPagas,
    despesasPagas,
    despesasPendentesCartao,
    despesasPendentesComuns,
    despesasAPagarTotal,
    saldoPrevistoFimMes,
    contasAPagarOrdenadas,
    ultimasTransacoesOrdenadas
  };
}
