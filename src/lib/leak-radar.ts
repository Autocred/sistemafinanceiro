import { Transacao } from './types';

export type TipoAlertaVazamento = 
  | 'reajuste_silencioso' 
  | 'duplicidade_suspeita' 
  | 'assinatura_fantasma' 
  | 'pico_anomalo';

export interface AlertaVazamento {
  id: string;
  tipo: TipoAlertaVazamento;
  titulo: string;
  descricao: string;
  entidade: string;
  valorAtual: number;
  valorAnterior?: number;
  diferencaValor?: number;
  percentualAumento?: number;
  impactoAnual: number;
  severidade: 'alta' | 'media' | 'baixa';
  dataDetectada: string;
  transacaoIds: string[];
  categoriaNome?: string;
  dicaAcao: string;
}

export interface ResultadoRadarVazamentos {
  totalVazamentos: number;
  economiaMensalPotencial: number;
  economiaAnualPotencial: number;
  scoreSaude: number; // 0 a 100
  alertas: AlertaVazamento[];
}

/**
 * Motor Forense de Detecção Autônoma de Vazamentos e Desperdícios
 * Inspirado nos algoritmos de Expense Leak Detection do Ramp e Brex (EUA)
 */
export function analisarVazamentosDeCaixa(transacoes: Transacao[]): ResultadoRadarVazamentos {
  const alertas: AlertaVazamento[] = [];
  
  if (!transacoes || transacoes.length === 0) {
    return {
      totalVazamentos: 0,
      economiaMensalPotencial: 0,
      economiaAnualPotencial: 0,
      scoreSaude: 100,
      alertas: []
    };
  }

  // Filtrar apenas despesas válidas com valores positivos
  const despesas = transacoes.filter(t => 
    t.tipo === 'despesa' && 
    Number(t.valor) > 0 && 
    t.formaPagamento !== 'transferencia'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DETECÇÃO DE DUPLICIDADES SUSPEITAS
  // ─────────────────────────────────────────────────────────────────────────────
  // Agrupa transações com mesmo valor e fornecedor/descrição próximas em até 5 dias
  const processadasDuplicadas = new Set<string>();

  for (let i = 0; i < despesas.length; i++) {
    const t1 = despesas[i];
    if (processadasDuplicadas.has(t1.id)) continue;

    const data1 = new Date(t1.dataVencimento || t1.dataLancamento || t1.data).getTime();
    const nome1 = (t1.fornecedorNome || t1.descricao || '').trim().toLowerCase();
    const valor1 = Number(t1.valor);

    for (let j = i + 1; j < despesas.length; j++) {
      const t2 = despesas[j];
      if (processadasDuplicadas.has(t2.id)) continue;

      const data2 = new Date(t2.dataVencimento || t2.dataLancamento || t2.data).getTime();
      const nome2 = (t2.fornecedorNome || t2.descricao || '').trim().toLowerCase();
      const valor2 = Number(t2.valor);

      const diffDias = Math.abs(data1 - data2) / (1000 * 60 * 60 * 24);

      // Mesma entidade/descrição e mesmo valor exato com menos de 5 dias de distância
      const matchNome = nome1 === nome2 || (nome1.length > 4 && (nome1.includes(nome2) || nome2.includes(nome1)));
      const matchValor = Math.abs(valor1 - valor2) < 0.05;

      if (matchNome && matchValor && diffDias <= 5 && diffDias >= 0) {
        processadasDuplicadas.add(t1.id);
        processadasDuplicadas.add(t2.id);

        alertas.push({
          id: `dup-${t1.id}-${t2.id}`,
          tipo: 'duplicidade_suspeita',
          titulo: 'Possível Cobrança em Duplicidade',
          descricao: `Detectamos 2 cobranças idênticas de R$ ${valor1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para "${t1.fornecedorNome || t1.descricao}" com apenas ${Math.round(diffDias)} dia(s) de intervalo.`,
          entidade: t1.fornecedorNome || t1.descricao,
          valorAtual: valor1,
          valorAnterior: valor2,
          diferencaValor: valor1,
          impactoAnual: valor1,
          severidade: 'alta',
          dataDetectada: t1.dataVencimento || t1.dataLancamento || t1.data,
          transacaoIds: [t1.id, t2.id],
          categoriaNome: t1.categoriaNome,
          dicaAcao: 'Verifique com o fornecedor ou banco se não houve débito duplo acidental antes de liquidar.'
        });
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DETECÇÃO DE REAJUSTES SILENCIOSOS (PRICE CREEP)
  // ─────────────────────────────────────────────────────────────────────────────
  // Agrupa transações por fornecedor e rastreia aumento acima da média dos últimos meses
  const porFornecedor: Record<string, Transacao[]> = {};
  despesas.forEach(t => {
    const key = (t.fornecedorNome || t.descricao || '').trim().toLowerCase();
    if (!key || key.length < 3) return;
    if (!porFornecedor[key]) porFornecedor[key] = [];
    porFornecedor[key].push(t);
  });

  Object.entries(porFornecedor).forEach(([fornKey, lista]) => {
    // Requer pelo menos 3 lançamentos para ter base histórica confiável
    if (lista.length < 3) return;

    // Ordena do mais recente para o mais antigo
    const ordenadas = [...lista].sort((a, b) => {
      const dA = new Date(a.dataVencimento || a.dataLancamento || a.data).getTime();
      const dB = new Date(b.dataVencimento || b.dataLancamento || b.data).getTime();
      return dB - dA;
    });

    const maisRecente = ordenadas[0];
    const historico = ordenadas.slice(1, 6); // últimos 5 anteriores

    const valorAtual = Number(maisRecente.valor);
    const mediaHistorica = historico.reduce((acc, curr) => acc + Number(curr.valor), 0) / historico.length;

    // Se subiu mais de 6% e a diferença for de pelo menos R$ 15,00
    const diferenca = valorAtual - mediaHistorica;
    const percentual = ((valorAtual - mediaHistorica) / mediaHistorica) * 100;

    if (diferenca >= 15 && percentual >= 6 && mediaHistorica > 0) {
      const impactoAnual = diferenca * 12;
      const fornNome = maisRecente.fornecedorNome || maisRecente.descricao;

      alertas.push({
        id: `creep-${maisRecente.id}`,
        tipo: 'reajuste_silencioso',
        titulo: `Reajuste Silencioso Detectado (+${percentual.toFixed(1)}%)`,
        descricao: `A cobrança de "${fornNome}" subiu de R$ ${mediaHistorica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (média recente) para R$ ${valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, gerando um vazamento anual de R$ ${impactoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        entidade: fornNome,
        valorAtual: valorAtual,
        valorAnterior: mediaHistorica,
        diferencaValor: diferenca,
        percentualAumento: Math.round(percentual),
        impactoAnual: Math.round(impactoAnual),
        severidade: percentual > 20 || impactoAnual > 600 ? 'alta' : 'media',
        dataDetectada: maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data,
        transacaoIds: [maisRecente.id, ...historico.map(h => h.id)],
        categoriaNome: maisRecente.categoriaNome,
        dicaAcao: 'Solicite renegociação imediata da tarifa ou consulte planos concorrentes mais vantajosos.'
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DETECÇÃO DE PICOS ANÔMALOS DE GASTO FORA DO PADRÃO
  // ─────────────────────────────────────────────────────────────────────────────
  // Encontra gastos individuais desproporcionais na mesma categoria (> 3x a média)
  const porCategoria: Record<string, Transacao[]> = {};
  despesas.forEach(t => {
    const cat = t.categoriaNome || 'Geral';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(t);
  });

  Object.entries(porCategoria).forEach(([catNome, lista]) => {
    if (lista.length < 5) return;
    const media = lista.reduce((s, i) => s + Number(i.valor), 0) / lista.length;

    lista.forEach(item => {
      const val = Number(item.valor);
      if (val > media * 3.5 && val > 300) {
        // Evita duplicar se já foi pego como duplicidade
        if (alertas.some(a => a.transacaoIds.includes(item.id))) return;

        alertas.push({
          id: `pico-${item.id}`,
          tipo: 'pico_anomalo',
          titulo: `Pico Anômalo em "${catNome}"`,
          descricao: `Lançamento de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está ${(val / media).toFixed(1)}x acima da média histórica da categoria (R$ ${media.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
          entidade: item.fornecedorNome || item.descricao,
          valorAtual: val,
          valorAnterior: media,
          diferencaValor: val - media,
          impactoAnual: val - media,
          severidade: 'baixa',
          dataDetectada: item.dataVencimento || item.dataLancamento || item.data,
          transacaoIds: [item.id],
          categoriaNome: catNome,
          dicaAcao: 'Confira a nota fiscal e certifique-se de que a alocação de centro de custo está correta.'
        });
      }
    });
  });

  // Ordenar alertas por severidade (alta -> media -> baixa) e depois por impacto anual
  const pesosSeveridade = { alta: 3, media: 2, baixa: 1 };
  alertas.sort((a, b) => {
    if (pesosSeveridade[b.severidade] !== pesosSeveridade[a.severidade]) {
      return pesosSeveridade[b.severidade] - pesosSeveridade[a.severidade];
    }
    return b.impactoAnual - a.impactoAnual;
  });

  // Totais consolidados
  const economiaMensal = alertas.reduce((acc, curr) => {
    if (curr.tipo === 'reajuste_silencioso') return acc + (curr.diferencaValor || 0);
    if (curr.tipo === 'duplicidade_suspeita') return acc + (curr.valorAtual || 0);
    return acc;
  }, 0);

  const economiaAnual = alertas.reduce((acc, curr) => acc + (curr.impactoAnual || 0), 0);

  // Score de Saúde de Caixa (100 menos penalidades de vazamentos)
  const penalidade = Math.min(60, alertas.length * 8 + (economiaMensal > 500 ? 15 : 0));
  const scoreSaude = Math.max(35, 100 - penalidade);

  return {
    totalVazamentos: alertas.length,
    economiaMensalPotencial: Math.round(economiaMensal * 100) / 100,
    economiaAnualPotencial: Math.round(economiaAnual * 100) / 100,
    scoreSaude,
    alertas
  };
}
