import { getDb } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// ==========================================
// INTERFACES (TIPOS DE DADOS)
// ==========================================

export interface SaasCustomer {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  documento?: string;
  endereco?: string;
  status: 'ativo' | 'inativo' | 'pendente';
  criadoEm: string;
  atualizadoEm: string;
}

export interface SaasPlan {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio';
  maxUsuarios: number;
  ativo: boolean;
  criadoEm: string;
}

export interface SaasLicense {
  id: string;
  clienteId: string;
  planãoId: string;
  chave: string;
  status: 'pendente' | 'ativa' | 'suspensa' | 'cancelada' | 'expirada';
  dataCriacao: string;
  dataAtivacao?: string;
  dataVencimento: string;
  observacoes?: string;
  criadoPor: string;
  atualizadoEm: string;
}

export interface SaasAuditLog {
  id: string;
  acao: string;
  entidade: 'cliente' | 'licenca' | 'planão' | 'fatura' | 'equipe';
  entidadeId: string;
  descricao: string;
  autor: string;
  dataHora: string;
}

// ==========================================
// FUNÇÕES DE AUDITORIA
// ==========================================

export async function registrarLogAuditoria(
  acao: string, 
  entidade: SaasAuditLog['entidade'], 
  entidadeId: string, 
  descricao: string, 
  autor: string = 'Sistema'
) {
  const db = getDb();
  const logId = crypto.randomUUID();
  const log: SaasAuditLog = {
    id: logId,
    acao,
    entidade,
    entidadeId,
    descricao,
    autor,
    dataHora: new Date().toISOString()
  };
  await setDoc(doc(db, 'saas_audit_logs', logId), log);
}

// ==========================================
// GERAÇÃO DE LICENÇA E APROVAÇÃO
// ==========================================

export function gerarChaveLicenca(): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let chave = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) chave += '-';
    chave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return chave;
}

export async function enviarEmailComEmailJS(
  to_name: string, 
  to_email: string, 
  subject: string, 
  message: string, 
  link_acesso?: string
): Promise<void> {
  // Configurações do EmailJS (Devem estar configuradas não ambiente ou hardcoded se necessário)
  const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_id'; 
  const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_id';
  const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'public_key';
  
  // Note: Para um uso real e se as chaves Next_Public não estiverem setadas, pode falhar silenciosamente, 
  // mas garantimos que a Promise.catch seja tratada
  try {
    const templateParams = {
      to_name,
      to_email,
      subject,
      message,
      link_acesso: link_acesso || 'https://sistemafinanceiropessoal.vercel.app'
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  } catch (error) {
    console.error("Erro não envio do EmailJS via Frontend: ", error);
    throw new Error("Falha ao enviar o E-mail via EmailJS.");
  }
}

export async function aprovarLicencaCliente(
  clienteId: string, 
  planãoId: string, 
  nomeCliente: string, 
  emailCliente: string, 
  adminName: string
) {
  const db = getDb();
  
  // 1. Calcular Vencimento (30 dias padrão se mensal)
  const agora = new Date();
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30); // Padrão mensal
  
  const chave = gerarChaveLicenca();
  const licencaId = crypto.randomUUID();

  const licenca: SaasLicense = {
    id: licencaId,
    clienteId,
    planãoId,
    chave,
    status: 'ativa',
    dataCriacao: agora.toISOString(),
    dataAtivacao: agora.toISOString(),
    dataVencimento: vencimento.toISOString(),
    criadoPor: adminName,
    atualizadoEm: agora.toISOString()
  };

  // 2. Salvar Licença e Atualizar Cliente
  await setDoc(doc(db, 'saas_licenses', licencaId), licenca);
  
  // Atualizamos o cliente para ativo se ele estivesse pendente
  const cliRef = doc(db, 'saas_customers', clienteId);
  await setDoc(cliRef, {
    nome: nomeCliente,
    email: emailCliente,
    status: 'ativo',
    atualizadoEm: agora.toISOString()
  }, { merge: true });

  // 3. Registrar Log
  await registrarLogAuditoria(
    'APROVACAO', 
    'licenca', 
    licencaId, 
    `Licença ativada para o cliente ${nomeCliente}. Chave gerada.`,
    adminName
  );

  // 4. Enviar E-mail (Se falhar, logamos, mas não impedimos a aprovação não banco)
  try {
    const msg = `Sua licença foi ativada com sucesso! Chave: ${chave}. Vencimento: ${vencimento.toLocaleDateString('pt-BR')}`;
    await enviarEmailComEmailJS(nomeCliente, emailCliente, 'Licença Ativada - FinanceAI', msg);
    await registrarLogAuditoria('EMAIL_ENVIADO', 'licenca', licencaId, `E-mail de boas vindas enviado para ${emailCliente}`, 'Sistema');
    return { success: true };
  } catch (err: any) {
    await registrarLogAuditoria('EMAIL_FALHA', 'licenca', licencaId, `Falha ao enviar e-mail: ${err.message}`, 'Sistema');
    // Em vez de bloquear a aprovação, retornamos um alerta para a UI
    return { success: true, warning: 'Licença aprovada, porém o EmailJS falhou (verifique as chaves de API).' };
  }
}

// ==========================================
// OUTRAS AÇÕES DE LICENÇA (SUSPENDER, RENOVAR)
// ==========================================

export async function alterarStatusLicenca(licencaId: string, novoStatus: SaasLicense['status'], motivo: string, autor: string) {
  const db = getDb();
  await updateDoc(doc(db, 'saas_licenses', licencaId), {
    status: novoStatus,
    observacoes: motivo,
    atualizadoEm: new Date().toISOString()
  });

  await registrarLogAuditoria(
    `MUDANCA_STATUS_${novoStatus.toUpperCase()}`,
    'licenca',
    licencaId,
    `Status alterado para ${novoStatus}. Motivo: ${motivo}`,
    autor
  );
}

export async function renovarLicencaManual(licencaId: string, dias: number, autor: string) {
  const db = getDb();
  const ref = doc(db, 'saas_licenses', licencaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Licença não encontrada.");
  
  const data = snap.data() as SaasLicense;
  
  let novaData = new Date(data.dataVencimento);
  if (novaData < new Date()) {
    novaData = new Date(); // Se já estava expirada, renova a partir de hoje
  }
  novaData.setDate(novaData.getDate() + dias);

  await updateDoc(ref, {
    dataVencimento: novaData.toISOString(),
    status: 'ativa',
    atualizadoEm: new Date().toISOString()
  });

  await registrarLogAuditoria(
    'RENOVACAO',
    'licenca',
    licencaId,
    `Renovada por mais ${dias} dias. Novo vencimento: ${novaData.toLocaleDateString('pt-BR')}`,
    autor
  );
}

export async function excluirLicenca(licencaId: string, autor: string) {
  const db = getDb();
  const ref = doc(db, 'saas_licenses', licencaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  
  const data = snap.data() as SaasLicense;
  
  await deleteDoc(ref);
  
  const cliRef = doc(db, 'saas_customers', data.clienteId);
  await updateDoc(cliRef, {
    status: 'inativo',
    atualizadoEm: new Date().toISOString()
  }).catch(() => {});
  
  await registrarLogAuditoria(
    'EXCLUSAO',
    'licenca',
    licencaId,
    `Licença excluída permanentemente do sistema`,
    autor
  );
}
