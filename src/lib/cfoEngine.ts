import { Transacao, Conta, Fatura, CFODiagnãostico, PrevisaoCaixaPreditiva, Fornecedor } from './types';
import { formatarMoeda } from './storage';

/**
 * MOTOR DE INTELIGÊNCIA ARTIFICIAL CFO DIGITAL & ANÁLISE PREDITIVA
 */

export function gerarDiagnãosticoCFO(
  transacoes: Transacao[] = [],
  contas: Conta[] = [],
  faturas: Fatura[] = []
): CFODiagnãostico {
  const hojeStr = new Date().toISOString().split('T')[0];
  const mesAtual = hojeStr.substring(0, 7);

  // 1. Saldo Disponível Consolidado
  const saldoDisponivel = contas.filter(c => c.ativo && c.tipo !== 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);
  const totalInvestimentos = contas.filter(c => c.tipo === 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);

  // 2. Transações do mês
  const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(mesAtual));
  const receitasMes = transacoes.filter(t => t.tipo === 'receita' && t.data.startsWith(mesAtual));

  const totalDespesasMes = despesasMes.reduce((s, t) => s + t.valor, 0);
  const totalReceitasMes = receitasMes.reduce((s, t) => s + t.valor, 0);

  // 3. Contas em Atraso & Pendentes
  const pendentes = transacoes.filter(t => t.status !== 'pago');
  const atrasadas = pendentes.filter(t => (t.dataVencimento || t.data) < hojeStr);

  const totalAtrasado = atrasadas.reduce((s, t) => s + t.valor, 0);
  const totalPendente = pendentes.reduce((s, t) => s + t.valor, 0);

  // 4. Métricas Financeiras
  const liquidezCorrente = totalDespesasMes > 0 ? Number((saldoDisponivel / totalDespesasMes).toFixed(2)) : 5.0;
  const capitalGiro = saldoDisponivel - totalPendente;
  const taxaInadimplencia = totalPendente > 0 ? Number(((totalAtrasado / totalPendente) * 100).toFixed(1)) : 0;

  // 5. Detecção de Gastos Duplicados
  let duplicadosCount = 0;
  const mapaVistos = new Map<string, string>();

  for (const t of transacoes) {
    const chave = `${t.valor}_${t.fornecedorNome || t.descricao}_${t.data}`;
    if (mapaVistos.has(chave)) {
      duplicadosCount++;
    } else {
      mapaVistos.set(chave, t.id);
    }
  }

  // 6. Oportunidades de Economia
  const oportunidades: string[] = [];
  const porCategoria: Record<string, number> = {};

  for (const d of despesasMes) {
    const cat = d.categoriaNome || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + d.valor;
  }

  const sortedCats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const topCat = sortedCats[0];
    oportunidades.push(`A categoria "${topCat[0]}" representa o maior gasto do mês (${formatarMoeda(topCat[1])}). Reduzir 10% economizará ${formatarMoeda(topCat[1] * 0.1)}.`);
  }

  if (taxaInadimplencia > 0) {
    oportunidades.push(`Evite juros e multas quitando os ${formatarMoeda(totalAtrasado)} em atraso.`);
  }

  if (saldoDisponivel > totalDespesasMes * 3) {
    const excesso = saldoDisponivel - (totalDespesasMes * 2);
    oportunidades.push(`Reserva de liquidez confortável. Considere aplicar ${formatarMoeda(excesso)} em investimentos de renda fixa.`);
  }

  // 7. Anomalias
  const anomalias: string[] = [];
  if (duplicadosCount > 0) {
    anomalias.push(`Detectados ${duplicadosCount} possíveis lançamentos duplicados (mesmo valor e data).`);
  }
  if (totalAtrasado > 0) {
    anomalias.push(`Existem ${atrasadas.length} conta(s) em atraso totalizando ${formatarMoeda(totalAtrasado)}.`);
  }
  if (capitalGiro < 0) {
    anomalias.push(`Capital de Giro Negativo! As obrigações pendentes superam o saldo disponível em ${formatarMoeda(Math.abs(capitalGiro))}.`);
  }

  // 8. Score de Saúde (0 a 100)
  let score = 70;
  if (capitalGiro > 0) score += 15; else score -= 25;
  if (taxaInadimplencia === 0) score += 10; else score -= 15;
  if (liquidezCorrente >= 1.5) score += 10;
  if (duplicadosCount === 0) score += 5; else score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let nivelRisco: CFODiagnãostico['nivelRisco'] = 'BAIXO';
  if (score < 40) nivelRisco = 'CRÍTICO';
  else if (score < 60) nivelRisco = 'ALTO';
  else if (score < 75) nivelRisco = 'MODERADO';

  let tendencia: CFODiagnãostico['tendenciaSaldo90Dias'] = 'ESTÁVEL';
  if (capitalGiro < 0) tendencia = 'RISCO_ILIQUIDEZ';
  else if (totalReceitasMes > totalDespesasMes) tendencia = 'CRESCIMENTO';
  else if (totalDespesasMes > totalReceitasMes * 1.2) tendencia = 'QUEDA';

  return {
    scoreSaude: score,
    nivelRisco,
    liquidezCorrente,
    capitalGiro,
    taxaInadimplencia,
    gastosDuplicadosDetectados: duplicadosCount,
    oportunidadesEconomia: oportunidades.length > 0 ? oportunidades : ['Manter controle financeiro atual com lançamentos em dia.'],
    anomalias: anomalias.length > 0 ? anomalias : ['Nenhuma anomalia crítica detectada nas movimentações recentes.'],
    tendenciaSaldo90Dias: tendencia,
    ultimaAnalise: new Date().toLocaleDateString('pt-BR')
  };
}

/**
 * PROJEÇÃO PREDITIVA DE FLUXO DE CAIXA
 */
export function projetarFluxoCaixa(
  transacoes: Transacao[] = [],
  contas: Conta[] = [],
  dias: number = 30
): PrevisaoCaixaPreditiva {
  const saldoAtual = contas.filter(c => c.ativo && c.tipo !== 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);

  const hoje = new Date();
  const dataAlvoDate = new Date();
  dataAlvoDate.setDate(hoje.getDate() + dias);
  const dataAlvoStr = dataAlvoDate.toISOString().split('T')[0];

  const pendentes = transacoes.filter(t => t.status !== 'pago');

  const receitasPendentes = pendentes
    .filter(t => t.tipo === 'receita' && (t.dataVencimento || t.data) <= dataAlvoStr)
    .reduce((s, t) => s + t.valor, 0);

  const despesasPendentes = pendentes
    .filter(t => t.tipo === 'despesa' && (t.dataVencimento || t.data) <= dataAlvoStr)
    .reduce((s, t) => s + t.valor, 0);

  const saldoPrevisto = saldoAtual + receitasPendentes - despesasPendentes;

  let nivelRisco: PrevisaoCaixaPreditiva['nivelRisco'] = 'OK';
  if (saldoPrevisto < 0) nivelRisco = 'PERIGO';
  else if (saldoPrevisto < saldoAtual * 0.3) nivelRisco = 'ALERTA';

  return {
    dias,
    dataAlvo: dataAlvoDate.toLocaleDateString('pt-BR'),
    saldoPrevisto,
    receitasEsperadas: receitasPendentes,
    despesasEsperadas: despesasPendentes,
    nivelRisco
  };
}

/**
 * ASSISTENTE DE LINGUAGEM NATURAL CFO DIGITAL
 */
export function responderPerguntaCFO(
  pergunta: string,
  transacoes: Transacao[] = [],
  contas: Conta[] = [],
  fornecedores: Fornecedor[] = [],
  faturas: Fatura[] = []
): string {
  const q = pergunta.toLowerCase().trim();
  const hojeStr = new Date().toISOString().split('T')[0];
  const anãoAtual = hojeStr.substring(0, 4);
  const mesAtual = hojeStr.substring(0, 7);

  // Consulta cirúrgica de Saldo de Conta
  const matchConta = q.match(/conta ([\w\s]+)/) || q.match(/na ([\w\s]+)/);
  if (q.includes('quanto tenho') || q.includes('qual o saldo') || q.includes('saldo da') || q.includes('saldo na')) {
    if (matchConta && matchConta[1]) {
      const nomeConta = matchConta[1].trim();
      const contaEncontrada = contas.find(c => c.nome.toLowerCase().includes(nomeConta) || nomeConta.includes(c.nome.toLowerCase()));
      if (contaEncontrada) {
        return `🏦 O saldo atualizado e exato da conta **${contaEncontrada.nome}** é de **${formatarMoeda(contaEncontrada.saldo || 0)}**.`;
      }
    }
    // Se não encontrou ou não especificou, soma tudo
    const saldoTotal = contas.filter(c => c.ativo && c.tipo !== 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);
    return `💰 Seu saldo líquido disponível consolidado (somando todas as contas e carteira) é de **${formatarMoeda(saldoTotal)}**.`;
  }

  // Consulta cirúrgica de Fatura de Cartão
  if (q.includes('fatura') || q.includes('cartão') || q.includes('cartao')) {
    const abertas = faturas.filter(f => f.status === 'aberta' || f.status === 'parcial');
    if (abertas.length > 0) {
      let resposta = `💳 **Resumo das suas Faturas Abertas:**\n`;
      let total = 0;
      for (const f of abertas) {
         resposta += `- **${f.cartaoNome}** (Venc: ${f.dataVencimento || 'N/A'}): **${formatarMoeda(f.valorTotal || 0)}**\n`;
         total += (f.valorTotal || 0);
      }
      resposta += `\n**Total em faturas:** **${formatarMoeda(total)}**`;
      return resposta;
    } else {
      return `✅ Você não possui nenhuma fatura de cartão de crédito aberta não momento!`;
    }
  }

  // Consulta cirúrgica de Maior Gasto do Mês
  if (q.includes('maior gasto') || q.includes('maior despesa') || q.includes('onde mais gastei') || q.includes('gastei mais') || (q.includes('qual despesa') && q.includes('mais'))) {
    const isAnão = q.includes('anão');
    const periodoStr = isAnão ? anãoAtual : mesAtual;
    const labelPeriodo = isAnão ? 'deste anão' : 'deste mês';
    
    const despesasPeriodo = transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(periodoStr));
    
    if (despesasPeriodo.length > 0) {
      const maiorLancamento = [...despesasPeriodo].sort((a, b) => b.valor - a.valor)[0];
      
      const porCategoria: Record<string, number> = {};
      for (const d of despesasPeriodo) {
        const cat = d.categoriaNome || 'Outros';
        porCategoria[cat] = (porCategoria[cat] || 0) + d.valor;
      }
      const topCat = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];

      return `📊 **Análise do Maior Gasto (${labelPeriodo}):**\n\n- O **maior lançamento individual** foi: "${maiorLancamento.descricao}" não valor de **${formatarMoeda(maiorLancamento.valor)}**.\n- A **categoria** com maior volume total de gastos foi: "${topCat[0]}" somando **${formatarMoeda(topCat[1])}**.`;
    } else {
      return `✅ Você ainda não possui despesas registradas para ${labelPeriodo}.`;
    }
  }

  // Consulta cirúrgica de Gastos por termo
  if (q.includes('quanto gastei') || q.includes('gasto com') || q.includes('despesa com') || q.includes('gastei com')) {
    let termo = q.replace(/(quanto gastei com|gasto com|despesa com|qual meu gasto com|gastei com|neste mes|neste anão|não mes|este mes|este anão|em)/g, '').trim();
    
    if (termo) {
      const gastos = transacoes.filter(t => t.tipo === 'despesa' && (
        t.categoriaNome?.toLowerCase().includes(termo) ||
        t.descricao.toLowerCase().includes(termo) ||
        t.fornecedorNome?.toLowerCase().includes(termo)
      ));
      
      const totalMes = gastos.filter(t => t.data.startsWith(mesAtual)).reduce((s, t) => s + t.valor, 0);
      const totalAnão = gastos.filter(t => t.data.startsWith(anãoAtual)).reduce((s, t) => s + t.valor, 0);
      const totalGeral = gastos.reduce((s, t) => s + t.valor, 0);
      
      if (totalGeral > 0) {
        return `📉 Analisando de forma cirúrgica seus gastos envolvendo **"${termo}"**:\n- Gasto neste mês atual: **${formatarMoeda(totalMes)}**\n- Gasto acumulado não anão (${anãoAtual}): **${formatarMoeda(totalAnão)}**`;
      } else {
        return `✅ Não encontrei nenhum gasto registrado com **"${termo}"** em nossa base de dados.`;
      }
    }
  }

  if (q.includes('fornecedor') && (q.includes('mais') || q.includes('caro') || q.includes('aumento'))) {
    const porForn: Record<string, number> = {};
    for (const t of transacoes.filter(t => t.tipo === 'despesa' && t.fornecedorNome)) {
      porForn[t.fornecedorNome!] = (porForn[t.fornecedorNome!] || 0) + t.valor;
    }
    const top = Object.entries(porForn).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      return `📊 O fornecedor com maior volume financeiro de compras é **${top[0]}**, acumulando **${formatarMoeda(top[1])}** em pagamentos.`;
    }
  }

  if (q.includes('reduzir') || q.includes('economizar') || q.includes('cortar')) {
    const diag = gerarDiagnãosticoCFO(transacoes, contas);
    return `💡 **Sugestão Cirúrgica de Economia:**\n${diag.oportunidadesEconomia.join('\n')}`;
  }

  if (q.includes('previsão') || q.includes('caixa')) {
    const prev30 = projetarFluxoCaixa(transacoes, contas, 30);
    return `📈 **Previsão de Caixa para 30 dias (${prev30.dataAlvo}):**\n- Saldo Previsto: **${formatarMoeda(prev30.saldoPrevisto)}**\n- Receitas Futuras: +${formatarMoeda(prev30.receitasEsperadas)}\n- Despesas Futuras: -${formatarMoeda(prev30.despesasEsperadas)}\n- Nível de Risco: **${prev30.nivelRisco}**`;
  }

  // Resposta padrão inteligente
  const diag = gerarDiagnãosticoCFO(transacoes, contas);
  return `🤖 **Diagnóstico CFO Digital:**\n- Score de Saúde Financeira: **${diag.scoreSaude}/100** (${diag.nivelRisco})\n- Capital de Giro Atual: **${formatarMoeda(diag.capitalGiro)}**\n- Taxa de Inadimplência: **${diag.taxaInadimplencia}%**\n\n📌 *Dica Cirúrgica:* Seja específico! Pergunte "Quanto tenho na conta carteira?" ou "Quanto gastei com mercado?"`;
}
