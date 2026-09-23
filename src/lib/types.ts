// Tipos de dados do sistema financeiro

export type TipoTransacao = 'despesa' | 'receita' | 'transferencia';
export type StatusTransacao = 'pago' | 'pendente' | 'atrasado' | 'agendado';
export type FrequenciaRecorrencia = 'semanal' | 'mensal' | 'trimestral' | 'anual';
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto' | 'cheque' | 'outro' | string;

export interface FormaPagamentoCustom {
  id: string;
  nome: string;
  icone?: string;
}
export type TipoConta = 'corrente' | 'poupanca' | 'carteira' | 'investimento' | 'caixa' | 'pix' | 'outro';

export interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo: TipoTransacao | 'ambos';
  subcategorias?: string[];
}

export interface CentroCusto {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  descricao?: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  categoriaId?: string;
  centroCustoId?: string;
  contaId?: string;
  formaPagamento?: FormaPagamento;
  telefone?: string;
  email?: string;
  totalGasto?: number;
  ultimaCompra?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  totalRecebido?: number;
  ultimaVenda?: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldo: number;
  cor: string;
  icone: string;
  banco?: string;
  agencia?: string;
  numero?: string;
  ativo: boolean;
}

export interface Cartao {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  limiteDisponivel: number;
  melhorDia: number;
  dataFechamento: number;
  dataVencimento: number;
  cor: string;
  contaId?: string;
  ativo: boolean;
}

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  valor: number;
  multa?: number;
  juros?: number;
  desconto?: number;
  comportamento?: 'fixa' | 'variavel';
  data: string; // Maintain backward compatibility
  dataLancamento?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  dataCompetencia: string;
  status: StatusTransacao;
  categoriaId: string;
  categoriaNome?: string;
  categoriaIcone?: string;
  categoriaCor?: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  clienteId?: string;
  clienteNome?: string;
  contaId: string;
  contaNome?: string;
  contaDestinãoId?: string;
  contaDestinãoNome?: string;
  cartaoId?: string;
  cartaoNome?: string;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  recorrente?: boolean;
  frequenciaRecorrencia?: FrequenciaRecorrencia;
  quantidadeRecorrencias?: number;
  grupoRecorrencia?: string;
  faturaId?: string;
  parcelado?: boolean;
  totalParcelas?: number;
  parcelaAtual?: number;
  grupoParcelamento?: string;
  movementIds?: string[]; // IDs das movimentações geradas por essa transação
  conciliado?: boolean; // Se a transação foi reconciliada com o extrato bancário
  comprovanteBase64?: string;
  anexos?: {nome: string; url: string}[]; // Anexo do comprovante ou NF em base64
  comprovanteUrl?: string; // Phase 4 Cloud Storage
  rateio?: { id: string; categoriaId: string; categoriaNome: string; categoriaIcone: string; categoriaCor: string; centroCustoId?: string; centroCustoNome?: string; valor: number }[]; // Phase 3 Split
  criadoEm: string;
  atualizadoEm: string;
}

export interface FinancialMovement {
  id: string; // movementId
  launchId: string; // id da transacao original
  installmentNumber?: number; // numero da parcela
  tipo: TipoTransacao;
  valor: number;
  contaOrigemId?: string;
  contaDestinãoId?: string;
  usuarioId?: string;
  createdAt: string;
  status: 'efetivado' | 'estornado';
  operation: 'baixa' | 'estornão' | 'saldo_inicial';
  origin: 'manual' | 'ia' | 'importacao' | 'recorrente';
}

export interface Meta {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  valorAtual: number;
  prazo: string;
  cor: string;
  icone: string;
  ativo: boolean;
}

export interface Orcamento {
  id: string;
  categoriaId: string;
  categoriaNome?: string;
  valor: number;
  periodo: 'mensal' | 'anual';
  mes?: number;
  anão: number;
  valorGasto?: number;
}

export interface PadraoCategoriaIA {
  palavrasChave: string[];
  categoriaId: string;
  centroCustoId?: string;
  tipo: TipoTransacao;
  formaPagamento?: FormaPagamento;
}

export interface HistoricoIA {
  texto: string;
  categoriaId: string;
  centroCustoId?: string;
  fornecedorId?: string;
  contaId?: string;
  formaPagamento?: FormaPagamento;
  timestamp: string;
  count: number;
}

export interface PreLancamento {
  id?: string;
  tipo: TipoTransacao;
  descricao: string;
  valor: number;
    multa?: number;
    juros?: number;
  desconto?: number;
  data: string; // Maintain backward compatibility
  dataLancamento?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  dataCompetencia: string;
  status: StatusTransacao;
  categoriaId: string;
  categoriaNome: string;
  categoriaIcone: string;
  categoriaCor: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  clienteId?: string;
  clienteNome?: string;
  contaId: string;
  contaNome: string;
  contaDestinãoId?: string;
  contaDestinãoNome?: string;
  cartaoId?: string;
  cartaoNome?: string;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  parcelado?: boolean;
  totalParcelas?: number;
  recorrente?: boolean;
  frequenciaRecorrencia?: FrequenciaRecorrencia;
  quantidadeRecorrencias?: number;
  conciliado?: boolean;
  comprovanteBase64?: string;
    anexos?: {nome: string; url: string}[];
  rateio?: { id: string; categoriaId: string; categoriaNome: string; categoriaIcone: string; categoriaCor: string; centroCustoId?: string; centroCustoNome?: string; valor: number }[];
  confianca: number; // 0-1
  textoOriginal: string;
  fornecedorOpcoes?: {id: string, nome: string}[];
  clienteOpcoes?: {id: string, nome: string}[];
  categoriaOpcoes?: {id: string, nome: string, icone: string, cor: string}[];
  contaExplicitamenteMencionada?: boolean;
  formaExplicitamenteMencionada?: boolean;
  contaOpcoes?: {id: string, nome: string}[];
}

export interface AlertaFinanceiro {
  id: string;
  tipo: 'vencimento' | 'limite' | 'meta' | 'orcamento' | 'saldo' | 'atrasado';
  titulo: string;
  descricao: string;
  urgente: boolean;
  data: string;
  lido: boolean;
}

export interface NotificacaoApp {
  id: string;
  tipo: 'vencimento' | 'atraso' | 'sistema' | 'insight';
  titulo: string;
  mensagem: string;
  data: string;
  hora: string;
  valor?: number;
  fornecedor?: string;
  categoria?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  lida: boolean;
  transacaoId?: string;
  criadoEm: string;
}

export interface ConfiguracaoApp {
  nomeUsuario: string;
  moeda: string;
  tema: 'dark' | 'light' | 'auto';
  mostrarAnimacoes?: boolean;
  reduzirAnimacoes?: boolean;
  altoContraste?: boolean;
  compactarInterface?: boolean;
  mostrarSombras?: boolean;
  transparencias?: boolean;
  bordasArredondadas?: boolean;
  openaiApiKey?: string;
  geminiApiKey?: string;
  provedorIA: 'openai' | 'gemini' | 'offline';
  notificacoesAtivas: boolean;
  backupAutomatico: boolean;
  frequenciaBackup?: 'diario' | 'semanal' | 'mensal' | 'nunca';
  horarioBackup?: string; // Formato HH:MM
  nomeSistema?: string;
  fotoPerfil?: string;
  exigirSenha?: boolean;
  // White Label Colors
  corPrimaria?: string;
  corSecundaria?: string;
  corAcento?: string;
  corFundo?: string;
  paletaAtiva?: string;
  loginUsuario?: string;
  senha?: string;
  id?: string;
  tempoInatividade?: number; // em minutos (0 = desativado)
  lembretesAtivos?: boolean;
  lembretesPopup?: boolean;
  lembretesPopupAoIniciar?: boolean;
  lembretesPopupHorarios?: string[]; // ["09:00", "15:00"]
  lembretesSinao?: boolean;
  whatsappAtivo?: boolean;
  whatsappNumeros?: string; // separados por vírgula
  whatsappHorario?: string;
  webPushSubscription?: string;
  pushDias?: string[];
  pushHorario?: string; // ex: '09:00'
  diasAntecedencia?: number[]; // ex: [1, 2, 3]
  
  // WhatsApp Bot de Lançamentos
  whatsappBotAtivo?: boolean;
  whatsappBotTelefone?: string; // Telefone que pode criar lançamentos
  whatsappBotToken?: string; // Token de segurança para o Webhook

  // Controle de Acesso (RBAC)
  cargosPersonalizados?: { id: string; nome: string; permissoes: Record<string, boolean> }[];
  permissoesPorCargo?: Record<string, string[]>;

  // Novas Funcionalidades
  openFinanceAtivo?: boolean;
  relatoriosEmail?: boolean;
  fechamentoAutomatico?: boolean;
}

export interface PagamentoFatura {
  id: string;
  data: string;
  valor: number;
  contaId: string;
  contaNome: string;
  formaPagamento: FormaPagamento;
}

export interface Fatura {
  id: string;
  cartaoId: string;
  cartaoNome: string;
  cartaoCor: string;
  mesReferencia: string; // 'yyyy-MM'
  dataFechamento: string; // 'yyyy-MM-dd'
  dataVencimento: string; // 'yyyy-MM-dd'
  valorTotal: number;
  status: 'aberta' | 'fechada' | 'parcial' | 'paga';
  pagamentos?: PagamentoFatura[];
  transacaoIds: string[];
}

export interface AuditLogRecord {
  id: string;
  data: string; // 'yyyy-MM-dd'
  hora: string; // 'HH:mm:ss'
  usuarioNome: string;
  usuarioEmail: string;
  usuarioRole?: string;
  acao: string;
  categoria: 'financeiro' | 'seguranca' | 'sistema' | 'usuario';
  detalhes: string;
  resultado: 'SUCESSO' | 'FALHA' | 'NEGADO' | 'ALERTA';
  ip?: string;
  navegador?: string;
  os?: string;
  dispositivo?: string;
  criadoEm: string;
}

export interface NotificacaoBancaria {
  id: string;
  categoria: 'financeiro' | 'seguranca' | 'sistema' | 'usuario';
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  usuarioResponsavel?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'nao_lida' | 'lida' | 'arquivada';
  icone?: string;
  transacaoId?: string;
  criadoEm: string;
}

// ─── ERP ENTERPRISE & CFO DIGITAL TYPES ──────────────────────────────────────
export interface RegraAutomacao {
  id: string;
  nome: string;
  termoBusca: string; // Ex: 'Energia', 'Uber', 'Mercado Livre'
  campoBusca: 'descricao' | 'fornecedor' | 'categoria';
  categoriaId: string;
  categoriaNome: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  contaId?: string;
  ativo: boolean;
  requerAprovacao?: boolean;
  limiteValorAprovacao?: number;
}

export interface CFODiagnãostico {
  scoreSaude: number; // 0 a 100
  nivelRisco: 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRÍTICO';
  liquidezCorrente: number;
  capitalGiro: number;
  taxaInadimplencia: number;
  gastosDuplicadosDetectados: number;
  oportunidadesEconomia: string[];
  anomalias: string[];
  tendenciaSaldo90Dias: 'CRESCIMENTO' | 'ESTÁVEL' | 'QUEDA' | 'RISCO_ILIQUIDEZ';
  ultimaAnalise: string;
}

export interface PrevisaoCaixaPreditiva {
  dias: number; // 7, 30, 60, 90, 180, 365
  dataAlvo: string;
  saldoPrevisto: number;
  receitasEsperadas: number;
  despesasEsperadas: number;
  nivelRisco: 'OK' | 'ALERTA' | 'PERIGO';
}

export interface ConciliacaoItem {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  documento?: string;
  transacaoCorrespondenteId?: string;
  scoreMatch?: number; // 0 a 100
  status: 'pendente' | 'conciliado' | 'divergente';
}

export interface AprovacaoDespesa {
  id: string;
  transacaoId: string;
  descricao: string;
  valor: number;
  solicitante: string;
  dataSolicitacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  aprovador?: string;
  dataAprovacao?: string;
  motivoRejeicao?: string;
}

// ─── SaaS LICENSE MANAGEMENT TYPES ──────────────────────────────────────────
export type PlanãoSaaS = 'trial' | 'gratuito' | 'mensal' | 'anual' | 'vitalicio';
export type LicencaStatus = 'Ativo' | 'Bloqueado' | 'Aguardando Pagamento' | 'Cancelado';

export interface FaturaSaaS {
  id: string;
  tenantId: string;
  tenantNome: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Vencida' | 'Cancelada';
  referenciaMesAnão: string; // ex: '2023-10'
}

export interface TenantSaaS {
  id: string;
  nome: string;
  cnpj?: string;
  emailResponsavel: string;
  planão: PlanãoSaaS;
  valorAssinatura: number;
  maxUsuarios: number;
  status: LicencaStatus;
  dataCriacao: string;
  vencimento: string;
  dataVencimentoBloqueio?: string; // Data a partir da qual o login é negado se não pago
}

// ─── BACKUP MODULE TYPES ───────────────────────────────────────────────────
export interface BackupApp {
  id: string;
  dataHora: string;
  tipo: 'manual' | 'automatico' | 'pre_restauracao';
  tamanhoRegistros: number;
  dados: string; // JSON content
}

export interface LogBackup {
  id: string;
  dataHora: string;
  acao: 'backup_criado' | 'restaurado' | 'desfeito';
  detalhes: string;
}
