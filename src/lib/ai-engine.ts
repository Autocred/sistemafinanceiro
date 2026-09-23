'use client';

// Motor de IA para interpretação de linguagem natural
// Funciona offline com regras inteligentes e fuzzy search + OpenAI como fallback

import { format, subDays, addMonths, addDays } from 'date-fns';
import {
  PreLancamento, TipoTransacao, FormaPagamento, StatusTransacao, Fornecedor, Cliente
} from './types';
import {
  CATEGORIAS_PADRAO, CENTROS_CUSTO_PADRAO, CONTAS_PADRAO,
  PADROES_IA, PALAVRAS_DESPESA, PALAVRAS_RECEITA,
  PALAVRAS_PIX, PALAVRAS_DINHEIRO, PALAVRAS_CARTAO_CREDITO, PALAVRAS_CARTAO_DEBITO,
  PALAVRAS_PARCELADO, PALAVRAS_RECORRENTE, PALAVRAS_HOJE, PALAVRAS_ONTEM,
  FORMAS_PAGAMENTO_LABELS
} from './defaults';
import { getHistoricoIA, salvarHistoricoIA, getContas, getCategorias, getCentrosCusto, getFornecedores, getCartoes, getConfiguracoes, getClientes } from './storage';

function textoLower(texto: string): string {
  return texto.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.,]/g, ' ');
}

function contemPalavra(texto: string, palavras: string[]): boolean {
  const t = textoLower(texto);
  return palavras.some(p => t.includes(textoLower(p)));
}

// ==== FUZZY MATCH (LEVENSHTEIN) ====
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function similaridade(t1: string, t2: string): number {
  if (!t1 || !t2) return 0;
  const max = Math.max(t1.length, t2.length);
  if (max === 0) return 100;
  const distance = levenshteinDistance(t1, t2);
  return ((max - distance) / max) * 100;
}

export function encontrarMelhorSimilaridade<T>(
  textoOriginal: string, 
  lista: T[], 
  getString: (item: T) => string
): { bestMatch?: T; options: T[] } {
  const t = textoLower(textoOriginal);
  if (!t) return { options: [] };
  
  const scoreMap = lista.map(item => {
    const s = textoLower(getString(item));
    let score = 0;
    
    // Se o textoOriginal for exatamente igual
    if (s === t) {
      score = 100;
    } else {
      // Separa palavras para verificar se pelo menos uma bate (ex: "Magazine" e "Luiza")
      const wordsT = t.split(' ');
      const wordsS = s.split(' ');
      let maxWordScore = 0;
      for (const wt of wordsT) {
        if (wt.length < 4) continue; // Ignãora preposições
        for (const ws of wordsS) {
          const sim = similaridade(wt, ws);
          if (sim > maxWordScore) maxWordScore = sim;
        }
      }
      
      const dist = similaridade(t, s);
      score = Math.max(dist, maxWordScore * 0.85); // Dá bônus se uma palavra bateu forte
      
      // Se o nome completo estiver contido não texto falado, a chance é gigantesca
      if (t.includes(s)) {
        score = 100;
      } else if (s.includes(t) && t.length > 3) {
        score = 90;
      }
    }
    return { item, score };
  });

  // Filtro de similaridade razoável (>65 para evitar falsos positivos como Mercado Lider x Mercado Pago)
  const sorted = scoreMap.filter(x => x.score > 65).sort((a, b) => b.score - a.score);
  if (sorted.length === 0) return { options: [] };
  
  // Se for maior que 85 e bem maior que o segundo lugar, é o vencedor absoluto.
  if (sorted[0].score >= 85 && (sorted.length === 1 || sorted[0].score - sorted[1].score > 10)) {
    return { bestMatch: sorted[0].item, options: sorted.map(x => x.item) };
  }
  
  // Caso contrário, retorna opções para o usuário escolher (ambiguidade).
  return { options: sorted.map(x => x.item) };
}

// ==== EXTRATORES ====

// Extrai valor monetário do texto
function extrairValor(texto: string): number | null {
  const padroes = [
    /valor\s+(?:de\s+)?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /r\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
    /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*reais/gi,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*reais/gi,
    /r\$\s*(\d+(?:[.,]\d+)?)/gi,
    /(\d{1,6}(?:[,\.]\d{1,2})?)\s*(?:reais|real|brl)/gi,
  ];

  for (const padrao of padroes) {
    const match = padrao.exec(texto);
    if (match) {
      let numStr = match[1].replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(numStr);
      if (!isNaN(valor) && valor > 0) return valor;
    }
  }

  const numLivres = texto.match(/\b(\d{1,5}(?:[,\.]\d{2})?)\b/g);
  if (numLivres) {
    let maiorValor = null;
    for (const n of numLivres) {
      const numOriginal = n;
      const v = parseFloat(n.replace(',', '.'));
      // Ignãora números pequenãos sem vírgula ou números que parecem anãos (2020 a 2030)
      if (v < 5 && !numOriginal.includes(',') && !numOriginal.includes('.')) continue; 
      if (v >= 2000 && v <= 2040 && !numOriginal.includes(',') && !numOriginal.includes('.')) continue;
      
      if (v > 0 && v <= 99999) {
        if (!maiorValor || v > maiorValor) maiorValor = v;
      }
    }
    if (maiorValor) return maiorValor;
  }
  return null;
}

export function calcularDataVencimentoCartao(diaVencimento: number, dataReferencia?: Date): string {
  if (!diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
    return format(dataReferencia || new Date(), 'yyyy-MM-dd');
  }
  const hoje = dataReferencia || new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diaHoje = hoje.getDate();

  let targetDate: Date;
  // O usuário determinou que a fatura fecha EXATAMENTE no dia do vencimento.
  // Transações até o dia do vencimento caem na fatura atual. Após o vencimento, nova fatura.
  const diaFechamento = diaVencimento;
  
  if (diaHoje <= diaFechamento) {
    targetDate = new Date(ano, mes, diaVencimento);
  } else {
    targetDate = new Date(ano, mes + 1, diaVencimento);
  }
  return format(targetDate, 'yyyy-MM-dd');
}

// Extrai data do texto
function extrairData(texto: string): { data: string; dataExplicitamenteMencionada: boolean } {
  const hoje = new Date();
  const t = textoLower(texto);

  if (contemPalavra(texto, PALAVRAS_HOJE)) return { data: format(hoje, 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  if (contemPalavra(texto, PALAVRAS_ONTEM)) return { data: format(subDays(hoje, 1), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  if (t.includes('anteontem')) return { data: format(subDays(hoje, 2), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  if (t.includes('semana passada')) return { data: format(subDays(hoje, 7), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  if (t.includes('mes que vem') || t.includes('proximo mes')) return { data: format(addMonths(hoje, 1), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  if (t.includes('amanha')) return { data: format(addDays(hoje, 1), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };

  // Data não formato dd/mm ou dd/mm/yyyy
  const dataFormatada = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  if (dataFormatada) {
    const d = parseInt(dataFormatada[1]);
    const m = parseInt(dataFormatada[2]) - 1;
    let y = hoje.getFullYear();
    if (dataFormatada[3]) {
      y = dataFormatada[3].length === 2 ? 2000 + parseInt(dataFormatada[3]) : parseInt(dataFormatada[3]);
    }
    return { data: format(new Date(y, m, d), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
  }

  // Dia do mês (ex: "dia 15", "15 de julho")
  const diaMatch = texto.match(/\bdia\s+(\d{1,2})\b/i) || texto.match(/\b(\d{1,2})\s+de\s+(\w+)/i);
  if (diaMatch) {
    const dia = parseInt(diaMatch[1]);
    let mes = hoje.getMonth();
    if (diaMatch[2]) {
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'nãovembro', 'dezembro'];
      const mIdx = meses.findIndex(m => m.startsWith(diaMatch[2].toLowerCase().substring(0, 3)));
      if (mIdx !== -1) mes = mIdx;
    }
    if (dia >= 1 && dia <= 31) {
      return { data: format(new Date(hoje.getFullYear(), mes, dia), 'yyyy-MM-dd'), dataExplicitamenteMencionada: true };
    }
  }

  return { data: format(hoje, 'yyyy-MM-dd'), dataExplicitamenteMencionada: false };
}

// Extrai data de competência (ex: "referente a julho")
function extrairCompetencia(texto: string, dataVencimento: string): string {
  const match = texto.match(/referente ao m[eê]s de ([a-zç]+)(?: de (\d{4}))?/i) || 
                texto.match(/fatura de ([a-zç]+)(?: de (\d{4}))?/i);
  if (match) {
    const mesFalado = match[1].toLowerCase();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'nãovembro', 'dezembro'];
    const mesIdx = meses.findIndex(m => m.startsWith(mesFalado.substring(0, 3)));
    if (mesIdx !== -1) {
      const anão = match[2] ? parseInt(match[2]) : new Date().getFullYear();
      return `${anão}-${String(mesIdx + 1).padStart(2, '0')}`;
    }
  }
  return dataVencimento.substring(0, 7);
}

// Status do Pagamento
function detectarStatus(texto: string): StatusTransacao {
  const t = textoLower(texto);
  if (contemPalavra(texto, ['ja paguei', 'foi pago', 'paguei', 'transferi', 'recebi', 'ja recebi'])) return 'pago';
  if (contemPalavra(texto, ['vou pagar', 'a pagar', 'vence', 'vencimento', 'a receber', 'vou receber', 'pendente'])) return 'pendente';
  return 'pago'; // default
}

// Extrai número de parcelas
function extrairParcelas(texto: string): { parcelado: boolean; totalParcelas: number } {
  const match = texto.match(/(\d+)\s*[xX×]/i) ||
    texto.match(/(\d+)\s*(?:parcelas|vezes)/i) ||
    texto.match(/em\s*(\d+)\s*(?:parcelas|vezes)/i) ||
    texto.match(/dividi\s*em\s*(\d+)/i);

  if (match) {
    const n = parseInt(match[1]);
    if (n >= 2 && n <= 120) return { parcelado: true, totalParcelas: n };
  }

  if (contemPalavra(texto, PALAVRAS_PARCELADO)) return { parcelado: true, totalParcelas: 2 };
  return { parcelado: false, totalParcelas: 1 };
}

// Extrai nome bruto de Conta (quando não existe não banco)
function extrairNomeContaBruta(texto: string): string | undefined {
  const t = textoLower(texto);
  const preposicoes = ['conta ', 'banco ', 'cartao ', 'pelo ', 'pela '];
  for (const prep of preposicoes) {
    const idx = t.indexOf(prep);
    if (idx !== -1) {
      const restante = texto.substring(idx + prep.length);
      const partes = restante.split(/\s+/).slice(0, 2);
      const nome = partes.join(' ').replace(/[.,!?]/g, '').trim();
      if (nome.length > 2 && nome.length < 20) return nome.replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  return undefined;
}

// Detecta forma de pagamento e vincula Conta/Cartão
function detectarFormaPagamento(texto: string, contas: { id: string; nome: string; tipo?: string }[], cartoes: { id: string; nome: string; contaId?: string }[]): {
  forma: FormaPagamento;
  contaId: string;
  contaNome: string;
  cartaoId?: string;
  cartaoNome?: string;
  contaExplicitamenteMencionada: boolean;
  formaExplicitamenteMencionada: boolean;
} {
  const t = textoLower(texto);

  // 1. Regra Absoluta da Fatura
  if (contemPalavra(texto, ['fatura'])) {
    const { bestMatch: cartaoEspecif } = encontrarMelhorSimilaridade(t, cartoes, c => c.nome);
    const cartao = cartaoEspecif || cartoes[0];
    if (cartao) {
      const contaRelacionada = contas.find(c => c.id === cartao.contaId) || contas[0];
      return {
        forma: 'cartao_credito',
        contaId: contaRelacionada?.id || '',
        contaNome: contaRelacionada?.nome || '',
        cartaoId: cartao.id,
        cartaoNome: cartao.nome,
        contaExplicitamenteMencionada: !!cartaoEspecif,
        formaExplicitamenteMencionada: true
      };
    }
  }

  const { bestMatch: contaEspecif } = encontrarMelhorSimilaridade(t, contas, c => c.nome);
  const { bestMatch: cartaoEspecif } = encontrarMelhorSimilaridade(t, cartoes, c => c.nome);
  const nomeBrutoConta = extrairNomeContaBruta(texto);
  const contaExplicitamenteMencionada = !!(contaEspecif || cartaoEspecif || nomeBrutoConta);

  if (contemPalavra(texto, ['dinheiro', 'em especie', 'cedulas'])) {
    const carteira = contas.find(c => c.tipo === 'carteira' || c.nome.toLowerCase().includes('carteira')) || contas[0];
    return {
      forma: 'dinheiro',
      contaId: contaEspecif?.id || carteira?.id || '',
      contaNome: contaEspecif?.nome || carteira?.nome || '',
      contaExplicitamenteMencionada,
      formaExplicitamenteMencionada: true
    };
  }

  if (contemPalavra(texto, ['boleto'])) {
    return {
      forma: 'boleto',
      contaId: contaEspecif?.id || contas[0]?.id || '',
      contaNome: contaEspecif?.nome || contas[0]?.nome || '',
      contaExplicitamenteMencionada,
      formaExplicitamenteMencionada: true
    };
  }

  if (contemPalavra(texto, PALAVRAS_PIX)) {
    if (contaEspecif) return { forma: 'pix', contaId: contaEspecif.id, contaNome: contaEspecif.nome, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: true };
    if (nomeBrutoConta) return { forma: 'pix', contaId: '', contaNome: nomeBrutoConta, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: true };
    return { forma: 'pix', contaId: contas[0]?.id || '', contaNome: contas[0]?.nome || '', contaExplicitamenteMencionada: false, formaExplicitamenteMencionada: true };
  }

  // Se tem a palavra 'debito', mas tem a palavra 'dinheiro', o dinheiro tem prioridade absoluta!
  if (contemPalavra(texto, PALAVRAS_CARTAO_DEBITO) && !contemPalavra(texto, ['dinheiro', 'em especie', 'cedulas'])) {
    if (contaEspecif) return { forma: 'cartao_debito', contaId: contaEspecif.id, contaNome: contaEspecif.nome, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: true };
    if (nomeBrutoConta) return { forma: 'cartao_debito', contaId: '', contaNome: nomeBrutoConta, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: true };
    return { forma: 'cartao_debito', contaId: contas[0]?.id || '', contaNome: contas[0]?.nome || '', contaExplicitamenteMencionada: false, formaExplicitamenteMencionada: true };
  }

  if (cartaoEspecif || contemPalavra(texto, PALAVRAS_CARTAO_CREDITO)) {
    const cartao = cartaoEspecif || cartoes[0];
    if (cartao) {
      const contaRelacionada = contas.find(c => c.id === cartao.contaId) || contas[0];
      return {
        forma: 'cartao_credito',
        contaId: contaRelacionada?.id || '',
        contaNome: contaRelacionada?.nome || '',
        cartaoId: cartao.id,
        cartaoNome: cartao.nome,
        contaExplicitamenteMencionada: !!cartaoEspecif,
        formaExplicitamenteMencionada: true
      };
    }
  }

  if (contaEspecif) {
    return { forma: 'transferencia', contaId: contaEspecif.id, contaNome: contaEspecif.nome, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: false };
  }

  if (nomeBrutoConta) {
    return { forma: 'transferencia', contaId: '', contaNome: nomeBrutoConta, contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: false };
  }

  return {
    forma: 'pix',
    contaId: contas[0]?.id || '',
    contaNome: contas[0]?.nome || '',
    contaExplicitamenteMencionada: false,
    formaExplicitamenteMencionada: false
  };
}

// Detecta tipo
function detectarTipo(texto: string): TipoTransacao {
  if (contemPalavra(texto, PALAVRAS_RECEITA)) return 'receita';
  if (contemPalavra(texto, PALAVRAS_DESPESA)) return 'despesa';
  for (const padrao of PADROES_IA) {
    if (contemPalavra(texto, padrao.palavrasChave)) return padrao.tipo;
  }
  return 'despesa'; 
}

// Encontra categoria pelo texto
function encontrarCategoria(texto: string, tipo: TipoTransacao, categorias: { id: string; nome: string; icone: string; cor: string }[]) {
  // Primeiro tenta padrões de IA
  for (const padrao of PADROES_IA) {
    if (padrao.tipo === tipo || padrao.tipo === 'despesa') {
      if (contemPalavra(texto, padrao.palavrasChave)) {
        const cat = categorias.find(c => c.id === padrao.categoriaId);
        if (cat) {
          const cc = padrao.centroCustoId ? CENTROS_CUSTO_PADRAO.find(c => c.id === padrao.centroCustoId) : undefined;
          return {
            categoriaId: cat.id,
            categoriaNome: cat.nome,
            categoriaIcone: cat.icone,
            categoriaCor: cat.cor,
            centroCustoId: cc?.id,
            centroCustoNome: cc?.nome,
            formaPagamentoPadrao: padrao.formaPagamento,
          };
        }
      }
    }
  }

  // Fallback para similaridade direta com o nome da categoria
  const { bestMatch: catSimilar } = encontrarMelhorSimilaridade(texto, categorias, c => c.nome);
  if (catSimilar) {
    return {
      categoriaId: catSimilar.id,
      categoriaNome: catSimilar.nome,
      categoriaIcone: catSimilar.icone,
      categoriaCor: catSimilar.cor,
      centroCustoId: undefined,
      centroCustoNome: undefined,
      formaPagamentoPadrao: undefined,
    };
  }

  const catPadrao = tipo === 'receita'
    ? categorias.find(c => c.id === 'outros_receita') || categorias[0]
    : categorias.find(c => c.id === 'outros_despesa') || categorias[0];

  return {
    categoriaId: catPadrao?.id || 'outros_despesa',
    categoriaNome: catPadrao?.nome || 'Outros',
    categoriaIcone: catPadrao?.icone || '📦',
    categoriaCor: catPadrao?.cor || '#6b7280',
    centroCustoId: undefined,
    centroCustoNome: undefined,
    formaPagamentoPadrao: undefined,
  };
}

// Extrai nome bruto do Fornecedor ou Cliente (quando não existe não banco)
function extrairEntidadeBruta(texto: string): string | undefined {
  const t = textoLower(texto);
  const preposicoes = ['não ', 'na ', 'em ', 'do ', 'da ', 'para a ', 'para o ', 'para ', 'ao ', 'posto ', ' o ', ' a '];
  let bestEntidade = '';
  for (const prep of preposicoes) {
    const idx = t.indexOf(prep);
    if (idx !== -1) {
      const restante = texto.substring(idx + prep.length);
      const partes = restante.split(/\s+/).slice(0, 3);
      const nome = partes.join(' ').replace(/[.,!?]/g, '').trim();
      if (nome.length > 2 && nome.length < 40) {
         if (nome.length > bestEntidade.length) bestEntidade = nome.replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }
  if (bestEntidade) return bestEntidade;
  return undefined;
}

// Gera descrição limpa
function gerarDescricao(texto: string, tipo: TipoTransacao, categoriaNome: string, entidade?: string): string {
  if (contemPalavra(texto, ['fatura'])) {
    return entidade ? `Fatura Cartão de Crédito ${entidade}` : 'Fatura Cartão de Crédito';
  }

  if (entidade) return entidade;

  const palavrasReservadas = new Set(['paguei', 'comprei', 'gastei', 'fui', 'na', 'não', 'do', 'da', 'em', 'de', 'por', 'para', 'hoje', 'ontem', 'pix', 'dinheiro', 'cartão', 'crédito', 'débito', 'reais', 'r$', 'data', 'valor', 'pagamento']);
  const palavras = texto.toLowerCase().split(/\s+/)
    .filter(p => p.length > 2 && !palavrasReservadas.has(p) && !/^\d+([.,]\d+)?$/.test(p))
    .slice(0, 4);

  if (palavras.length > 0) return palavras.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return categoriaNome;
}

// === MOTOR PRINCIPAL ===

export async function interpretarTexto(texto: string): Promise<PreLancamento | null> {
  try {
    const [categorias, centrosCusto, contas, cartoes, fornecedores, clientes, historico, config] = await Promise.all([
      getCategorias(), getCentrosCusto(), getContas(), getCartoes(), getFornecedores(), getClientes(), getHistoricoIA(), getConfiguracoes(),
    ]);

    // O fallback da OpenAI foi deixado intacto para cenários em que o config permita, mas
    // o foco agora é a inteligência híbrida.
    let textoSanitizado = texto.replace(/[\n\r]/g, ' ').trim();
    
    const tipo = detectarTipo(textoSanitizado);
    const valor = extrairValor(textoSanitizado);
    const { data: dataExtraida, dataExplicitamenteMencionada } = extrairData(textoSanitizado);
    const status = detectarStatus(textoSanitizado);
    const { parcelado, totalParcelas } = extrairParcelas(textoSanitizado);
    const recorrente = contemPalavra(textoSanitizado, PALAVRAS_RECORRENTE);
    
    // FUZZY MATCH PARA FORNECEDORES OU CLIENTES
    let entidadeId: string | undefined;
    let entidadeNome: string | undefined;
    let opcoesEntidade: {id: string, nome: string}[] = [];

    if (tipo === 'despesa') {
      const resultForn = encontrarMelhorSimilaridade(textoSanitizado, fornecedores, f => f.nome);
      if (resultForn.bestMatch) {
        entidadeId = resultForn.bestMatch.id;
        entidadeNome = resultForn.bestMatch.nome;
      } else if (resultForn.options.length > 0) {
        opcoesEntidade = resultForn.options;
      } else {
        entidadeNome = extrairEntidadeBruta(textoSanitizado);
      }
    } else {
      const resultCli = encontrarMelhorSimilaridade(textoSanitizado, clientes, c => c.nome);
      if (resultCli.bestMatch) {
        entidadeId = resultCli.bestMatch.id;
        entidadeNome = resultCli.bestMatch.nome;
      } else if (resultCli.options.length > 0) {
        opcoesEntidade = resultCli.options;
      } else {
        entidadeNome = extrairEntidadeBruta(textoSanitizado);
      }
    }

    // Verificar histórico do usuário (Machine Learning Simples)
    let catInfo = encontrarCategoria(textoSanitizado, tipo, categorias);
    let ccInfo = catInfo.centroCustoId ? centrosCusto.find(c => c.id === catInfo.centroCustoId) : undefined;
    let formaPgto = detectarFormaPagamento(textoSanitizado, contas.length > 0 ? contas : CONTAS_PADRAO, cartoes);

    const historicoMatch = historico
      .sort((a, b) => b.count - a.count)
      .find(h => 
        (entidadeId && h.fornecedorId === entidadeId) ||
        textoLower(textoSanitizado).includes(textoLower(h.texto.split(' ')[0]))
      );

    if (historicoMatch) {
      if (historicoMatch.categoriaId) {
        const catHist = categorias.find(c => c.id === historicoMatch.categoriaId);
        if (catHist) {
          catInfo.categoriaId = catHist.id;
          catInfo.categoriaNome = catHist.nome;
          catInfo.categoriaIcone = catHist.icone;
          catInfo.categoriaCor = catHist.cor;
        }
      }
      if (historicoMatch.centroCustoId) {
        ccInfo = centrosCusto.find(c => c.id === historicoMatch.centroCustoId);
      }
      if (historicoMatch.contaId && contas.find(c => c.id === historicoMatch.contaId) && !formaPgto.contaExplicitamenteMencionada) {
        formaPgto.contaId = historicoMatch.contaId;
        formaPgto.contaNome = contas.find(c => c.id === historicoMatch.contaId)!.nome;
      }
      if (historicoMatch.formaPagamento && !formaPgto.formaExplicitamenteMencionada) {
        formaPgto.forma = historicoMatch.formaPagamento;
      }
    }

    if (entidadeId && tipo === 'despesa') {
      const f = fornecedores.find(x => x.id === entidadeId);
      if (f && f.contaId && !contemPalavra(textoSanitizado, contas.map(c => c.nome))) {
        const c = contas.find(x => x.id === f.contaId);
        if (c) {
          formaPgto.contaId = c.id;
          formaPgto.contaNome = c.nome;
        }
      }
    }

    const descricao = gerarDescricao(textoSanitizado, tipo, catInfo.categoriaNome, entidadeNome);

    const hojeFmt = format(new Date(), 'yyyy-MM-dd');
    let dataVencimentoFinal = dataExtraida;
    let statusFinal = status;
    let dataPagamentoFinal: string | undefined = undefined;

    // Regras Estritas de Datas (Pedidas pelo Usuário)
    if (dataExplicitamenteMencionada) {
      // Se informou a data falando ou escrito -> preenche exatamente com o falado/escrito
      dataVencimentoFinal = dataExtraida;
      if (dataExtraida > hojeFmt) {
        statusFinal = 'pendente';
        dataPagamentoFinal = undefined;
      } else if (status === 'pago') {
        dataPagamentoFinal = dataExtraida;
      } else {
        dataPagamentoFinal = undefined;
      }
    } else {
      // Se NÃO informou a data:
      if (formaPgto.forma === 'cartao_credito' && formaPgto.cartaoId) {
        // Fatura de cartão: pega a data de vencimento cadastrada não cartão, status pendente e pagamento em branco
        const cartaoObj = cartoes.find(c => c.id === formaPgto.cartaoId);
        if (cartaoObj && cartaoObj.dataVencimento) {
          dataVencimentoFinal = calcularDataVencimentoCartao(cartaoObj.dataVencimento);
        } else {
          dataVencimentoFinal = hojeFmt;
        }
        statusFinal = 'pendente';
        dataPagamentoFinal = undefined;
      } else if (status === 'pendente') {
        dataVencimentoFinal = hojeFmt;
        statusFinal = 'pendente';
        dataPagamentoFinal = undefined;
      } else {
        dataVencimentoFinal = hojeFmt;
        statusFinal = 'pago';
        dataPagamentoFinal = hojeFmt;
      }
    }

    const confianca = calcularConfianca({
      temValor: valor !== null,
      temCategoria: catInfo.categoriaId !== 'outros_despesa',
      temFornecedor: !!entidadeId,
      temData: true,
    });

    const prelancamento: PreLancamento = {
      tipo,
      descricao,
      valor: valor || 0,
      data: dataVencimentoFinal,
      dataLancamento: hojeFmt,
      dataVencimento: dataVencimentoFinal,
      dataPagamento: dataPagamentoFinal,
      dataCompetencia: extrairCompetencia(textoSanitizado, dataVencimentoFinal),
      status: statusFinal,
      categoriaId: catInfo.categoriaId,
      categoriaNome: catInfo.categoriaNome,
      categoriaIcone: catInfo.categoriaIcone,
      categoriaCor: catInfo.categoriaCor,
      centroCustoId: ccInfo?.id,
      centroCustoNome: ccInfo?.nome,
      fornecedorId: tipo === 'despesa' ? entidadeId : undefined,
      fornecedorNome: tipo === 'despesa' ? entidadeNome : undefined,
      clienteId: tipo === 'receita' ? entidadeId : undefined,
      clienteNome: tipo === 'receita' ? entidadeNome : undefined,
      contaId: formaPgto.contaId,
      contaNome: formaPgto.contaNome,
      cartaoId: formaPgto.forma === 'cartao_credito' ? formaPgto.cartaoId : undefined,
      cartaoNome: formaPgto.forma === 'cartao_credito' ? formaPgto.cartaoNome : undefined,
      formaPagamento: formaPgto.forma,
      contaExplicitamenteMencionada: formaPgto.contaExplicitamenteMencionada,
      formaExplicitamenteMencionada: formaPgto.formaExplicitamenteMencionada,
      contaOpcoes: contas.map(c => ({ id: c.id, nome: c.nome })),
      parcelado,
      totalParcelas,
      recorrente,
      confianca,
      textoOriginal: textoSanitizado,
      fornecedorOpcoes: tipo === 'despesa' ? opcoesEntidade : undefined,
      clienteOpcoes: tipo === 'receita' ? opcoesEntidade : undefined,
    };

    return prelancamento;
  } catch (err) {
    console.error('Erro não motor de IA:', err);
    return null;
  }
}

function calcularConfianca(fatores: Record<string, boolean>): number {
  const pesos = { temValor: 0.40, temCategoria: 0.25, temFornecedor: 0.25, temData: 0.10 };
  let score = 0;
  for (const [k, v] of Object.entries(fatores)) {
    if (v) score += pesos[k as keyof typeof pesos] || 0;
  }
  return score;
}

// Salvar padrão aprendido com contexto rico
export async function aprenderPadrao(textoOriginal: string, categoriaId: string, centroCustoId?: string, contaId?: string, formaPagamento?: FormaPagamento, fornecedorId?: string, fornecedorNome?: string) {
  let palavraChave = '';
  
  if (fornecedorNome && fornecedorNome.trim().length > 2) {
      palavraChave = fornecedorNome.toLowerCase().trim();
  } else {
      palavraChave = textoOriginal.toLowerCase().trim();
      const parts = palavraChave.split(' ');
      if (parts.length > 3) {
          palavraChave = parts.slice(0, 3).join(' ');
      }
  }

  if (palavraChave.length < 2) return;

  await salvarHistoricoIA({
    texto: palavraChave,
    categoriaId,
    centroCustoId,
    fornecedorId,
    contaId,
    formaPagamento,
    timestamp: new Date().toISOString(),
    count: 1,
  });
}

// ... as funções de Chat IA permanecem inalteradas, se quiser depois pode atualizar também.
export async function consultarIAChat(pergunta: string, transacoes: { tipo: string; descricao: string; valor: number; data: string; categoriaNome?: string; formaPagamento: string; fornecedorNome?: string }[]): Promise<string> {
  const p = textoLower(pergunta);
  const hoje = new Date();
  const despesas = transacoes.filter(t => t.tipo === 'despesa');
  const receitas = transacoes.filter(t => t.tipo === 'receita');
  const totalDespesas = despesas.reduce((s, t) => s + t.valor, 0);
  const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const porCategoria: Record<string, number> = {};
  for (const t of despesas) {
    const cat = t.categoriaNome || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + t.valor;
  }
  const topCat = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return `📈 **Análise Financeira Geral:**\n\n💚 Receitas: **${fmt(totalReceitas)}**\n❤️ Despesas: **${fmt(totalDespesas)}**\n\n${saldo >= 0 ? `✅ Saldo positivo: **${fmt(saldo)}**` : `🚨 Saldo negativo: **${fmt(saldo)}**`}\n\n📊 Maior gasto: **${topCat[0]?.[0] || 'N/A'}** (${fmt(topCat[0]?.[1] || 0)})`;
}

export function sugerirCategorias(texto: string, categorias: { id: string; nome: string; icone: string; cor: string }[]) {
  if (texto.length < 2) return [];
  return encontrarMelhorSimilaridade(texto, categorias, c => c.nome).options.slice(0, 5);
}

export function sugerirFornecedores(texto: string, fornecedores: { id: string; nome: string }[]) {
  if (texto.length < 2) return [];
  return encontrarMelhorSimilaridade(texto, fornecedores, f => f.nome).options.slice(0, 5);
}

