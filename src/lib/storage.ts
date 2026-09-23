'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, query, orderBy, where, onSnapshot, runTransaction
} from 'firebase/firestore';
import { getDb } from './firebase';
import {
  Transacao, Categoria, CentroCusto, Fornecedor, Cliente, Conta, Cartao,
  Meta, Orcamento, HistoricoIA, ConfiguracaoApp, AlertaFinanceiro, Fatura,
  FormaPagamento, FrequenciaRecorrencia
} from './types';
import { CATEGORIAS_PADRAO, CENTROS_CUSTO_PADRAO, CONTAS_PADRAO, CARTOES_PADRAO } from './defaults';
import { calcularCicloFatura } from './cartao-utils';

// --- SSR guard ---
export function isBrowser() {
  return typeof window !== 'undefined';
}

// --- Helpers ---
export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function docToObj<T>(snap: any): T {
  const data = snap.data();
  const sanitize = (obj: any): any => {
    if (!obj) return obj;
    if (typeof obj?.toDate === 'function') {
      try { return obj.toDate().toISOString().split('T')[0]; } catch(e) { return String(obj); }
    }
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) return obj.map(sanitize);
      const newObj: any = {};
      for (const k in obj) {
        if (k === 'data' || k === 'dataVencimento' || k === 'dataPagamento' || k === 'dataExtrato' || k === 'dataCriacao') {
           const val = obj[k];
           if (val && typeof val === 'object' && typeof val.toDate !== 'function') {
              newObj[k] = String(val);
              continue;
           }
        }
        newObj[k] = sanitize(obj[k]);
      }
      return newObj;
    }
    return obj;
  };
  return { id: snap.id, ...sanitize(data) } as T;
}

let activeTenantId: string | null = null;
export function getTenantId() { return activeTenantId || 'master'; }
export function setTenantId(id: string | null) {
  activeTenantId = id;
}

export function getCollectionPath(col: string) {
  if (!activeTenantId || activeTenantId === 'master' || activeTenantId === '9yxuafoC0AV9BrIKem05ponbmgn2') {
    return col;
  }
  return `tenants/${activeTenantId}/${col}`;
}

// --- Cache em memoria (reduz leituras Firestore em ~90%) ---
const CACHE_TTL_MS = 3 * 60 * 1000;
interface CacheEntry { data: any[]; expiresAt: number }
const _cache = new Map<string, CacheEntry>();
function _cacheKey(col: string) { return `${activeTenantId || 'master'}::${col}`; }

export function invalidateCache(col?: string) {
  if (col) { _cache.delete(_cacheKey(col)); } else { _cache.clear(); }
}

async function getAll<T>(col: string): Promise<T[]> {
  if (!isBrowser()) return [];
  const key = _cacheKey(col);
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T[];
  const snap = await getDocs(collection(getDb(), getCollectionPath(col)));
  const data = snap.docs.map(d => docToObj<T>(d));
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

async function upsert(col: string, id: string, data: any): Promise<void> {
  if (!isBrowser()) return;
  await setDoc(doc(getDb(), getCollectionPath(col), id), data, { merge: true });
  invalidateCache(col);
}

async function remove(col: string, id: string): Promise<void> {
  if (!isBrowser()) return;
  await deleteDoc(doc(getDb(), getCollectionPath(col), id));
  invalidateCache(col);
}

// --- Subscribe helpers ---
type Unsubscribe = () => void;

function subscribe<T>(
  col: string,
  callback: (data: T[]) => void,
  queryConstraints: any[] = []
): Unsubscribe {
  if (!isBrowser()) return () => {};
  const q = queryConstraints.length
    ? query(collection(getDb(), getCollectionPath(col)), ...queryConstraints)
    : collection(getDb(), getCollectionPath(col));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => docToObj<T>(d)));
  });
}

// Subscriptions exportadas
export function subscribeTransacoes(callback: (data: any[]) => void): Unsubscribe {
  return subscribe('transacoes', callback, [orderBy('data', 'desc')]);
}

export function subscribeTransacoesByMes(
  anao: number, mes: number,
  callback: (data: any[]) => void
): Unsubscribe {
  const mesStr = `${anao}-${String(mes).padStart(2, '0')}`;
  return subscribe('transacoes', callback, [where('dataCompetencia', '==', mesStr)]);
}
export function subscribeContas(callback: (data: any[]) => void): Unsubscribe {
  return subscribe('contas', callback);
}

export function subscribeCartoes(callback: (data: any[]) => void): Unsubscribe {
  return subscribe('cartoes', callback);
}

export function subscribeFaturas(callback: (data: any[]) => void): Unsubscribe {
  return subscribe('faturas', callback);
}

export function subscribeCategorias(callback: (data: any[]) => void): Unsubscribe {
  return subscribe('categorias', callback);
}


export function formatarMoeda(valor: any) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

export function gerarIdPublico() { return gerarId(); }

// ─── METAS E ORÇAMENTOS (FIREBASE) ─────────────────────────────────────────────
export async function getMetasConfig(): Promise<{ orcamentos: any[], orcamentoMaximo: number }> {
  if (!isBrowser()) return { orcamentos: [], orcamentoMaximo: 0 };
  const snap = await getDoc(doc(getDb(), getCollectionPath('configuracoes_metas'), 'metas'));
  if (snap.exists()) {
    return snap.data() as { orcamentos: any[], orcamentoMaximo: number };
  }
  return { orcamentos: [], orcamentoMaximo: 0 };
}

export async function salvarMetasConfig(orcamentos: any[], orcamentoMaximo: number): Promise<void> {
  if (!isBrowser()) return;
  await setDoc(doc(getDb(), getCollectionPath('configuracoes_metas'), 'metas'), {
    orcamentos,
    orcamentoMaximo
  }, { merge: true });
}

export function subscribeMetasConfig(callback: (data: { orcamentos: any[], orcamentoMaximo: number }) => void): Unsubscribe {
  if (!isBrowser()) return () => {};
  return onSnapshot(doc(getDb(), getCollectionPath('configuracoes_metas'), 'metas'), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as { orcamentos: any[], orcamentoMaximo: number });
    } else {
      callback({ orcamentos: [], orcamentoMaximo: 0 });
    }
  });
}

// ─── TRANSAÇÕES ───────────────────────────────────────────────────────────────
export async function getTransacoes(): Promise<Transacao[]> {
  if (!isBrowser()) return [];
  const snap = await getDocs(query(collection(getDb(), getCollectionPath('transacoes')), orderBy('data', 'desc')));
  return snap.docs.map(d => docToObj<Transacao>(d));
}

export async function getTransacoesByPeriodo(dataInicio: string, dataFim: string): Promise<Transacao[]> {
  if (!isBrowser()) return [];
  const snap = await getDocs(
    query(collection(getDb(), getCollectionPath('transacoes')), where('data', '>=', dataInicio), where('data', '<=', dataFim), orderBy('data', 'desc'))
  );
  return snap.docs.map(d => docToObj<Transacao>(d));
}

export async function getTransacoesByMes(anão: number, mes: number): Promise<Transacao[]> {
  if (!isBrowser()) return [];
  const mesStr = `${anão}-${String(mes).padStart(2, '0')}`;
  const snap = await getDocs(
    query(collection(getDb(), getCollectionPath('transacoes')), where('dataCompetencia', '==', mesStr))
  );
  return snap.docs.map(d => docToObj<Transacao>(d)).sort((a, b) => b.data.localeCompare(a.data));
}

export async function verificarSaldoDisponivel(contaId: string, valorNecessario: number): Promise<Conta> {
  if (!isBrowser() || !contaId) throw new Error("Conta não selecionada");
  const docRef = doc(getDb(), getCollectionPath('contas'), contaId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Conta bancária não encontrada.");
  const conta = snap.data() as Conta;
  const saldoAtual = conta.saldo || 0;
  if (saldoAtual < valorNecessario) {
    throw new Error(`Saldo insuficiente na conta "${conta.nome}". Saldo atual: ${formatarMoeda(saldoAtual)}, necessário: ${formatarMoeda(valorNecessario)}.`);
  }
  return conta;
}

export async function atualizarSaldoConta(contaId: string, variacao: number): Promise<void> {
  throw new Error("PROIBIDO: O saldo das contas não pode mais ser atualizado diretamente. Toda alteração de saldo deve ser feita através de uma transação financeira atômica.");
}

export function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  // Preserve Date and Firestore Timestamp/FieldValue objects
  if (typeof obj !== 'object' || obj instanceof Date || typeof obj.toDate === 'function' || obj.constructor.name === 'FieldValue') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectForFirestore).filter(v => v !== undefined);
  }
  const cleaned: any = {};
  for (const [k, v] of Object.entries(obj)) {
    // Skip internal metadata fields (used for fatura cleanup, not stored)
    if (k.startsWith('__')) continue;
    if (v !== undefined) {
      cleaned[k] = cleanObjectForFirestore(v);
    }
  }
  return cleaned;
}


export async function salvarTransacao(transacao: Omit<Transacao, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Transacao> {
  const now = new Date().toISOString();
  const id = (transacao as any).id || gerarId();
  const nova = { ...transacao, id, criadoEm: now, atualizadoEm: now };
  
  // VALIDAÇÃO ESTRITA ANTES DA TRANSAÇÃO
  if (!nova.descricao || !nova.valor || !nova.tipo) {
    throw new Error("Preencha os campos obrigatórios (Descrição, Valor e Tipo) para salvar.");
  }
  if (nova.status === 'pago' && nova.formaPagamento !== 'cartao_credito' && !nova.contaId) {
    throw new Error("Selecione uma Conta Financeira válida para salvar um lançamento PAGO.");
  }
  if (nova.tipo === 'transferencia' && (!nova.contaId || !nova.contaDestinãoId)) {
    throw new Error("Transferências exigem Conta de Origem e Conta de Destinão.");
  }

  let cartaoCreditoObj: any = null;
  if (nova.formaPagamento === 'cartao_credito' && nova.cartaoId) {
    const cartoes = await getCartoes();
    cartaoCreditoObj = cartoes.find(c => c.id === nova.cartaoId);
    if (cartaoCreditoObj && nova.tipo === 'despesa') {
      const limiteDisponivel = cartaoCreditoObj.limiteDisponivel !== undefined ? cartaoCreditoObj.limiteDisponivel : cartaoCreditoObj.limite;
      if (limiteDisponivel !== undefined && nova.valor > limiteDisponivel) {
        throw new Error(`Limite insuficiente não cartão ${cartaoCreditoObj.nome}. Disponível: R$ ${limiteDisponivel.toFixed(2)}, Valor da Compra: R$ ${nova.valor.toFixed(2)}`);
      }
    }
  }

  if (isBrowser()) {
    const db = getDb();
    await runTransaction(db, async (transaction) => {
      let delta = 0;
      let contaRef = null;
      let contaDoc = null;
      let saldoAtual = 0;
      
      if (nova.status === 'pago' && nova.formaPagamento !== 'cartao_credito' && nova.contaId) {
        contaRef = doc(db, getCollectionPath('contas'), nova.contaId);
        contaDoc = await transaction.get(contaRef);
        if (!contaDoc.exists()) throw new Error("Conta não encontrada.");
        
        saldoAtual = contaDoc.data().saldo || 0;
        
        if (nova.tipo === 'despesa') delta = -Math.abs(nova.valor);
        else if (nova.tipo === 'receita') delta = Math.abs(nova.valor);
        else if (nova.tipo === 'transferencia') delta = -Math.abs(nova.valor);
        
        if (delta < 0 && saldoAtual + delta < 0) {
           throw new Error(`Saldo insuficiente na conta "${contaDoc.data().nome}". Saldo: R$ ${saldoAtual.toFixed(2)}, Necessário: R$ ${Math.abs(delta).toFixed(2)}.`);
        }
      }
      
      let contaDestinãoRef = null;
      let contaDestinãoDoc = null;
      let saldoDestinãoAtual = 0;
      
      if (nova.status === 'pago' && nova.tipo === 'transferencia' && nova.contaDestinãoId) {
        contaDestinãoRef = doc(db, getCollectionPath('contas'), nova.contaDestinãoId);
        contaDestinãoDoc = await transaction.get(contaDestinãoRef);
        if (contaDestinãoDoc.exists()) {
          saldoDestinãoAtual = contaDestinãoDoc.data().saldo || 0;
        }
      }
      
      const transRef = doc(db, getCollectionPath('transacoes'), id);
      transaction.set(transRef, cleanObjectForFirestore(nova));
      
      // Criar a movimentação (financial_movements) apenas se houver variação não saldo
      if (delta !== 0 && contaRef) {
         const movementId = gerarId();
         const movRef = doc(db, getCollectionPath('financial_movements'), movementId);
         transaction.set(movRef, cleanObjectForFirestore({
            id: movementId,
            launchId: id,
            tipo: nova.tipo,
            valor: nova.valor,
            contaOrigemId: nova.contaId,
            contaDestinãoId: nova.contaDestinãoId,
            createdAt: now,
            status: 'efetivado',
            operation: 'baixa',
            origin: nova.recorrente ? 'recorrente' : 'manual'
         }));
         
         nova.movementIds = [movementId];
         transaction.set(transRef, cleanObjectForFirestore(nova)); 
         
         transaction.update(contaRef, { saldo: saldoAtual + delta });
         
         if (contaDestinãoRef && contaDestinãoDoc?.exists()) {
            transaction.update(contaDestinãoRef, { saldo: saldoDestinãoAtual + Math.abs(nova.valor) });
         }
      }
    });
  }
  
  if (nova.formaPagamento === 'cartao_credito' && cartaoCreditoObj) {
    if (nova.tipo === 'despesa' && cartaoCreditoObj.limiteDisponivel !== undefined) {
      cartaoCreditoObj.limiteDisponivel -= nova.valor;
      await salvarCartao(cartaoCreditoObj);
    }
    
    await vincularTransacaoFatura(
      id, cartaoCreditoObj.id, cartaoCreditoObj.nome, cartaoCreditoObj.cor || '#3b82f6',
      nova.dataLancamento || nova.data, nova.valor,
      cartaoCreditoObj.dataFechamento || 1, cartaoCreditoObj.dataVencimento || 10,
      nova.dataVencimento
    );
  }

  try {
    const { registrarAuditoria } = await import('./audit');
    const { playSound } = await import('./audio');
    await registrarAuditoria({
      acao: 'NOVA_TRANSACAO',
      categoria: 'financeiro',
      detalhes: `${nova.tipo.toUpperCase()}: ${nova.descricao} - R$ ${nova.valor.toFixed(2)} (${nova.status})`,
      resultado: 'SUCESSO'
    });
    if (nova.status === 'pago') playSound(nova.tipo === 'receita' ? 'recebimento' : 'pagamento');
  } catch (e) {}

  invalidateCache('transacoes');
  invalidateCache('contas');
  return nova as Transacao;
}

export async function atualizarTransacao(id: string, dados: Partial<Transacao>, oldData?: Transacao): Promise<void> {
  if (!isBrowser()) return;
  const now = new Date().toISOString();
  const db = getDb();

  // Validação Estrita (Update)
  if (dados.status === 'pago' && dados.formaPagamento !== 'cartao_credito' && !dados.contaId && ('contaId' in dados)) {
    throw new Error("Selecione uma Conta Financeira válida para marcar como PAGO.");
  }
  if (dados.tipo === 'transferencia' && (!dados.contaId || !dados.contaDestinãoId) && ('tipo' in dados)) {
    throw new Error("Transferências exigem Conta de Origem e Conta de Destinão.");
  }

  // Otimização: Se o chamador já tem os dados antigos, usamos sem ler do Firestore
  // Caso contrário, fazemos a leitura normal via runTransaction
  const _executar = async (antiga: Transacao) => {
    const nova = { ...antiga, ...dados };
    delete (dados as any).id;
    
    const now2 = new Date().toISOString();
    let movementIds = [...(antiga.movementIds || [])];
    (dados as any).__globalOldCartaoId = antiga.cartaoId || '';
    if (!('__globalOldFaturaId' in (dados as any))) {
      (dados as any).__globalOldFaturaId = antiga.faturaId || '';
    }

    let oldEffectOrigem = 0;
    if (antiga.status === 'pago' && antiga.formaPagamento !== 'cartao_credito' && antiga.contaId) {
      if (antiga.tipo === 'despesa' || antiga.tipo === 'transferencia') oldEffectOrigem = -Math.abs(antiga.valor);
      else if (antiga.tipo === 'receita') oldEffectOrigem = Math.abs(antiga.valor);
    }
    let newEffectOrigem = 0;
    if (nova.status === 'pago' && nova.formaPagamento !== 'cartao_credito' && nova.contaId) {
      if (nova.tipo === 'despesa' || nova.tipo === 'transferencia') newEffectOrigem = -Math.abs(nova.valor);
      else if (nova.tipo === 'receita') newEffectOrigem = Math.abs(nova.valor);
    }
    let oldEffectDestinão = 0;
    if (antiga.status === 'pago' && antiga.tipo === 'transferencia' && antiga.contaDestinãoId) {
      oldEffectDestinão = Math.abs(antiga.valor);
    }
    let newEffectDestinão = 0;
    if (nova.status === 'pago' && nova.tipo === 'transferencia' && nova.contaDestinãoId) {
      newEffectDestinão = Math.abs(nova.valor);
    }

    const noBalanceChange =
      oldEffectOrigem === newEffectOrigem &&
      oldEffectDestinão === newEffectDestinão &&
      antiga.contaId === nova.contaId &&
      antiga.contaDestinãoId === nova.contaDestinãoId;

    if (noBalanceChange) {
      // 0 leituras, 1 escrita
      await updateDoc(doc(db, getCollectionPath('transacoes'), id), cleanObjectForFirestore({ ...dados, atualizadoEm: now2 }));
    } else {
      // Precisa ler saldos das contas — usa runTransaction
      await runTransaction(db, async (transaction) => {
        const transRef = doc(db, getCollectionPath('transacoes'), id);
        const contasIds = new Set<string>();
        if (antiga.contaId) contasIds.add(antiga.contaId);
        if (nova.contaId) contasIds.add(nova.contaId);
        if (antiga.contaDestinãoId) contasIds.add(antiga.contaDestinãoId);
        if (nova.contaDestinãoId) contasIds.add(nova.contaDestinãoId);

        const contasMap = new Map<string, any>();
        for (const cid of contasIds) {
          const cRef = doc(db, getCollectionPath('contas'), cid);
          const cSnap = await transaction.get(cRef);
          if (cSnap.exists()) {
            contasMap.set(cid, { ref: cRef, saldo: cSnap.data().saldo || 0, nome: cSnap.data().nome });
          }
        }

        const estornar = (cId: string, valorEstornão: number, tipo: string, isDestinão: boolean = false) => {
          const cInfo = contasMap.get(cId);
          if (cInfo) {
            cInfo.saldo += valorEstornão;
            const mId = gerarId();
            const movRef = doc(db, getCollectionPath('financial_movements'), mId);
            transaction.set(movRef, cleanObjectForFirestore({
               id: mId, launchId: id, tipo, valor: Math.abs(valorEstornão),
               contaOrigemId: isDestinão ? undefined : cId,
               contaDestinãoId: isDestinão ? cId : undefined,
               createdAt: now2, status: 'estornado', operation: 'estornão', origin: 'manual'
            }));
            movementIds.push(mId);
          }
        };

        const baixar = (cId: string, cDestId: string | undefined, valorBaixa: number, isTransferencia: boolean) => {
           const cInfo = contasMap.get(cId);
           if (cInfo) {
              if (valorBaixa < 0 && cInfo.saldo + valorBaixa < 0) {
                 throw new Error(`Saldo insuficiente na conta "${cInfo.nome}". Saldo: R$ ${cInfo.saldo.toFixed(2)}, Necessário: R$ ${Math.abs(valorBaixa).toFixed(2)}.`);
              }
              cInfo.saldo += valorBaixa;
              if (cDestId) {
                 const cDestInfo = contasMap.get(cDestId);
                 if (cDestInfo) cDestInfo.saldo += Math.abs(valorBaixa);
              }
              const mId = gerarId();
              const movRef = doc(db, getCollectionPath('financial_movements'), mId);
              transaction.set(movRef, cleanObjectForFirestore({
                 id: mId, launchId: id, tipo: isTransferencia ? 'transferencia' : (valorBaixa > 0 ? 'receita' : 'despesa'),
                 valor: Math.abs(valorBaixa),
                 contaOrigemId: cId, contaDestinãoId: cDestId,
                 createdAt: now2, status: 'efetivado', operation: 'baixa', origin: 'manual'
              }));
              movementIds.push(mId);
           }
        };

        if (oldEffectOrigem !== 0 && antiga.contaId) estornar(antiga.contaId, -oldEffectOrigem, antiga.tipo, false);
        if (oldEffectDestinão !== 0 && antiga.contaDestinãoId) estornar(antiga.contaDestinãoId, -oldEffectDestinão, antiga.tipo, true);
        if (newEffectOrigem !== 0 && nova.contaId) baixar(nova.contaId, nova.contaDestinãoId, newEffectOrigem, nova.tipo === 'transferencia');

        for (const [, cInfo] of contasMap.entries()) {
          transaction.update(cInfo.ref, { saldo: cInfo.saldo });
        }
        transaction.update(transRef, cleanObjectForFirestore({ ...dados, movementIds, atualizadoEm: now2 }));
      });
    }
  };

  if (oldData) {
    // Caminho rápido: 0 leituras extras — usa dados passados pelo chamador
    await _executar(oldData);
  } else {
    // Caminho normal: lê do Firestore
    const snapAntiga = await getDoc(doc(db, getCollectionPath('transacoes'), id));
    if (!snapAntiga.exists()) return;
    await _executar(snapAntiga.data() as Transacao);
  }


  // ─── FATURA CLEANUP: Se cartaoId mudou ou campos de CC mudaram, limpa fatura antiga e vincula nova ───
  // IMPORTANTE: Se __skipFaturaRelink=true, é porque vincularTransacaoFatura nos chamou — NÃO fazer cleanup
  // pois oldFaturaId seria a fatura recém-criada, zerando o valorTotal incorretamente.
  if (!(dados as any).__skipFaturaRelink) {
    const transDocAfter = await getDoc(doc(getDb(), getCollectionPath('transacoes'), id));
    const afterData = transDocAfter.exists() ? transDocAfter.data() as Transacao : null;
    
    if (afterData) {
      const oldCartaoId = (dados as any).__globalOldCartaoId || '';
      const oldFaturaId = (dados as any).__globalOldFaturaId || '';
      const newCartaoId = afterData.cartaoId || '';

      // Limpa fatura antiga SOMENTE se tínhamos uma fatura anterior explicitamente definida
      if (oldFaturaId && oldFaturaId !== 'undefined') {
        try {
          const faturaRef = doc(getDb(), getCollectionPath('faturas'), oldFaturaId);
          const faturaSnap = await getDoc(faturaRef);
          if (faturaSnap.exists()) {
            const fData = faturaSnap.data() as Fatura;
            const newIds = (fData.transacaoIds || []).filter((tid: string) => tid !== id);
            let newTotal = 0;
            for (const tid of newIds) {
              const tSnap = await getDoc(doc(getDb(), getCollectionPath('transacoes'), tid));
              if (tSnap.exists()) {
                const tData = tSnap.data();
                newTotal += Math.abs(tData.valor || 0);
              }
            }
            await updateDoc(faturaRef, { transacaoIds: newIds, valorTotal: newTotal });
            await updateDoc(doc(getDb(), getCollectionPath('transacoes'), id), { faturaId: '', cartaoId: newCartaoId || '' });
          }
        } catch (e) {
          console.warn('Fatura cleanup failed:', e);
        }
      }

      // Re-vincula se for cartão de crédito
      if (afterData.formaPagamento === 'cartao_credito' && newCartaoId) {
        const cartoes = await getCartoes();
        const cartao = cartoes.find(c => c.id === newCartaoId);
        if (cartao) {
          await vincularTransacaoFatura(
            id, cartao.id, cartao.nome, cartao.cor || '#3b82f6',
            afterData.dataLancamento || afterData.data, afterData.valor,
            cartao.dataFechamento || 1, cartao.dataVencimento || 10,
            afterData.dataVencimento
          );
        }
      }
    }
  }

  try {
    const { registrarAuditoria } = await import('./audit');
    await registrarAuditoria({
      acao: 'EDICAO_TRANSACAO',
      categoria: 'financeiro',
      detalhes: `ID: ${id}. Campos alterados: ${Object.keys(dados).join(', ')}`,
      resultado: 'SUCESSO'
    });
  } catch (e) {}

  invalidateCache('transacoes');
  invalidateCache('contas');
}

export async function deletarTransacao(id: string): Promise<void> {
  if (!isBrowser()) return;
  const db = getDb();
  
  let cartaoParaRestaurarId: string | null = null;
  let valorParaRestaurar = 0;

  await runTransaction(db, async (transaction) => {
    const transRef = doc(db, getCollectionPath('transacoes'), id);
    const snapAntiga = await transaction.get(transRef);
    if (!snapAntiga.exists()) return;
    const antiga = snapAntiga.data() as Transacao;
    
    if (antiga.status === 'pago' && antiga.formaPagamento !== 'cartao_credito') {
       if (antiga.contaId) {
          const cRef = doc(db, getCollectionPath('contas'), antiga.contaId);
          const cSnap = await transaction.get(cRef);
          if (cSnap.exists()) {
             let oldEffectOrigem = 0;
             if (antiga.tipo === 'despesa' || antiga.tipo === 'transferencia') oldEffectOrigem = -Math.abs(antiga.valor);
             else if (antiga.tipo === 'receita') oldEffectOrigem = Math.abs(antiga.valor);
             
             transaction.update(cRef, { saldo: cSnap.data().saldo - oldEffectOrigem });
          }
       }
       if (antiga.tipo === 'transferencia' && antiga.contaDestinãoId) {
          const cDestRef = doc(db, getCollectionPath('contas'), antiga.contaDestinãoId);
          const cDestSnap = await transaction.get(cDestRef);
          if (cDestSnap.exists()) {
             transaction.update(cDestRef, { saldo: cDestSnap.data().saldo - Math.abs(antiga.valor) });
          }
       }
    } else if (antiga.formaPagamento === 'cartao_credito' && antiga.tipo === 'despesa' && antiga.cartaoId) {
       cartaoParaRestaurarId = antiga.cartaoId;
       valorParaRestaurar = antiga.valor;
    }

    if (antiga.faturaId) {
      const fatRef = doc(db, getCollectionPath('faturas'), antiga.faturaId);
      const fatSnap = await transaction.get(fatRef);
      if (fatSnap.exists()) {
         const fatData = fatSnap.data();
         const newIds = (fatData.transacaoIds || []).filter((tid: string) => tid !== id);
         const novoValorTotal = Math.max(0, (fatData.valorTotal || 0) - Math.abs(antiga.valor || 0));
         transaction.update(fatRef, { transacaoIds: newIds, valorTotal: novoValorTotal });
      }
    }
    
    transaction.delete(transRef);
  });

  if (cartaoParaRestaurarId && valorParaRestaurar > 0) {
    const cartoes = await getCartoes();
    const cartao = cartoes.find(c => c.id === cartaoParaRestaurarId);
    if (cartao && cartao.limiteDisponivel !== undefined) {
      cartao.limiteDisponivel += valorParaRestaurar;
      await salvarCartao(cartao);
    }
  }

  try {
    const { registrarAuditoria } = await import('./audit');
    await registrarAuditoria({
      acao: 'EXCLUSAO_TRANSACAO',
      categoria: 'financeiro',
      detalhes: `Lançamento ${id} excluído com sucesso.`,
      resultado: 'SUCESSO'
    });
  } catch (e) {}
}

// ─── PARCELAMENTOS ────────────────────────────────────────────────────────────
// Cria N lançamentos (um por mês) e vincula cada um à fatura correta do cartão
export async function salvarTransacoesParceladas(
  transacaoBase: Omit<Transacao, 'id' | 'criadoEm' | 'atualizadoEm'>,
  totalParcelas: number
): Promise<Transacao[]> {
  if (!isBrowser()) return [];
  const { avancarDataRecorrencia } = await import('@/lib/sorting');
  const grupoParcelamento = gerarId();
  const transacoes: Transacao[] = [];

  // Valor de cada parcela (distribui o centavo na última)
  const valorTotal = transacaoBase.valor;
  const valorParcela = parseFloat((valorTotal / totalParcelas).toFixed(2));
  const valorUltima = parseFloat((valorTotal - valorParcela * (totalParcelas - 1)).toFixed(2));

  // Data de vencimento inicial (primeira parcela)
  let dataVencimentoAtual = transacaoBase.dataVencimento || transacaoBase.data;
  if (dataVencimentoAtual.includes('/')) {
    const p = dataVencimentoAtual.split('/');
    if (p.length === 3) dataVencimentoAtual = `${p[2]}-${p[1]}-${p[0]}`;
  }

  for (let i = 0; i < totalParcelas; i++) {
    const id = gerarId();
    const isUltima = i === totalParcelas - 1;
    const parcela: any = {
      ...transacaoBase,
      id,
      valor: isUltima ? valorUltima : valorParcela,
      dataVencimento: dataVencimentoAtual,
      dataCompetencia: dataVencimentoAtual.substring(0, 7),
      parcelado: true,
      totalParcelas,
      parcelaAtual: i + 1,
      grupoParcelamento,
      // Apenas a 1ª parcela mantém status original; as demais nascem pendentes
      status: i === 0 ? transacaoBase.status : 'pendente',
    };
    // Parcelas 2+ não têm dataPagamento
    if (i > 0) delete parcela.dataPagamento;

    const salva = await salvarTransacao(parcela);
    transacoes.push(salva);

    // Avança o vencimento em 1 mês para a próxima parcela
    dataVencimentoAtual = avancarDataRecorrencia(dataVencimentoAtual, 'mensal');
  }

  return transacoes;
}

export async function salvarTransacoesRecorrentes(
  transacaoBase: Omit<Transacao, 'id' | 'criadoEm' | 'atualizadoEm'>,
  frequencia: FrequenciaRecorrencia,
  quantidade: number
): Promise<Transacao[]> {
  const { avancarDataRecorrencia } = await import('@/lib/sorting');
  const grupoRecorrencia = Date.now().toString();
  const transacoes: Transacao[] = [];
  
  let currentData = transacaoBase.data;
  if (currentData.includes('/')) {
    const p = currentData.split('/');
    if (p.length === 3) currentData = `${p[2]}-${p[1]}-${p[0]}`;
  }
  
  for (let i = 0; i < quantidade; i++) {
    const id = gerarId();
    const nova: Omit<Transacao, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      ...transacaoBase,
      data: currentData,
      dataCompetencia: currentData.substring(0, 7),
      recorrente: true, frequenciaRecorrencia: frequencia,
      quantidadeRecorrencias: quantidade, grupoRecorrencia,
      parcelaAtual: i + 1,
      // A REGRA DE OURO: Apenas a primeira pode ser paga, as demais nascem pendentes sempre.
      status: i === 0 ? transacaoBase.status : 'pendente'
    };
    
    if (transacaoBase.dataVencimento) {
       const diasDiff = new Date(transacaoBase.dataVencimento).getTime() - new Date(transacaoBase.data).getTime();
       const dataVencimentoDate = new Date(new Date(currentData).getTime() + diasDiff);
       nova.dataVencimento = dataVencimentoDate.toISOString().split('T')[0];
    }
    if (transacaoBase.dataLancamento) {
       const diasDiff2 = new Date(transacaoBase.dataLancamento).getTime() - new Date(transacaoBase.data).getTime();
       const dataLancamentoDate = new Date(new Date(currentData).getTime() + diasDiff2);
       nova.dataLancamento = dataLancamentoDate.toISOString().split('T')[0];
    }

    // Salvar transação reaproveitando a lógica atômica do salvarTransacao base
    const salva = await salvarTransacao({ ...nova, id } as Transacao);
    transacoes.push(salva);
    
    currentData = avancarDataRecorrencia(currentData, frequencia);
  }
  return transacoes;
}

// ─── CONTAS ───────────────────────────────────────────────────────────────────
export async function getContas(): Promise<Conta[]> { 
  const contas = await getAll<Conta>('contas');
  return contas;
}
export async function salvarConta(c: Conta): Promise<void> {
  const id = c.id || gerarId();
  await upsert('contas', id, { ...c, id });
}
export async function deletarConta(id: string): Promise<void> { await remove('contas', id); }

export async function ajustarSaldoDirectly(contaId: string, novoSaldo: number): Promise<void> {
  if (!isBrowser() || !contaId) return;
  await updateDoc(doc(getDb(), getCollectionPath('contas'), contaId), { saldo: novoSaldo });
}

// ─── CARTÕES ──────────────────────────────────────────────────────────────────
export async function getCartoes(): Promise<Cartao[]> { return getAll<Cartao>('cartoes'); }
export async function salvarCartao(c: Cartao): Promise<void> {
  const id = c.id || gerarId();
  await upsert('cartoes', id, { ...c, id });
  if (c.dataVencimento) {
    await sincronizarVencimentosCartao(id, c.dataVencimento);
  }
}
export async function deletarCartao(id: string): Promise<void> {
  const faturas = await getFaturasByCartao(id);
  for (const f of faturas) {
    await remove('faturas', f.id);
  }
  await remove('cartoes', id);
}

// ─── FATURAS ──────────────────────────────────────────────────────────────────
export async function getFaturas(): Promise<Fatura[]> { return getAll<Fatura>('faturas'); }

export async function getFaturasByCartao(cartaoId: string): Promise<Fatura[]> {
  if (!isBrowser()) return [];
  const snap = await getDocs(query(collection(getDb(), getCollectionPath('faturas')), where('cartaoId', '==', cartaoId)));
  return snap.docs.map(d => docToObj<Fatura>(d));
}

export async function getFaturaAberta(cartaoId: string, mesReferencia: string): Promise<Fatura | undefined> {
  if (!isBrowser()) return undefined;
  const snap = await getDocs(
    query(collection(getDb(), getCollectionPath('faturas')), where('cartaoId', '==', cartaoId), where('mesReferencia', '==', mesReferencia))
  );
  if (snap.empty) return undefined;
  return docToObj<Fatura>(snap.docs[0]);
}

export async function salvarFatura(fatura: Fatura): Promise<void> {
  await upsert('faturas', fatura.id, fatura);
}

export async function atualizarVencimentoFatura(faturaId: string, novaDataVencimento: string): Promise<void> {
  if (!isBrowser()) return;
  const snap = await getDoc(doc(getDb(), getCollectionPath('faturas'), faturaId));
  if (snap.exists()) {
    const fatura = snap.data() as Fatura;
    fatura.dataVencimento = novaDataVencimento;
    await setDoc(doc(getDb(), getCollectionPath('faturas'), faturaId), fatura, { merge: true });
  }
}

export async function sincronizarVencimentosCartao(cartaoId: string, novoDiaVencimento: number): Promise<void> {
  if (!isBrowser()) return;
  const faturas = await getFaturas();
  const faturasCartao = faturas.filter(f => f.cartaoId === cartaoId && f.status !== 'paga');
  for (const fat of faturasCartao) {
    if (fat.dataVencimento) {
      const p = fat.dataVencimento.split('-');
      if (p.length === 3) {
        const diaStr = String(novoDiaVencimento).padStart(2, '0');
        const novaData = `${p[0]}-${p[1]}-${diaStr}`;
        if (fat.dataVencimento !== novaData) {
          fat.dataVencimento = novaData;
          await setDoc(doc(getDb(), getCollectionPath('faturas'), fat.id), fat, { merge: true });
        }
      }
    }
  }
}

export async function vincularTransacaoFatura(
  transacaoId: string, cartaoId: string, cartaoNome: string, cartaoCor: string,
  data: string, valor: number, _diaFechamento: number, _diaVencimento: number,
  dataVencimentoManual?: string
) {
  let strFechamento = '';
  let strVencimento = '';
  let mesRef = '';

  if (dataVencimentoManual) {
    strVencimento = dataVencimentoManual;
    const [anoStr, mesStr] = dataVencimentoManual.split('-');
    mesRef = `${anoStr}-${mesStr}`;
    const d = new Date(dataVencimentoManual + 'T12:00:00Z');
    d.setDate(d.getDate() - 7);
    strFechamento = d.toISOString().split('T')[0];
  } else {
    // ⚠️ REGRA DE OURO IMPLEMENTADA ⚠️
    const ciclo = calcularCicloFatura(data, _diaFechamento, _diaVencimento);
    mesRef = ciclo.mesReferencia;
    strFechamento = ciclo.dataFechamento;
    strVencimento = ciclo.dataVencimento;
  }

  let fatura = await getFaturaAberta(cartaoId, mesRef);
  if (!fatura) {
    // Nova fatura — começa com valorTotal = valor da transação atual
    fatura = {
      id: gerarId(), cartaoId, cartaoNome, cartaoCor, mesReferencia: mesRef,
      dataFechamento: strFechamento, dataVencimento: strVencimento, valorTotal: valor,
      status: 'aberta', transacaoIds: [transacaoId], pagamentos: []
    };
  } else {
    // Fatura existente — adiciona a transação se ainda não estiver na lista
    if (!fatura.transacaoIds.includes(transacaoId)) {
      fatura.transacaoIds.push(transacaoId);
    }
    // ⚠️ BLINDAGEM: Recalcula o total SEMPRE a partir dos lançamentos reais do banco
    let totalRecalculado = 0;
    for (const tid of fatura.transacaoIds) {
      if (tid === transacaoId) {
        totalRecalculado += Math.abs(valor);
      } else {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const tSnap = await getDoc(doc(getDb(), getCollectionPath('transacoes'), tid));
          if (tSnap.exists()) totalRecalculado += Math.abs(tSnap.data().valor || 0);
        } catch (e) { /* ignora erros de leitura individual */ }
      }
    }
    fatura.valorTotal = totalRecalculado;
  }
  await salvarFatura(fatura);
  
  // PREVINE LOOP INFINITO: passamos __skipFaturaRelink para que atualizarTransacao não chame vincular novamente
  await atualizarTransacao(transacaoId, { faturaId: fatura.id, __oldCartaoId: cartaoId, __skipFaturaRelink: true } as any);
}

export async function pagarFatura(
  faturaId: string, valorPago: number, contaId: string, contaNome: string,
  formaPagamento: FormaPagamento, dataPagamento: string, juros: number = 0,
  categoriaId: string = 'financeiro', categoriaNome: string = 'Pagamento de Fatura',
  centroCustoId?: string, centroCustoNome?: string
) {
  if (!isBrowser()) return;

  const totalDebito = valorPago + juros;

  // ─── 1. VERIFICAÇÃO DE SALDO OBRIGATÓRIA ────────────────────────────────────
  // Lança erro se a conta não tiver saldo suficiente. O modal vai capturar e exibir ao usuário.
  await verificarSaldoDisponivel(contaId, totalDebito);

  // ─── 2. BUSCAR FATURA ────────────────────────────────────────────────────────
  const { getDoc, doc } = await import('firebase/firestore');
  const db = getDb();
  const faturaRef = doc(db, getCollectionPath('faturas'), faturaId);
  const faturaSnap = await getDoc(faturaRef);

  let fatura: any = faturaSnap.exists() ? { id: faturaId, ...faturaSnap.data() } : null;
  if (!fatura) {
    const todasFaturas = await getFaturas();
    fatura = todasFaturas.find((f: any) => f.id === faturaId);
  }
  if (!fatura) throw new Error('Fatura não encontrada. Recarregue a página e tente novamente.');

  // ─── 3. REGISTRAR PAGAMENTO NA FATURA ───────────────────────────────────────
  if (!fatura.pagamentos) fatura.pagamentos = [];
  fatura.pagamentos.push({
    id: gerarId(),
    data: dataPagamento,
    valor: valorPago,
    juros: juros,
    contaId,
    contaNome,
    formaPagamento
  });

  const totalPago = fatura.pagamentos.reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
  fatura.status = totalPago >= fatura.valorTotal ? 'paga' : 'parcial';
  fatura.dataPagamento = dataPagamento;
  fatura.contaPagamentoId = contaId;
  fatura.contaPagamentoNome = contaNome;
  await salvarFatura(fatura);

  // ─── 4. MARCAR LANÇAMENTOS VINCULADOS COMO PAGOS + CRIAR DÉBITOS INDIVIDUAIS ─
  // Cada lançamento de cartão é marcado como pago (updateDoc) e um débito bancário
  // individual é criado para cada um (salvarTransacao com formaPagamento != cartao_credito).
  const { updateDoc } = await import('firebase/firestore');
  const dataPagamentoComHora = `${dataPagamento}T${new Date().toTimeString().slice(0, 8)}`;

  if (fatura.transacaoIds && fatura.transacaoIds.length > 0) {
    for (const tid of fatura.transacaoIds) {
      try {
        const tRef = doc(db, getCollectionPath('transacoes'), tid);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          const tData = tSnap.data() as any;

          // 4a. Marcar o lançamento CC original como pago (não afeta saldo bancário)
          await updateDoc(tRef, {
            status: 'pago',
            dataPagamento: dataPagamentoComHora,
            contaPagamentoId: contaId,
            contaPagamentoNome: contaNome,
            atualizadoEm: new Date().toISOString()
          });

          // 4b. Criar lançamento de débito na conta bancária para este item
          await salvarTransacao({
            tipo: 'despesa',
            descricao: `${tData.descricao || 'Lançamento'} — Pago via ${contaNome}`,
            valor: Math.abs(tData.valor || 0),
            data: dataPagamento,
            dataCompetencia: dataPagamento.substring(0, 7),
            status: 'pago',
            dataPagamento: dataPagamentoComHora,
            contaId,
            contaNome,
            formaPagamento,
            categoriaId: tData.categoriaId || categoriaId,
            categoriaNome: tData.categoriaNome || categoriaNome,
            categoriaIcone: tData.categoriaIcone || 'CreditCard',
            categoriaCor: tData.categoriaCor || '#8b5cf6',
            centroCustoId: tData.centroCustoId || centroCustoId || '',
            centroCustoNome: tData.centroCustoNome || centroCustoNome || '',
            observacoes: `Baixa ref. fatura ${fatura.cartaoNome} (${fatura.mesReferencia}) — Debitado de ${contaNome}`
          });
        }
      } catch (e) {
        console.warn('[pagarFatura] Erro ao processar transação:', tid, e);
      }
    }
  }

  // ─── 5. CRIAR LANÇAMENTO SEPARADO PARA JUROS/MULTA E VINCULAR À FATURA ────────
  if (juros > 0) {
    const jurosId = gerarId();
    await salvarTransacao({
      id: jurosId,
      tipo: 'despesa',
      descricao: `Juros/Multa — Fatura ${fatura.cartaoNome} (${fatura.mesReferencia}) — Pago via ${contaNome}`,
      valor: juros,
      data: dataPagamento,
      dataCompetencia: dataPagamento.substring(0, 7),
      status: 'pago',
      dataPagamento: dataPagamentoComHora,
      contaId,
      contaNome,
      formaPagamento,
      categoriaId,
      categoriaNome,
      categoriaIcone: 'CreditCard',
      categoriaCor: '#8b5cf6',
      centroCustoId: centroCustoId || '',
      centroCustoNome: centroCustoNome || '',
      faturaId: faturaId, // Vincula a transação à fatura
      cartaoId: fatura.cartaoId,
      cartaoNome: fatura.cartaoNome,
      observacoes: `Juros/multa ref. fatura ${fatura.cartaoNome} — mês ${fatura.mesReferencia}. Debitado de ${contaNome}.`
    } as any);

    // Adiciona o Juros na lista de lançamentos da fatura para aparecer não modal
    if (!fatura.transacaoIds.includes(jurosId)) {
      fatura.transacaoIds.push(jurosId);
      // Incrementamos o valor total da fatura para refletir que teve juros?
      // O usuário disse: "AQUI NO HISTORICO DOS LANÇAMENTOS DA FATURA DEVE ESPECIFICAR EM UMA LINHA O VALOR DOS JUROS"
      fatura.valorTotal += juros;
      await salvarFatura(fatura);
    }
  }

  // ─── 6. RESTAURAR LIMITE DO CARTÃO ──────────────────────────────────────────
  try {
    const cartoes = await getCartoes();
    const cartao = cartoes.find(c => c.id === fatura.cartaoId);
    if (cartao && cartao.limiteDisponivel !== undefined) {
      cartao.limiteDisponivel += valorPago;
      await salvarCartao(cartao);
    }
  } catch (e) {
    console.warn('[pagarFatura] Erro ao restaurar limite do cartão:', e);
  }
}

export async function deletarFatura(id: string) {
  if (!isBrowser()) return;
  const db = getDb();
  
  try {
    const faturaSnap = await getDoc(doc(db, getCollectionPath('faturas'), id));
    if (faturaSnap.exists()) {
       const fatData = faturaSnap.data() as Fatura;
       const tIds = fatData.transacaoIds || [];
       for (const tid of tIds) {
          // Isso deletar a transao, remover da fatura (que j vamos deletar de qlq forma) e RESTAURAR O LIMITE!
          await deletarTransacao(tid);
       }
    }
  } catch(e) {
    console.warn("Failed to delete fatura transactions", e);
  }

  await remove('faturas', id);
}
export async function deletarPagamentoFatura(_id: string, _pgId: string) {}

export async function reabrirFatura(faturaId: string): Promise<void> {
  if (!isBrowser()) return;
  const { getDoc, doc, updateDoc, deleteDoc, getDocs, collection, query, where } = await import('firebase/firestore');
  const db = getDb();
  
  const faturaRef = doc(db, getCollectionPath('faturas'), faturaId);
  const faturaSnap = await getDoc(faturaRef);
  if (!faturaSnap.exists()) return;
  const fatura = faturaSnap.data() as Fatura;

  // 1. Resetar as transações do cartão vinculadas para "a_pagar" (não deleta, apenas atualiza)
  if (fatura.transacaoIds && fatura.transacaoIds.length > 0) {
    for (const tid of fatura.transacaoIds) {
      try {
        const tRef = doc(db, getCollectionPath('transacoes'), tid);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          await updateDoc(tRef, {
            status: 'a_pagar',
            dataPagamento: '',
            contaPagamentoId: '',
            contaPagamentoNome: '',
            atualizadoEm: new Date().toISOString()
          });
        }
      } catch (e) { console.warn('[reabrirFatura] Erro ao resetar transação:', tid, e); }
    }
  }

  // 2. Localizar e deletar os lançamentos de baixa bancária que foram gerados para esta fatura.
  const transacoesRef = collection(db, getCollectionPath('transacoes'));
  const snapAll = await getDocs(transacoesRef);
  
  let valorPagoAnteriormente = 0;

  for (const tDoc of snapAll.docs) {
    const tData = tDoc.data() as Transacao;
    
    // Verifica se é um lançamento gerado para dar baixa individual de algum item (debita da conta bancária)
    if (tData.status === 'pago' && tData.formaPagamento !== 'cartao_credito' && tData.observacoes?.includes(fatura.mesReferencia) && tData.observacoes?.includes(fatura.cartaoNome) && !tData.descricao.startsWith('Juros/Multa')) {
      valorPagoAnteriormente += Math.abs(tData.valor || 0);
      try {
        await deletarTransacao(tDoc.id); 
      } catch(e) {}
    } 
    // Verifica se é o lançamento de juros/multa gerado na hora de pagar a fatura
    else if (tData.status === 'pago' && tData.formaPagamento !== 'cartao_credito' && tData.descricao.startsWith('Juros/Multa') && tData.descricao.includes(fatura.mesReferencia) && tData.descricao.includes(fatura.cartaoNome)) {
      try {
        await deletarTransacao(tDoc.id); // Estorna juros
      } catch(e) {}
    }
    // Verifica se é o lançamento total antigo (Demonstrativo) que foi criado e que gera duplicidade
    else if ((tData.descricao.includes('[DEMONSTRATIVO]') || tData.descricao === `Fatura ${fatura.cartaoNome} (${fatura.mesReferencia})`) && tData.descricao.includes(fatura.mesReferencia)) {
      try {
        if (tData.formaPagamento !== 'cartao_credito') {
           // Se for pix/debito, temos que estornar o saldo bancário
           await deletarTransacao(tDoc.id);
        } else {
           await deleteDoc(doc(db, getCollectionPath('transacoes'), tDoc.id));
        }
      } catch(e) {}
    }
  }

  // 3. Restaurar limite do cartão (subtrair o valor que havia sido somado não pagamento)
  // Como deletarTransacao() não restaura limite (pois não é despesa não CC), fazemos aqui.
  if (valorPagoAnteriormente > 0) {
     try {
       const cartoes = await getCartoes();
       const cartao = cartoes.find(c => c.id === fatura.cartaoId);
       if (cartao && cartao.limiteDisponivel !== undefined) {
         // Subtrai o limite que havia sido re-disponibilizado erroneamente
         // (Isso assume que o valor das baixas de pagamento reflete o total da fatura sem juros)
         // Mas como pode ser bagunçado, vamos recalcular o limite disponivel do zero depois, mas por hora, subtraimos o que achamos
         cartao.limiteDisponivel = Math.max(0, cartao.limiteDisponivel - valorPagoAnteriormente);
         await salvarCartao(cartao);
       }
     } catch (e) {}
  }

  // 4. Resetar status da fatura
  await updateDoc(faturaRef, {
    status: 'aberta',
    pagamentos: [],
    dataPagamento: '',
    contaPagamentoId: '',
    contaPagamentoNome: ''
  });
}

// ─── CATEGORIAS ───────────────────────────────────────────────────────────────
export async function getCategorias(): Promise<Categoria[]> { return getAll<Categoria>('categorias'); }
export async function salvarCategoria(c: Categoria): Promise<void> { 
  const todos = await getCategorias();
  if (todos.find(x => x.nome.toLowerCase() === c.nome.toLowerCase() && x.id !== c.id)) {
    throw new Error(`Categoria '${c.nome}' já existe.`);
  }
  await upsert('categorias', c.id, c); 
}
export async function deletarCategoria(id: string): Promise<void> { await remove('categorias', id); }

// ─── CENTROS DE CUSTO ─────────────────────────────────────────────────────────
export async function getCentrosCusto(): Promise<CentroCusto[]> { return getAll<CentroCusto>('centrosCusto'); }
export async function salvarCentroCusto(c: CentroCusto): Promise<void> { 
  const todos = await getCentrosCusto();
  if (todos.find(x => x.nome.toLowerCase() === c.nome.toLowerCase() && x.id !== c.id)) {
    throw new Error(`Centro de Custo '${c.nome}' já existe.`);
  }
  await upsert('centrosCusto', c.id, c); 
}
export async function deletarCentroCusto(id: string): Promise<void> { await remove('centrosCusto', id); }

// ─── FORNECEDORES & CLIENTES ──────────────────────────────────────────────────
export async function getFornecedores(): Promise<Fornecedor[]> { return getAll<Fornecedor>('fornecedores'); }
export async function salvarFornecedor(f: Fornecedor): Promise<void> { 
  const todos = await getFornecedores();
  if (todos.find(x => x.nome.toLowerCase() === f.nome.toLowerCase() && x.id !== f.id)) {
    throw new Error(`Fornecedor '${f.nome}' já existe.`);
  }
  await upsert('fornecedores', f.id, f); 
}
export async function deletarFornecedor(id: string): Promise<void> { await remove('fornecedores', id); }
export async function getClientes(): Promise<Cliente[]> { return getAll<Cliente>('clientes'); }
export async function salvarCliente(c: Cliente): Promise<void> { 
  const todos = await getClientes();
  if (todos.find(x => x.nome.toLowerCase() === c.nome.toLowerCase() && x.id !== c.id)) {
    throw new Error(`Cliente '${c.nome}' já existe.`);
  }
  await upsert('clientes', c.id, c); 
}
export async function deletarCliente(id: string): Promise<void> { await remove('clientes', id); }

// ─── METAS & ORÇAMENTOS ───────────────────────────────────────────────────────
export async function getMetas(): Promise<Meta[]> { return getAll<Meta>('metas'); }
export async function salvarMeta(m: Meta): Promise<void> { await upsert('metas', m.id, m); }
export async function getOrcamentos(): Promise<Orcamento[]> { return getAll<Orcamento>('orcamentos'); }
export async function salvarOrcamento(o: Orcamento): Promise<void> { await upsert('orcamentos', o.id, o); }

// ─── IA ───────────────────────────────────────────────────────────────────────
export async function getHistoricoIA(): Promise<HistoricoIA[]> { return getAll<HistoricoIA>('historicoIA'); }
export async function salvarHistoricoIA(h: HistoricoIA): Promise<void> {
  await upsert('historicoIA', gerarId(), h);
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
export async function getConfiguracoes(uid: string = 'app'): Promise<ConfiguracaoApp> {
  const defaults: ConfiguracaoApp = {
    nomeUsuario: 'Usuário', moeda: 'BRL', provedorIA: 'offline',
    notificacoesAtivas: true, backupAutomatico: true, tema: 'dark'
  };
  if (!isBrowser()) return defaults;
  try {
    const snapGeral = await getDoc(doc(getDb(), getCollectionPath('config'), 'geral'));
    if (snapGeral.exists()) return snapGeral.data() as ConfiguracaoApp;

    const snapUid = await getDoc(doc(getDb(), getCollectionPath('config'), uid));
    if (snapUid.exists()) return snapUid.data() as ConfiguracaoApp;
  } catch {}
  return defaults;
}

export async function salvarConfiguracoes(c: ConfiguracaoApp, uid: string = 'app'): Promise<void> {
  if (!isBrowser()) return;
  await setDoc(doc(getDb(), getCollectionPath('config'), 'geral'), c, { merge: true });
  await setDoc(doc(getDb(), getCollectionPath('config'), uid), c, { merge: true });
}

// ─── ALERTAS ─────────────────────────────────────────────────────────────────
export async function getAlertas(): Promise<AlertaFinanceiro[]> { return getAll<AlertaFinanceiro>('alertas'); }
export async function marcarAlertaLido(id: string): Promise<void> {
  if (!isBrowser()) return;
  await updateDoc(doc(getDb(), getCollectionPath('alertas'), id), { lido: true });
}

// ─── SEED COMPLETO ────────────────────────────────────────────────────────────
export async function seedDadosPadraoSeVazio() {
  if (!isBrowser()) return false;
  try {
    const cats = await getCategorias();
    if (cats.length > 0) return true; // Já tem dados, não faz seed
    
    console.log('Iniciando seed de dados...');
    
    // Categorias
    for (const cat of CATEGORIAS_PADRAO) {
      await salvarCategoria(cat);
    }
    
    // Centros de Custo
    for (const cc of CENTROS_CUSTO_PADRAO) {
      await salvarCentroCusto(cc);
    }
    // Não cadastramos mais Contas e Cartões padrão para que a licença nasça 100% limpa.
    console.log('Seed completo com sucesso!');
    return true;
  } catch (e) {
    console.error('Erro não seed:', e);
    return false;
  }
}

export async function garantirCorrecaoMercadoPago(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const docRef = doc(getDb(), getCollectionPath('contas'), 'mercadopago');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        id: 'mercadopago', nome: 'Mercado Pago', tipo: 'corrente', saldo: 0, cor: '#00bcff', icone: 'HandCoins', banco: 'Mercado Pago', ativo: true
      });
    }

    // Corrigir dados do Cartão Mercado Pago (Vence dia 4, fecha dia 29) e sincronizar faturas
    const docCartaoRef = doc(getDb(), getCollectionPath('cartoes'), 'mercadopago_cartao');
    const snapCartao = await getDoc(docCartaoRef);
    if (snapCartao.exists()) {
      await updateDoc(docCartaoRef, { dataVencimento: 4, dataFechamento: 29 });
    }
    await sincronizarVencimentosCartao('mercadopago_cartao', 4);

    // Deleta transações fictícias de teste (Mercado Livre, Assinatura Meli+)
    const transSnap = await getDocs(collection(getDb(), getCollectionPath('transacoes')));
    for (const d of transSnap.docs) {
      const data = d.data() as Transacao;
      if (data.descricao === 'Mercado Livre' || data.descricao === 'Assinatura Meli+') {
        await deleteDoc(doc(getDb(), getCollectionPath('transacoes'), d.id));
      }
    }
  } catch (e) {
    console.error("Erro ao garantir correção do Mercado Pago:", e);
  }
}


export async function limparCategoriasDuplicadas() {
  if (!isBrowser()) return;
  const cats = await getCategorias();
  const seenCats = new Set<string>();
  for (const c of cats) {
    const nome = c.nome.toLowerCase().trim();
    if (seenCats.has(nome)) await deletarCategoria(c.id);
    else seenCats.add(nome);
  }

  const centros = await getCentrosCusto();
  const seenCentros = new Set<string>();
  for (const c of centros) {
    const nome = c.nome.toLowerCase().trim();
    if (seenCentros.has(nome)) await remove('centrosCusto', c.id);
    else seenCentros.add(nome);
  }
}

export async function sincronizarFaturasPendentes() {
  if (!isBrowser()) return;
  const transacoes = await getTransacoes();
  const cartoes = await getCartoes();
  const faturas = await getFaturas();
  
  for (const t of transacoes) {
    if (t.formaPagamento === 'cartao_credito' && t.cartaoId && t.tipo === 'despesa') {
      const faturaExists = t.faturaId ? faturas.some(f => f.id === t.faturaId) : false;
      if (!faturaExists || !t.faturaId) {
        const cartao = cartoes.find(c => c.id === t.cartaoId);
        if (cartao) {
          await vincularTransacaoFatura(
            t.id, cartao.id, cartao.nome, cartao.cor || '#3b82f6',
            t.dataLancamento || t.data, t.valor,
            cartao.dataFechamento || 1, cartao.dataVencimento || 10
          );
        }
      }
    }
  }
}