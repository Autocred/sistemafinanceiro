// Dados padrão do sistema: categorias, centros de custo e padrões de IA

import { Categoria, CentroCusto, Conta, Cartao, PadraoCategoriaIA } from './types';

export const CATEGORIAS_PADRAO: Categoria[] = [
  // Despesas (TODAS EM TONS DE VERMELHO BANCÁRIO / ESCURO / WINE)
  { id: 'alimentacao', nome: 'Alimentação', icone: 'Utensils', cor: '#dc2626', tipo: 'despesa', subcategorias: ['Restaurante', 'Delivery', 'Lanchonete', 'Padaria', 'Cafeteria'] },
  { id: 'mercado', nome: 'Mercado', icone: 'ShoppingCart', cor: '#cc0000', tipo: 'despesa', subcategorias: ['Supermercado', 'Hortifruti', 'Açougue', 'Peixaria'] },
  { id: 'transporte', nome: 'Transporte', icone: 'Bus', cor: '#b91c1c', tipo: 'despesa', subcategorias: ['Ônibus', 'Metrô', 'Uber', '99', 'Taxi', 'Aplicativo'] },
  { id: 'combustivel', nome: 'Combustível', icone: 'Fuel', cor: '#8b0000', tipo: 'despesa', subcategorias: ['Gasolina', 'Etanãol', 'Diesel', 'GNV'] },
  { id: 'saude', nome: 'Saúde', icone: 'Pill', cor: '#ef4444', tipo: 'despesa', subcategorias: ['Farmácia', 'Médico', 'Exame', 'Hospital', 'Dentista', 'Psicólogo'] },
  { id: 'educacao', nome: 'Educação', icone: 'Book', cor: '#991b1b', tipo: 'despesa', subcategorias: ['Mensalidade', 'Curso', 'Livro', 'Material'] },
  { id: 'lazer', nome: 'Lazer', icone: 'Gamepad2', cor: '#be123c', tipo: 'despesa', subcategorias: ['Cinema', 'Show', 'Viagem', 'Streaming', 'Jogo'] },
  { id: 'moradia', nome: 'Moradia', icone: 'Home', cor: '#9f1239', tipo: 'despesa', subcategorias: ['Aluguel', 'Condomínio', 'IPTU', 'Água', 'Luz', 'Gás', 'Internet', 'Telefone'] },
  { id: 'vestuario', nome: 'Vestuário', icone: 'Shirt', cor: '#881337', tipo: 'despesa', subcategorias: ['Roupas', 'Calçados', 'Acessórios'] },
  { id: 'beleza', nome: 'Beleza & Cuidados', icone: 'Scissors', cor: '#e11d48', tipo: 'despesa', subcategorias: ['Salão', 'Barbearia', 'Perfume', 'Cosméticos'] },
  { id: 'pets', nome: 'Pets', icone: 'Dog', cor: '#c2410c', tipo: 'despesa', subcategorias: ['Ração', 'Veterinário', 'Banho e Tosa', 'Pet Shop'] },
  { id: 'assinaturas', nome: 'Assinaturas', icone: 'Smartphone', cor: '#9a3412', tipo: 'despesa', subcategorias: ['Streaming', 'Software', 'Academia', 'Clube'] },
  { id: 'financeiro', nome: 'Financeiro', icone: 'CreditCard', cor: '#7f1d1d', tipo: 'despesa', subcategorias: ['Parcela', 'Financiamento', 'Empréstimo', 'Juros', 'Tarifa'] },
  { id: 'impostos', nome: 'Impostos & Taxas', icone: 'FileText', cor: '#7f1d1d', tipo: 'despesa', subcategorias: ['IPVA', 'IPTU', 'IR', 'Multa'] },
  { id: 'seguros', nome: 'Seguros', icone: 'Shield', cor: '#991b1b', tipo: 'despesa', subcategorias: ['Auto', 'Vida', 'Saúde', 'Residencial'] },
  { id: 'viagem', nome: 'Viagem', icone: 'Plane', cor: '#b91c1c', tipo: 'despesa', subcategorias: ['Passagem', 'Hotel', 'Hospedagem', 'Passeio'] },
  { id: 'presente', nome: 'Presentes', icone: 'Gift', cor: '#be123c', tipo: 'despesa' },
  { id: 'servicos', nome: 'Serviços', icone: 'Wrench', cor: '#881337', tipo: 'despesa', subcategorias: ['Limpeza', 'Manutenção', 'Conserto', 'Frete'] },
  { id: 'outros_despesa', nome: 'Outros', icone: 'Package', cor: '#cc0000', tipo: 'despesa' },
  // Receitas
  { id: 'salario', nome: 'Salário', icone: 'Briefcase', cor: '#10b981', tipo: 'receita' },
  { id: 'freelance', nome: 'Freelance', icone: 'Laptop', cor: '#6366f1', tipo: 'receita' },
  { id: 'bonus', nome: 'Bônus & Comissão', icone: 'Trophy', cor: '#f59e0b', tipo: 'receita' },
  { id: 'investimentos_rec', nome: 'Investimentos', icone: 'LineChart', cor: '#22c55e', tipo: 'receita', subcategorias: ['Dividendos', 'Rendimentos', 'CDB', 'FII'] },
  { id: 'aluguel_rec', nome: 'Aluguel Recebido', icone: 'Building', cor: '#06b6d4', tipo: 'receita' },
  { id: 'vendas', nome: 'Vendas', icone: 'ShoppingBag', cor: '#f97316', tipo: 'receita' },
  { id: 'reembolso', nome: 'Reembolso', icone: 'Repeat', cor: '#84cc16', tipo: 'receita' },
  { id: 'outros_receita', nome: 'Outras Receitas', icone: 'Coins', cor: '#a78bfa', tipo: 'receita' },
];

export const CENTROS_CUSTO_PADRAO: CentroCusto[] = [
  { id: 'pessoal', nome: 'Pessoal', icone: 'User', cor: '#6366f1' },
  { id: 'veiculo', nome: 'Veículo', icone: 'Car', cor: '#f59e0b' },
  { id: 'residencia', nome: 'Residência', icone: 'Home', cor: '#06b6d4' },
  { id: 'trabalho', nome: 'Trabalho', icone: 'Briefcase', cor: '#10b981' },
  { id: 'filhos', nome: 'Filhos', icone: 'Baby', cor: '#ec4899' },
  { id: 'saude_cc', nome: 'Saúde', icone: 'Pill', cor: '#ef4444' },
  { id: 'educacao_cc', nome: 'Educação', icone: 'Book', cor: '#8b5cf6' },
  { id: 'lazer_cc', nome: 'Lazer & Entretenimento', icone: 'Drama', cor: '#f97316' },
  { id: 'investimentos_cc', nome: 'Investimentos', icone: 'LineChart', cor: '#22c55e' },
  { id: 'pets_cc', nome: 'Pets', icone: 'Dog', cor: '#fb923c' },
  { id: 'negocio', nome: 'Negócio', icone: 'Building2', cor: '#64748b' },
];

export const CONTAS_PADRAO: Conta[] = [
  { id: 'nubank', nome: 'Nubank', tipo: 'corrente', saldo: 0, cor: '#820ad1', icone: 'Landmark', banco: 'Nubank', ativo: true },
  { id: 'itau', nome: 'Itaú', tipo: 'corrente', saldo: 0, cor: '#ff6b00', icone: 'Landmark', banco: 'Itaú', ativo: true },
  { id: 'carteira', nome: 'Carteira', tipo: 'carteira', saldo: 0, cor: '#10b981', icone: 'Wallet', ativo: true },
  { id: 'poupanca', nome: 'Poupança BB', tipo: 'poupanca', saldo: 0, cor: '#fbbf24', icone: 'PiggyBank', banco: 'Banco do Brasil', ativo: true },
  { id: 'investimentos', nome: 'Investimentos', tipo: 'investimento', saldo: 0, cor: '#22c55e', icone: 'TrendingUp', ativo: true },
  { id: 'mercadopago', nome: 'Mercado Pago', tipo: 'corrente', saldo: 0, cor: '#00bcff', icone: 'HandCoins', banco: 'Mercado Pago', ativo: true },
];

export const CARTOES_PADRAO: Cartao[] = [
  { id: 'nubank_cartao', nome: 'Nubank', bandeira: 'Mastercard', limite: 8000, limiteDisponivel: 8000, melhorDia: 11, dataFechamento: 18, dataVencimento: 25, cor: '#820ad1', contaId: 'nubank', ativo: true },
  { id: 'itau_visa', nome: 'Itaú Visa', bandeira: 'Visa', limite: 12000, limiteDisponivel: 12000, melhorDia: 20, dataFechamento: 27, dataVencimento: 5, cor: '#ff6b00', contaId: 'itau', ativo: true },
  { id: 'mercadopago_cartao', nome: 'Mercado Pago', bandeira: 'Visa', limite: 5000, limiteDisponivel: 5000, melhorDia: 25, dataFechamento: 1, dataVencimento: 10, cor: '#00bcff', contaId: 'mercadopago', ativo: true },
];

export const PADROES_IA: PadraoCategoriaIA[] = [
  // Combustível
  { palavrasChave: ['gasolina', 'etanãol', 'combustível', 'posto', 'shell', 'ipiranga', 'br distribuidora', 'petrobras', 'raizen', 'abastec'], categoriaId: 'combustivel', centroCustoId: 'veiculo', tipo: 'despesa' },
  // Mercado
  { palavrasChave: ['mercado', 'supermercado', 'extra', 'carrefour', 'pão de açúcar', 'assai', 'atacadão', 'hortifruti', 'feira', 'compras'], categoriaId: 'mercado', centroCustoId: 'residencia', tipo: 'despesa' },
  // Alimentação
  { palavrasChave: ['restaurante', 'lanche', 'pizza', 'burger', 'mc donalds', 'mcdonalds', 'bk', 'burger king', 'subway', 'ifood', 'rappi', 'delivery', 'comida', 'almoço', 'jantar', 'café', 'padaria', 'lanchonete'], categoriaId: 'alimentacao', centroCustoId: 'pessoal', tipo: 'despesa' },
  // Saúde
  { palavrasChave: ['farmácia', 'drogaria', 'remédio', 'medicamento', 'droga', 'ultrafarma', 'panvel', 'raia', 'drogasil', 'médico', 'consulta', 'exame', 'hospital', 'clínica', 'dentista', 'psicólogo'], categoriaId: 'saude', centroCustoId: 'saude_cc', tipo: 'despesa' },
  // Transporte
  { palavrasChave: ['uber', '99', 'táxi', 'taxi', 'ônibus', 'metrô', 'trem', 'passagem', 'transporte', 'bicicleta', 'moto'], categoriaId: 'transporte', centroCustoId: 'pessoal', tipo: 'despesa', formaPagamento: 'pix' },
  // Internet/Telefone
  { palavrasChave: ['internet', 'claro', 'vivo', 'tim', 'oi', 'nextel', 'telefone', 'celular', 'planão', 'streaming', 'wi-fi', 'wifi'], categoriaId: 'moradia', centroCustoId: 'residencia', tipo: 'despesa', formaPagamento: 'pix' },
  // Aluguel/Moradia
  { palavrasChave: ['aluguel', 'condomínio', 'condominio', 'iptu', 'água', 'luz', 'energia', 'gás', 'gas', 'cond'], categoriaId: 'moradia', centroCustoId: 'residencia', tipo: 'despesa' },
  // Educação
  { palavrasChave: ['mensalidade', 'escola', 'faculdade', 'universidade', 'curso', 'aula', 'livro', 'material escolar', 'inglês', 'idioma'], categoriaId: 'educacao', centroCustoId: 'educacao_cc', tipo: 'despesa' },
  // Lazer
  { palavrasChave: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'cinema', 'teatro', 'show', 'festa', 'balada', 'bar', 'jogo', 'game', 'steam'], categoriaId: 'lazer', centroCustoId: 'lazer_cc', tipo: 'despesa' },
  // Vestuário
  { palavrasChave: ['roupa', 'calçado', 'sapato', 'tênis', 'camisa', 'calça', 'vestido', 'zara', 'renner', 'riachuelo', 'c&a', 'cea', 'hering'], categoriaId: 'vestuario', centroCustoId: 'pessoal', tipo: 'despesa' },
  // Pets
  { palavrasChave: ['ração', 'pet', 'veterinário', 'veterinario', 'banho tosa', 'petshop', 'pet shop', 'cachorro', 'gato', 'animal'], categoriaId: 'pets', centroCustoId: 'pets_cc', tipo: 'despesa' },
  // Academia/Saúde
  { palavrasChave: ['academia', 'smart fit', 'smartfit', 'bodytech', 'gym', 'crossfit', 'pilates', 'yoga'], categoriaId: 'saude', centroCustoId: 'saude_cc', tipo: 'despesa' },
  // Seguros
  { palavrasChave: ['seguro', 'porto seguro', 'bradesco seguro', 'sulamerica', 'tokio', 'mapfre'], categoriaId: 'seguros', centroCustoId: 'veiculo', tipo: 'despesa' },
  // Beleza
  { palavrasChave: ['salão', 'salao', 'cabelo', 'barbearia', 'manicure', 'estética', 'estetica', 'perfume', 'cosmético', 'cosmetico', 'boticário', 'natura'], categoriaId: 'beleza', centroCustoId: 'pessoal', tipo: 'despesa' },
  // Receitas
  { palavrasChave: ['salário', 'salario', 'pagamento', 'holerite'], categoriaId: 'salario', centroCustoId: 'trabalho', tipo: 'receita' },
  { palavrasChave: ['freelance', 'projeto', 'serviço prestado', 'honãorário'], categoriaId: 'freelance', centroCustoId: 'trabalho', tipo: 'receita' },
  { palavrasChave: ['comissão', 'comissao', 'bônus', 'bonus', 'premiação', 'premiacao'], categoriaId: 'bonus', centroCustoId: 'trabalho', tipo: 'receita' },
  { palavrasChave: ['dividendo', 'rendimento', 'cdb', 'fii', 'ação', 'acao', 'tesouro'], categoriaId: 'investimentos_rec', centroCustoId: 'investimentos_cc', tipo: 'receita' },
  { palavrasChave: ['venda', 'vendi', 'recebi'], categoriaId: 'vendas', tipo: 'receita' },
];

export const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  cheque: 'Cheque',
  outro: 'Outro',
};

export const STATUS_LABELS: Record<string, Record<string, string>> = {
  despesa: {
    pago: '✅ Pago',
    pendente: '⏳ A Pagar',
    atrasado: '🔴 Atrasado',
    agendado: '📅 Agendado',
  },
  receita: {
    pago: '✅ Recebida',
    pendente: '⏳ A Receber',
    atrasado: '🔴 Atrasada',
    agendado: '📅 Agendada',
  },
};

export const FREQUENCIA_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
};

export const CORES_BANCOS: Record<string, string> = {
  nubank: '#820ad1',
  'banco do brasil': '#fbbf24',
  bb: '#fbbf24',
  'mercado pago': '#1a1a1a',
  mercadopago: '#1a1a1a',
  inter: '#ff6b00',
  itau: '#ff6b00',
  itaú: '#ff6b00',
  bradesco: '#cc092f',
  santander: '#ec0000',
  c6: '#f59e0b',
  'c6 bank': '#f59e0b',
  picpay: '#21c25e',
  caixa: '#005ca9',
  'caixa economica': '#005ca9',
  sicoob: '#06b6d4',
  sicredi: '#33a02c',
  next: '#00e364',
  neon: '#032eff',
  original: '#00a651',
  pan: '#00adef',
  will: '#e91e76',
  pagbank: '#00a868',
  pagseguro: '#00a868',
  stone: '#00a868',
  xp: '#eab308',
  rico: '#ff5100',
  binance: '#f0b90b',
};

export function getCorBanco(nome: string): string | undefined {
  const normalizado = nome.toLowerCase().trim();
  for (const [key, cor] of Object.entries(CORES_BANCOS)) {
    if (normalizado.includes(key)) return cor;
  }
  return undefined;
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Palavras que indicam tipo de transação
export const PALAVRAS_DESPESA = ['paguei', 'comprei', 'gastei', 'fui', 'passei', 'abasteci', 'assinei', 'renãovei', 'parcela', 'mensalidade', 'conta', 'boleto', 'pagamento', 'despesa', 'débito'];
export const PALAVRAS_RECEITA = ['recebi', 'ganhei', 'entrou', 'salário', 'salario', 'comissão', 'bônus', 'vendi', 'rendimento', 'dividendo', 'reembolso', 'devolveram'];
export const PALAVRAS_PIX = ['pix', 'chave pix'];
export const PALAVRAS_DINHEIRO = ['dinheiro', 'espécie', 'especie', 'cash'];
export const PALAVRAS_CARTAO_CREDITO = ['crédito', 'credito', 'cartão de crédito', 'cartao', 'cartão'];
export const PALAVRAS_CARTAO_DEBITO = ['débito', 'debito', 'cartão de débito'];
export const PALAVRAS_PARCELADO = ['parcelas', 'parcelei', 'parcelado', 'parcelamento', 'vezes'];
export const PALAVRAS_RECORRENTE = ['todo mês', 'mensalmente', 'mensal', 'todo dia', 'todo anão', 'anual', 'semanal', 'toda semana'];

// Detectores de data
export const PALAVRAS_HOJE = ['hoje', 'agora', 'neste momento'];
export const PALAVRAS_ONTEM = ['ontem'];
export const PALAVRAS_SEMANA_PASSADA = ['semana passada', 'última semana'];
