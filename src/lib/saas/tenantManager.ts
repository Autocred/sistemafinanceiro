import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { gerarId } from '@/lib/storage';

export interface PlanoSaaS {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  periodicidade: 'mensal' | 'anual' | 'semestral' | 'trimestral';
  limiteUsuarios: number; // 0 = ilimitado
  features: string[]; // Lista de recursos incluídos (agora mapeia os módulos)
  ativo: boolean;
  dataCriacao?: Date;
  stripeProductId?: string;
  asaasPlanId?: string;
}

export async function getPlanosSaaS(): Promise<PlanoSaaS[]> {
  try {
    const snap = await getDocs(collection(getDb(), 'admin_master_planos'));
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      dataCriacao: d.data().dataCriacao?.toDate()
    })) as PlanoSaaS[];
  } catch (e) {
    console.error("Erro ao carregar planos", e);
    return [];
  }
}

export async function salvarPlanoSaaS(plano: Omit<PlanoSaaS, 'id'> | PlanoSaaS): Promise<string> {
  const isEdit = 'id' in plano && plano.id;
  const id = isEdit ? plano.id : gerarId();
  
  const docRef = doc(getDb(), 'admin_master_planos', id);
  if (isEdit) {
    await updateDoc(docRef, { ...plano });
  } else {
    await setDoc(docRef, { ...plano, dataCriacao: serverTimestamp() });
  }
  return id;
}

export async function deletarPlanoSaaS(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'admin_master_planos', id));
}

export interface LicencaMaster {
  id: string;
  dominio: string; // ex: cliente1.meusistema.com.br
  nomeFantasia: string;
  razaoSocial: string;
  documento: string;
  status: 'ativa' | 'inadimplente' | 'suspensa' | 'teste' | 'pendente';
  plano: string;
  dataCriacao: Date;
  dataVencimento: Date | null;
  usernameAdmin?: string;
  senhaProvisoria?: string;
  telefone?: string;
  whatsapp?: string;
  emailEmpresa?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  configuracoes: {
    corPrincipal?: string;
    logoUrl?: string;
    temaClaro?: boolean;
    modulos?: Record<string, boolean>;
  };
  modulosLiberados?: string[];
}

/**
 * Obtém os dados de uma licença baseada no hostname (domínio atual)
 */
export async function getTenantByHostname(hostname: string): Promise<LicencaMaster | null> {
  try {
    const db = getDb();
    const licencasRef = collection(db, 'admin_master_licencas');
    const q = query(licencasRef, where('dominio', '==', hostname));
    const snap = await getDocs(q);
    
    if (snap.empty) return null;
    
    const docData = snap.docs[0].data();
    return {
      id: snap.docs[0].id,
      ...docData,
      dataCriacao: docData.dataCriacao?.toDate() || new Date(),
      dataVencimento: docData.dataVencimento?.toDate() || null,
    } as LicencaMaster;
  } catch (error) {
    console.error("Erro ao buscar tenant por hostname", error);
    return null;
  }
}

/**
 * Provisiona uma nova licença (Cria os dados essenciais da nova licença limpa)
 */
export async function provisionarNovaLicenca(dados: Omit<LicencaMaster, 'id' | 'dataCriacao'>, emailAdmin: string): Promise<string> {
  const db = getDb();
  const novoTenantId = gerarId();
  
  // 1. Salvar no controle Master
  await setDoc(doc(db, 'admin_master_licencas', novoTenantId), {
    ...dados,
    dataCriacao: serverTimestamp(),
  });

  // 2. Criar configuração padrão do App no escopo do novo Tenant
  // A licença nasce totalmente "limpa" de lançamentos e cadastros, mas com a estrutura
  await setDoc(doc(db, `tenants/${novoTenantId}/configuracoes_app`, 'default'), {
    moeda: 'BRL',
    idioma: 'pt-BR',
    notificacoesAtivas: true,
    tema: 'light',
    dataCriacaoApp: serverTimestamp()
  });

  // 3. Cadastrar o primeiro usuário Admin do novo Tenant
  const rootAdminId = gerarId();
  await setDoc(doc(db, `tenants/${novoTenantId}/users`, rootAdminId), {
    nome: 'Administrador ' + dados.nomeFantasia,
    email: emailAdmin,
    role: 'admin',
    tenantId: novoTenantId,
    criadoEm: serverTimestamp()
  });

  return novoTenantId;
}
