'use client';

import {
  getTransacoes, getContas, getCartoes, getFaturas, getCategorias, getCentrosCusto,
  getFornecedores, getClientes, formatarMoeda, getConfiguracoes
} from '@/lib/storage';
import { getFirebaseAuth } from '@/lib/auth';
import { Transacao, Conta, Cartao, Fatura, Categoria, CentroCusto, Fornecedor, Cliente } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = formatarMoeda;

export interface RespostaDiretor {
  planãoExecutado?: string[];
  ferramentasUtilizadas?: string[];
  respostaTexto: string;
  insightsPreditivos?: string[];
  recomendacoesPraticas?: string[];
}

export class AgenteDiretorFinanceiro {
  private transacoes: Transacao[] = [];
  private contas: Conta[] = [];
  private cartoes: Cartao[] = [];
  private faturas: Fatura[] = [];
  private categorias: Categoria[] = [];
  private centrosCusto: CentroCusto[] = [];
  private fornecedores: Fornecedor[] = [];
  private clientes: Cliente[] = [];

  public async inicializar() {
    const [t, c, cart, fat, cat, cc, forn, cli] = await Promise.all([
      getTransacoes(), getContas(), getCartoes(), getFaturas(),
      getCategorias(), getCentrosCusto(), getFornecedores(), getClientes()
    ]);

    this.transacoes = t;
    this.contas = c;
    this.cartoes = cart;
    this.faturas = fat;
    this.categorias = cat;
    this.centrosCusto = cc;
    this.fornecedores = forn;
    this.clientes = cli;
  }

  // ==== AGENTE DE RESPOSTAS ULTRA-OBJETIVAS E DIRETAS ====
  public async analisarPergunta(pergunta: string, historicoAnterior: string[] = []): Promise<RespostaDiretor> {
    await this.inicializar();

    const pLower = pergunta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mesAtual = new Date().toISOString().slice(0, 7); // yyyy-MM
    const anãoAtual = new Date().getFullYear().toString();

    try {
      const auth = getFirebaseAuth();
      const isBypassAtivo = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
      const uid = isBypassAtivo ? 'clovis-master-bypass' : (auth.currentUser?.uid || 'app');
      const config = await getConfiguracoes(uid);

      if (config.provedorIA === 'openai') {
          if (!config.openaiApiKey) {
              return { respostaTexto: '🤖 **Assistente OpenAI Ativado, mas sem Chave (API Key)!**\n\nVocê ativou a OpenAI nas configurações, mas não preencheu a chave. Vá em Configurações > Integrações IA e cole sua API Key da OpenAI para usar o assistente avançado.' };
          }
          
          const nãoventaDiasAtras = new Date();
          nãoventaDiasAtras.setDate(nãoventaDiasAtras.getDate() - 90);
          const transacoesContexto = this.transacoes
              .filter(t => new Date(t.data) >= nãoventaDiasAtras)
              .map(t => ({
                 desc: t.descricao, valor: t.valor, tipo: t.tipo, status: t.status, data: t.data, cat: t.categoriaNome
              }));

          const orcamentosStr = typeof window !== 'undefined' ? localStorage.getItem('sfp_orcamentos') : '[]';
          const orcamentos = JSON.parse(orcamentosStr || '[]');

          const systemPrompt = `Você é um assistente financeiro virtual super inteligente, cirúrgico e humanão, focado em ajudar o usuário com suas finanças.
Responda de forma natural e direta.
Aqui estão os dados financeiros do usuário em JSON:
Transações (últimos 90 dias): ${JSON.stringify(transacoesContexto)}
Contas: ${JSON.stringify(this.contas.map(c => ({nome: c.nome, saldo: c.saldo})))}
Faturas Abertas: ${JSON.stringify(this.faturas.filter(f => f.status !== 'paga').map(f => ({cartao: f.cartaoNome, valor: f.valorTotal, vencimento: f.dataVencimento})))}
Metas de Gastos (Mensais): ${JSON.stringify(orcamentos.map((o: any) => ({categoria: o.categoriaNome, limite_mensal: o.limite})))}
Categorias cadastradas: ${JSON.stringify(this.categorias.map(c => c.nome))}
Fornecedores/Clientes: ${JSON.stringify(this.fornecedores.map(f => f.nome).concat(this.clientes.map(c => c.nome)))}

Data de hoje: ${new Date().toLocaleDateString('pt-BR')}

Regras:
1. Se o usuário perguntar se pagou algo, verifique nas Transações se existe e se o status é 'pago' ou 'pendente'.
2. Se ele perguntar o gasto de um mês, some os valores daquele mês.
3. Se perguntar de metas/orçamentos, compare o limite com o que foi gasto (veja as transações do mês).
4. Formate valores monetários como R$ X.XXX,XX.
5. Use markdown para deixar a resposta bonita.`;

          const messages = [
              { role: 'system', content: systemPrompt }
          ];

          // historicoAnterior is an array of strings. Index 0 is welcome (assistant), 1 is user, 2 is assistant, etc.
          historicoAnterior.forEach((h, i) => {
              messages.push({ role: i % 2 === 0 ? 'assistant' : 'user', content: h });
          });
          messages.push({ role: 'user', content: pergunta });

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.openaiApiKey}`
              },
              body: JSON.stringify({
                  model: 'gpt-4o', // Most intelligent model available for API usually
                  messages: messages,
                  temperature: 0.3
              })
          });

          if (response.ok) {
              const data = await response.json();
              return { respostaTexto: data.choices[0].message.content };
          } else {
              let errorMsg = response.statusText;
              try {
                  const errorData = await response.json();
                  console.error("OpenAI JSON Error:", errorData);
                  if (errorData.error?.code === 'insufficient_quota') {
                      errorMsg = "Você estourou o limite de créditos da sua conta da OpenAI (Insufficient Quota). Por favor, adicione mais créditos de pagamento não painel da OpenAI (platform.openai.com) para continuar usando a Inteligência Artificial.";
                  } else if (errorData.error?.code === 'invalid_api_key') {
                      errorMsg = "A chave da API (API Key) está inválida ou incorreta.";
                  } else if (errorData.error?.message) {
                      errorMsg = errorData.error.message;
                  }
              } catch (e) {
                  const textError = await response.text();
                  console.error("OpenAI Text Error:", textError);
                  errorMsg = textError || response.statusText;
              }
              
              return { respostaTexto: `🤖 **Erro de Conexão com a OpenAI:**\n\n${errorMsg}` };
          }
      }
    } catch (e: any) {
      console.error("OpenAI fallback error:", e);
      return { respostaTexto: `🤖 **Erro de Conexão (IA):**\n\nNão foi possível processar a requisição com a inteligência artificial. Erro internão: ${e.message}` };
    }

    // Helper para identificar o período desejado (Padrão: Este Mês)
    const isPeriodoMatch = (t: Transacao) => {
        if (pLower.includes('este anão')) return t.data.startsWith(anãoAtual);
        if (pLower.includes('historico') || pLower.includes('total')) return true;
        return (t.dataCompetencia === mesAtual || t.data.startsWith(mesAtual));
    };
    const periodoLabel = pLower.includes('este anão') ? 'Este Anão' : (pLower.includes('historico') || pLower.includes('total') ? 'Histórico Total' : 'Este Mês');

    // 1. QUAL CONTA/FATURA VENCE PRIMEIRA / VENCIMENTOS PRÓXIMOS
    if (pLower.includes('vence') || pLower.includes('primeiro') || pLower.includes('proxima') || pLower.includes('vencimento')) {
      const faturasAbertas = this.faturas.filter(f => f.status === 'aberta' || f.status === 'parcial');
      const despesasPendentes = this.transacoes.filter(t => t.tipo === 'despesa' && t.status === 'pendente');

      const listaPendentes = [
        ...faturasAbertas.map(f => {
          const pago = f.pagamentos?.reduce((a, p) => a + p.valor, 0) || 0;
          return {
            titulo: `Fatura ${f.cartaoNome}`,
            valor: f.valorTotal - pago,
            data: f.dataVencimento,
          };
        }),
        ...despesasPendentes.map(d => ({
          titulo: d.descricao,
          valor: d.valor,
          data: d.data,
        }))
      ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      if (listaPendentes.length === 0) {
        return { respostaTexto: '✅ Você não possui nenhuma conta ou fatura pendente de vencimento não momento.' };
      }

      const proxima = listaPendentes[0];
      const dataFmt = proxima.data.split('-').reverse().join('/');
      return {
        respostaTexto: `📌 **Próximo Vencimento:**\n\n• **${proxima.titulo}**\n• Valor: **${fmt(proxima.valor)}**\n• Data de Vencimento: **${dataFmt}**`
      };
    }

    // 2. SALDO EM CONTA ESPECÍFICA OU CAIXA/PATRIMÔNIO GERAL
    if (pLower.includes('saldo') || pLower.includes('caixa') || pLower.includes('patrimonio') || pLower.includes('quanto tenho')) {
      // 2.1 Verifica se o usuário perguntou sobre uma conta específica primeiro (ex: "saldo na carteira", "saldo não nubank")
      const contasAtivas = this.contas.filter(c => c.ativo);
      const contaMatch = contasAtivas.find(c => {
         const nomeLimpo = c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
         return pLower.includes(nomeLimpo);
      });
      
      if (contaMatch) {
         return { respostaTexto: `🏦 **Saldo em ${contaMatch.nome}:**\n\n• Valor atual disponível: **${fmt(contaMatch.saldo)}**` };
      }

      // 2.2 Se não especificou, dá o geral
      const saldoContas = contasAtivas.filter(c => c.tipo !== 'investimento').reduce((s, c) => s + c.saldo, 0);
      const saldoInvestimentos = contasAtivas.filter(c => c.tipo === 'investimento').reduce((s, c) => s + c.saldo, 0);

      return {
        respostaTexto: `🏦 **Posição Financeira Atual:**\n\n• Saldo Disponível em Contas: **${fmt(saldoContas)}**\n• Reservas & Investimentos: **${fmt(saldoInvestimentos)}**\n• Patrimônio Total: **${fmt(saldoContas + saldoInvestimentos)}**`
      };
    }

    // 3. MAIOR CATEGORIA DE DESPESAS
    if (pLower.includes('maior categoria') || pLower.includes('categoria que mais') || pLower.includes('onde mais gastei')) {
      const despesas = this.transacoes.filter(t => t.tipo === 'despesa' && isPeriodoMatch(t));
      const porCat: Record<string, number> = {};
      despesas.forEach(t => {
        const c = t.categoriaNome || 'Outros';
        porCat[c] = (porCat[c] || 0) + t.valor;
      });
      const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];

      if (!topCat) {
        return { respostaTexto: `ℹ️ Não há registros de despesas em ${periodoLabel} para calcular a maior categoria.` };
      }

      return {
        respostaTexto: `🏆 **Maior Categoria de Gastos (${periodoLabel}):**\n\n• Categoria: **${topCat[0]}**\n• Total acumulado: **${fmt(topCat[1])}**`
      };
    }

    // 4. GASTOS ESPECÍFICOS POR TERMO ABERTO (ex: "quanto gastei com farmacia", "despesas de uber")
    if (pLower.includes('quanto gastei') || pLower.includes('gasto com') || pLower.includes('gastos com') || pLower.includes('despesa com') || pLower.includes('despesas com') || pLower.includes('gastei com') || pLower.includes('gastei em') || pLower.includes('gasto de') || pLower.includes('despesas de')) {
      
      // Removemos palavras de conexão e de tempo para sobrar apenas o "Assunto/Termo" principal
      let termo = pLower.replace(/\b(quanto|qual|o|meu|gastei|gasto|gastos|despesa|despesas|com|em|de|da|do|na|não|neste|este|nesse|anão|mes|mês|hoje|agora|ja|já)\b/g, ' ').replace(/[\?]/g, '').trim();
      termo = termo.replace(/\s+/g, ' ').trim();
      
      if (termo.length > 1) {
          const despesas = this.transacoes.filter(t => t.tipo === 'despesa' && isPeriodoMatch(t));
          
          const filtradas = despesas.filter(t => {
              const tCat = (t.categoriaNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const tDesc = (t.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const tForn = (t.fornecedorNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const term = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return tCat.includes(term) || tDesc.includes(term) || tForn.includes(term);
          });
          
          if (filtradas.length > 0) {
             const totalGasto = filtradas.reduce((s, t) => s + t.valor, 0);
             return {
                respostaTexto: `📊 **Gastos com "${termo.charAt(0).toUpperCase() + termo.slice(1)}" (${periodoLabel}):**\n\n• Valor total acumulado: **${fmt(totalGasto)}** (${filtradas.length} lançamentos encontrados)`
             };
          } else {
             return {
                respostaTexto: `🔍 Não encontrei nenhuma despesa relacionada a "${termo}" registrada em ${periodoLabel}.`
             };
          }
      }
    }

    // 4.5 VERIFICAÇÃO DE PAGAMENTO ESPECÍFICO (ex: "a fatura de energia está paga?")
    if (pLower.includes('paga') || pLower.includes('pago') || pLower.includes('paguei') || pLower.includes('foi pago') || pLower.includes('esta paga') || pLower.includes('foi paga')) {
      const termosExcluidos = ['paga', 'pago', 'paguei', 'foi', 'esta', 'esse', 'mes', 'anão', 'a', 'de', 'fatura', 'conta', 'o', 'que', 'da', 'do', 'na', 'não'];
      const palavras = pLower.replace(/[\?.,!]/g, '').split(' ').filter(p => !termosExcluidos.includes(p) && p.length > 2);
      
      if (palavras.length > 0) {
        const transacoesPeriodo = this.transacoes.filter(t => t.tipo === 'despesa' && isPeriodoMatch(t));
        const encontradas = transacoesPeriodo.filter(t => {
           const desc = (t.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
           const cat = (t.categoriaNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
           return palavras.some(palavra => desc.includes(palavra) || cat.includes(palavra));
        });

        if (encontradas.length > 0) {
           const pags = encontradas.filter(t => t.status === 'pago');
           const pends = encontradas.filter(t => t.status === 'pendente' || t.status === 'atrasado');
           let resp = `🔍 **Verificação de Lançamentos (${periodoLabel}):**\n\nEncontrei ${encontradas.length} registro(s) para "${palavras.join(' ')}":\n\n`;
           if (pags.length > 0) {
               resp += `✅ **Consta como Pago:**\n`;
               pags.forEach(p => resp += `• ${p.descricao} - **${fmt(p.valor)}** (Vencimento/Data: ${p.data.split('-').reverse().join('/')})\n`);
           }
           if (pends.length > 0) {
               resp += `\n⏳ **Consta como Pendente:**\n`;
               pends.forEach(p => resp += `• ${p.descricao} - **${fmt(p.valor)}** (Vencimento: ${p.data.split('-').reverse().join('/')})\n`);
           }
           return { respostaTexto: resp };
        } else {
           return { respostaTexto: `🔍 Não encontrei nenhum lançamento de despesa (pago ou pendente) relacionado a "${palavras.join(' ')}" em ${periodoLabel}.` };
        }
      }
    }

    // 5. RESUMO GERAL DE ENTRADAS E SAÍDAS (Apenas se pedir expressamente)
    if (pLower.includes('resumo') || pLower.includes('balanco') || pLower.includes('resultado') || pLower.includes('entradas e saidas') || pLower.includes('este mes')) {
      const despesas = this.transacoes.filter(t => t.tipo === 'despesa' && isPeriodoMatch(t));
      const receitas = this.transacoes.filter(t => t.tipo === 'receita' && isPeriodoMatch(t));
      const totalDespesas = despesas.reduce((s, t) => s + t.valor, 0);
      const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);

      return {
        respostaTexto: `📊 **Resumo Financeiro (${periodoLabel}):**\n\n💚 Entradas: **${fmt(totalReceitas)}**\n❤️ Saídas: **${fmt(totalDespesas)}**\n⚖️ Resultado: **${fmt(totalReceitas - totalDespesas)}**`
      };
    }

    // 5.5. METAS E ORÇAMENTOS MENSAIS
    if (pLower.includes('meta') || pLower.includes('orcamento') || pLower.includes('orçamento') || pLower.includes('limite')) {
      const configMetas = await import('@/lib/storage').then(m => m.getMetasConfig());
      const orcamentos = configMetas.orcamentos || [];
      const metaGlobal = configMetas.orcamentoMaximo || 0;

      if (orcamentos.length === 0 && metaGlobal === 0) {
        return { respostaTexto: '🎯 Você ainda não possui metas de gastos (orçamentos) cadastradas não sistema.' };
      }

      const despesasMes = this.transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(mesAtual));
      
      let totalGasto = 0;
      let detalhamento = '';
      
      orcamentos.forEach((o: any) => {
         const gastoNaCat = despesasMes.filter(t => (t.categoriaNome || '').toLowerCase() === (o.categoriaNome || '').toLowerCase()).reduce((s, t) => s + t.valor, 0);
         const percentual = o.limite > 0 ? (gastoNaCat / o.limite) * 100 : 0;
         const alerta = percentual > 100 ? '🔴 (Estourou)' : percentual > 80 ? '🟡 (Atenção)' : '🟢 (OK)';
         detalhamento += `- **${o.categoriaNome}**: Limite de <span style="color:#10b981;font-weight:bold">${fmt(o.limite)}</span> | Gastou <span style="color:#ef4444;font-weight:bold">${fmt(gastoNaCat)}</span> ${alerta}\n`;
         totalGasto += gastoNaCat;
      });
      
      let resp = '';
      const isPerguntaValor = pLower.includes('valor') || pLower.includes('total') || pLower.includes('qual o meu') || pLower.includes('qual meu');

      if (metaGlobal > 0) {
         resp += `🎯 **O valor do seu Orçamento Mensal Global é de <span style="color:#10b981;font-weight:bold">${fmt(metaGlobal)}</span>.**\n`;
         resp += `Até o momento, você consumiu <span style="color:#ef4444;font-weight:bold">${fmt(totalGasto)}</span> das categorias com meta estipulada.\n\n`;
         resp += `*Para sua referência, aqui está a quebra das metas individuais:*\n\n`;
      } else {
         resp += `🎯 **Suas Metas e Orçamentos (Mês atual):**\n\n`;
      }
      
      resp += detalhamento;
      
      return { respostaTexto: resp };
    }

    // 6. FALLBACK SE NÃO ENTENDER NADA
    return {
      respostaTexto: `🤖 **Não consegui compreender a sua pergunta com os comandos básicos.**\n\nPara perguntas complexas, naturais ou análises detalhadas do seu orçamento, ative a **Inteligência Artificial Avançada (OpenAI)** nas Configurações.\n\n*No modo básico, tente perguntar coisas como: "Qual conta vence hoje?", "Saldo", "Maior categoria", "Resumo do mês" ou "A fatura X está paga?".*`
    };
  }
}
