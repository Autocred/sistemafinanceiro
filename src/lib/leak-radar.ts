import { Transacao } from './types';
import { normalizeDate } from './financialEngine';

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
  descricaoTransacao?: string;
  dicaAcao: string;
}


export interface AssinaturaRecorrente {
  id: string;
  entidade: string;
  categoriaNome?: string;
  valorMensal: number;
  custoAnual: number;
  quantidadeOcorrencias: number;
  primeiraData: string;
  ultimaData: string;
  ultimoValor: number;
  intervaloMedioDias: number;
  formaPagamento?: string;
  isTarifaBancaria: boolean;
  statusCorte: 'ativo' | 'zumbi' | 'essencial';
  transacaoIds: string[];
}

export interface ReajusteAprovado {
  id: string;
  entidade: string;
  novoValorPadrao: number;
  valorAnterior: number;
  percentualAumento?: number;
  categoriaNome?: string;
  dataAprovacao: string;
  motivo?: string;
}

function parseDataTimestamp(dataRaw?: any): number {
  if (!dataRaw) return 0;
  const norm = normalizeDate(dataRaw);
  if (!norm) return 0;
  const t = new Date(norm).getTime();
  return isNaN(t) ? 0 : t;
}

function formatarDataBr(dataRaw?: any): string {
  if (!dataRaw) return '';
  const norm = normalizeDate(dataRaw);
  if (!norm) return '';
  const parts = norm.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return norm;
}

export interface ResultadoRadarVazamentos {
  totalVazamentos: number;
  economiaMensalPotencial: number;
  economiaAnualPotencial: number;
  scoreSaude: number; // 0 a 100
  alertas: AlertaVazamento[];
  assinaturas: AssinaturaRecorrente[];
  totalAnualAssinaturas: number;
  totalEconomiaZumbis: number;
}

/**
 * Motor Forense de Detecção Autônoma de Vazamentos e Desperdícios
 * Inspirado nos algoritmos de Expense Leak Detection do Ramp e Brex (EUA)
 */
export function analisarVazamentosDeCaixa(
  transacoes: Transacao[],
  reajustesAprovados: Record<string, ReajusteAprovado> = {},
  statusAssinaturas: Record<string, 'ativo' | 'zumbi' | 'essencial'> = {}
): ResultadoRadarVazamentos {
  const alertas: AlertaVazamento[] = [];
  
  if (!transacoes || transacoes.length === 0) {
    return {
      totalVazamentos: 0,
      economiaMensalPotencial: 0,
      economiaAnualPotencial: 0,
      scoreSaude: 100,
      alertas: [],
      assinaturas: [],
      totalAnualAssinaturas: 0,
      totalEconomiaZumbis: 0
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

    const data1 = parseDataTimestamp(t1.dataVencimento || t1.dataLancamento || t1.data);
    const nome1 = (t1.fornecedorNome || t1.descricao || '').trim().toLowerCase();
    const valor1 = Number(t1.valor);

    for (let j = i + 1; j < despesas.length; j++) {
      const t2 = despesas[j];
      if (processadasDuplicadas.has(t2.id)) continue;

      const data2 = parseDataTimestamp(t2.dataVencimento || t2.dataLancamento || t2.data);
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
          descricaoTransacao: t1.descricao,
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

    // Ordena do mais recente para o mais antigo de forma robusta
    const ordenadas = [...lista].sort((a, b) => {
      const dA = parseDataTimestamp(a.dataVencimento || a.dataLancamento || a.data);
      const dB = parseDataTimestamp(b.dataVencimento || b.dataLancamento || b.data);
      return dB - dA;
    });

    const maisRecente = ordenadas[0];
    const historico = ordenadas.slice(1, 6); // últimos 5 anteriores

    const valorAtual = Number(maisRecente.valor);
    const mediaHistorica = historico.reduce((acc, curr) => acc + Number(curr.valor), 0) / historico.length;
    const fornNome = maisRecente.fornecedorNome || maisRecente.descricao;
    const fornKeyNorm = fornKey.trim().toLowerCase();
    const aprovado = reajustesAprovados[fornKeyNorm];

    let baseCalculo = mediaHistorica;
    let baseLabel = 'média recente';

    if (aprovado && aprovado.novoValorPadrao > 0) {
      // Se o valor atual está dentro do novo padrão aprovado pelo usuário (com tolerância de 2%)
      if (valorAtual <= aprovado.novoValorPadrao * 1.02) {
        return; // Não gera alerta! Reajuste já foi aprovado pelo gestor!
      }
      baseCalculo = aprovado.novoValorPadrao;
      baseLabel = 'padrão aprovado';
    }

    // Se subiu mais de 6% e a diferença for de pelo menos R$ 15,00
    const diferenca = valorAtual - baseCalculo;
    const percentual = ((valorAtual - baseCalculo) / baseCalculo) * 100;

    if (diferenca >= 15 && percentual >= 6 && baseCalculo > 0) {
      const impactoAnual = diferenca * 12;
      const dataBr = formatarDataBr(maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data);
      const descComp = maisRecente.descricao && maisRecente.descricao !== fornNome ? ` (${maisRecente.descricao})` : '';

      alertas.push({
        id: `creep-${maisRecente.id}`,
        tipo: 'reajuste_silencioso',
        titulo: `Reajuste Silencioso Detectado (+${percentual.toFixed(1)}%)`,
        descricao: `A cobrança de "${fornNome}"${descComp}${dataBr ? ` em ${dataBr}` : ''} subiu de R$ ${baseCalculo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${baseLabel}) para R$ ${valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, gerando um vazamento anual de R$ ${impactoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        entidade: fornNome,
        valorAtual: valorAtual,
        valorAnterior: baseCalculo,
        diferencaValor: diferenca,
        percentualAumento: Math.round(percentual),
        impactoAnual: Math.round(impactoAnual),
        severidade: percentual > 20 || impactoAnual > 600 ? 'alta' : 'media',
        dataDetectada: maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data,
        transacaoIds: [maisRecente.id, ...historico.map(h => h.id)],
        categoriaNome: maisRecente.categoriaNome,
        descricaoTransacao: maisRecente.descricao,
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
          descricaoTransacao: item.descricao,
          dicaAcao: 'Confira a nota fiscal e certifique-se de que a alocação de centro de custo está correta.'
        });
      }
    });
  });

  
  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DETECÇÃO DE ASSINATURAS RECORRENTES & TARIFAS BANCÁRIAS (ZUMBIS)
  // ─────────────────────────────────────────────────────────────────────────────
  const KEYWORDS_ASSINATURA = [
    'netflix', 'spotify', 'prime', 'amazon prime', 'disney', 'hbo', 'max', 'paramount', 'globoplay', 'apple', 'icloud',
    'google', 'storage', 'workspace', 'drive', 'youtube', 'dropbox', 'chatgpt', 'openai', 'anthropic', 'midjourney',
    'canva', 'adobe', 'creative cloud', 'microsoft', 'office', '365', 'github', 'vercel', 'heroku', 'aws',
    'digitalocean', 'hostgator', 'locaweb', 'cloudflare', 'zoom', 'slack', 'trello', 'notion', 'asana', 'jira',
    'gympass', 'smartfit', 'totalpass', 'bluefit', 'academia', 'plano de saude', 'unimed', 'bradesco saude', 'amil',
    'vivo', 'claro', 'tim', 'oi', 'telecom', 'internet', 'fibra', 'tarifa', 'cesta', 'manutencao de conta', 'anuidade',
    'mensalidade', 'seguro', 'sem parar', 'conectcar', 'veloe', 'tag', 'pedagio', 'software', 'saas', 'dominio', 'antivirus'
  ];

  const KEYWORDS_TARIFA_BANCARIA = [
    'tarifa', 'cesta', 'manutencao de conta', 'pacote de servico', 'anuidade', 'ted', 'doc', 'iof', 'encargos', 'tarifa bancaria'
  ];

  const gruposAssinaturas: Record<string, Transacao[]> = {};
  despesas.forEach(t => {
    const rawNome = (t.fornecedorNome || t.descricao || '').trim();
    if (!rawNome || rawNome.length < 3) return;
    const key = rawNome.toLowerCase()
      .replace(/\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|\d{2}\/\d{2,4}|\d{4}-\d{2})\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!gruposAssinaturas[key]) gruposAssinaturas[key] = [];
    gruposAssinaturas[key].push(t);
  });

  const assinaturas: AssinaturaRecorrente[] = [];

  Object.entries(gruposAssinaturas).forEach(([key, lista]) => {
    const ordenadas = [...lista].sort((a, b) => {
      const dA = parseDataTimestamp(a.dataPagamento || a.dataVencimento || a.dataLancamento || a.data);
      const dB = parseDataTimestamp(b.dataPagamento || b.dataVencimento || b.dataLancamento || b.data);
      return dA - dB;
    });

    const maisRecente = ordenadas[ordenadas.length - 1];
    const primeira = ordenadas[0];
    const fornNome = maisRecente.fornecedorNome || maisRecente.descricao;
    
    const mesesDistintos = new Set(
      ordenadas.map(t => {
        const norm = normalizeDate(t.dataPagamento || t.dataVencimento || t.dataLancamento || t.data);
        return norm ? norm.slice(0, 7) : '';
      }).filter(Boolean)
    );

    const temFlagRecorrente = ordenadas.some(t => t.recorrente);
    const temKeywordAssinatura = KEYWORDS_ASSINATURA.some(kw => 
      key.includes(kw) || ordenadas.some(t => (t.descricao || '').toLowerCase().includes(kw))
    );
    const isTarifaBancaria = KEYWORDS_TARIFA_BANCARIA.some(kw => 
      key.includes(kw) || ordenadas.some(t => (t.descricao || '').toLowerCase().includes(kw))
    );

    const isRecorrente = temFlagRecorrente || mesesDistintos.size >= 2 || (temKeywordAssinatura && ordenadas.length >= 1);

    if (!isRecorrente) return;

    const ultimoValor = Number(maisRecente.valor);
    const somaValores = ordenadas.reduce((s, i) => s + Number(i.valor), 0);
    const valorMedio = somaValores / ordenadas.length;
    const valorMensal = ultimoValor > 0 ? ultimoValor : valorMedio;
    const custoAnual = Math.round(valorMensal * 12 * 100) / 100;

    let intervaloMedioDias = 30;
    if (ordenadas.length >= 2) {
      const tsPrimeiro = parseDataTimestamp(primeira.dataPagamento || primeira.dataVencimento || primeira.dataLancamento || primeira.data);
      const tsUltimo = parseDataTimestamp(maisRecente.dataPagamento || maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data);
      if (tsUltimo > tsPrimeiro) {
        intervaloMedioDias = Math.round((tsUltimo - tsPrimeiro) / ((ordenadas.length - 1) * 1000 * 60 * 60 * 24));
      }
    }

    const subId = `sub-${key.replace(/[^a-z0-9]/g, '-')}`;
    const statusCorte = statusAssinaturas[subId] || 'ativo';

    assinaturas.push({
      id: subId,
      entidade: fornNome,
      categoriaNome: maisRecente.categoriaNome,
      valorMensal: Math.round(valorMensal * 100) / 100,
      custoAnual,
      quantidadeOcorrencias: ordenadas.length,
      primeiraData: primeira.dataPagamento || primeira.dataVencimento || primeira.dataLancamento || primeira.data,
      ultimaData: maisRecente.dataPagamento || maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data,
      ultimoValor,
      intervaloMedioDias,
      formaPagamento: maisRecente.formaPagamento,
      isTarifaBancaria,
      statusCorte,
      transacaoIds: ordenadas.map(t => t.id)
    });

    if (isTarifaBancaria && statusCorte !== 'essencial') {
      alertas.push({
        id: `tarifa-${subId}`,
        tipo: 'assinatura_fantasma',
        titulo: 'Tarifa Bancária Recorrente (100% Evitável)',
        descricao: `Identificamos cobrança contínua de tarifa/manutenção bancária em "${fornNome}" de R$ ${valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês, totalizando R$ ${custoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano.`,
        entidade: fornNome,
        valorAtual: valorMensal,
        valorAnterior: 0,
        diferencaValor: valorMensal,
        impactoAnual: custoAnual,
        severidade: 'media',
        dataDetectada: maisRecente.dataPagamento || maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data,
        transacaoIds: ordenadas.map(t => t.id),
        categoriaNome: maisRecente.categoriaNome,
        descricaoTransacao: maisRecente.descricao,
        dicaAcao: 'Solicite a conversão para o Pacote de Serviços Essenciais Gratuito (Resolução 3.919 Bacen) ou utilize contas digitais gratuitas.'
      });
    }

    if (statusCorte === 'zumbi') {
      alertas.push({
        id: `zumbi-${subId}`,
        tipo: 'assinatura_fantasma',
        titulo: 'Assinatura Zumbi Marcada para Corte',
        descricao: `O serviço "${fornNome}" foi classificado como zumbi/desnecessário. Cancele no fornecedor para recuperar R$ ${custoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano no seu fluxo de caixa.`,
        entidade: fornNome,
        valorAtual: valorMensal,
        valorAnterior: 0,
        diferencaValor: valorMensal,
        impactoAnual: custoAnual,
        severidade: 'alta',
        dataDetectada: maisRecente.dataPagamento || maisRecente.dataVencimento || maisRecente.dataLancamento || maisRecente.data,
        transacaoIds: ordenadas.map(t => t.id),
        categoriaNome: maisRecente.categoriaNome,
        descricaoTransacao: maisRecente.descricao,
        dicaAcao: 'Acesse a conta deste serviço e interrompa a renovação automática para cessar as cobranças.'
      });
    }
  });

  assinaturas.sort((a, b) => {
    if (a.statusCorte === 'zumbi' && b.statusCorte !== 'zumbi') return -1;
    if (b.statusCorte === 'zumbi' && a.statusCorte !== 'zumbi') return 1;
    if (a.isTarifaBancaria && !b.isTarifaBancaria) return -1;
    if (!a.isTarifaBancaria && b.isTarifaBancaria) return 1;
    return b.custoAnual - a.custoAnual;
  });

  const totalAnualAssinaturas = assinaturas.reduce((acc, curr) => acc + curr.custoAnual, 0);
  const totalEconomiaZumbis = assinaturas
    .filter(s => s.statusCorte === 'zumbi')
    .reduce((acc, curr) => acc + curr.custoAnual, 0);

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
    alertas,
    assinaturas,
    totalAnualAssinaturas: Math.round(totalAnualAssinaturas * 100) / 100,
    totalEconomiaZumbis: Math.round(totalEconomiaZumbis * 100) / 100
  };
}
