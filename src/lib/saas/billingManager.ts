import { collection, doc, getDocs, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { gerarId } from '@/lib/storage';
import { LicencaMaster } from './tenantManager';

export interface FaturaSaaS {
  id: string;
  tenantId: string;
  clienteNome: string;
  dominio: string;
  valor: number;
  dataVencimento: string; // yyyy-MM-dd
  dataPagamento?: string; // yyyy-MM-dd
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelada';
  descricao?: string;
  dataCriacao: Date;
}

/**
 * Obtém todas as faturas geradas no SaaS
 */
export async function getFaturasSaaS(): Promise<FaturaSaaS[]> {
  const db = getDb();
  const faturasRef = collection(db, 'admin_master_faturas');
  const q = query(faturasRef, orderBy('dataVencimento', 'desc'));
  const snap = await getDocs(q);
  
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      dataCriacao: data.dataCriacao?.toDate() || new Date()
    } as FaturaSaaS;
  });
}

/**
 * Cria uma nova fatura manual para um cliente
 */
export async function criarFaturaSaaS(
  faturaInfo: Omit<FaturaSaaS, 'id' | 'dataCriacao'>
): Promise<string> {
  const db = getDb();
  const id = gerarId();
  
  await setDoc(doc(db, 'admin_master_faturas', id), {
    ...faturaInfo,
    dataCriacao: serverTimestamp()
  });

  return id;
}

/**
 * Atualiza o status de uma fatura
 */
export async function atualizarStatusFaturaSaaS(
  faturaId: string, 
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelada',
  dataPagamento?: string
) {
  
  const db = getDb();
  await setDoc(doc(db, 'admin_master_faturas', faturaId), {
    status,
    dataPagamento: dataPagamento || null,
    atualizadoEm: serverTimestamp()
  }, { merge: true });

  if (status === 'pago') {
    const { getDoc } = await import('firebase/firestore');
    const faturaSnap = await getDoc(doc(db, 'admin_master_faturas', faturaId));
    if (faturaSnap.exists()) {
      const faturaData = faturaSnap.data();
      if (faturaData.tenantId && faturaData.mesesLiberacao) {
        const licencaRef = doc(db, 'admin_master_licencas', faturaData.tenantId);
        const licencaSnap = await getDoc(licencaRef);
        if (licencaSnap.exists()) {
          const licenca = licencaSnap.data();
          let currentVenc = licenca.dataVencimento ? new Date(licenca.dataVencimento.seconds ? licenca.dataVencimento.toDate() : licenca.dataVencimento) : new Date();
          
          if (licenca.status === 'pendente' || licenca.status === 'suspensa' || licenca.status === 'inadimplente') {
             // If they were blocked, we start the validity from today to give them the full time
             currentVenc = new Date();
          }

          currentVenc.setMonth(currentVenc.getMonth() + faturaData.mesesLiberacao);
          
          await setDoc(licencaRef, {
            status: 'ativa',
            dataVencimento: currentVenc
          }, { merge: true });

          // Sync the 'tenants' doc (read by login flow)
          const tenantRef = doc(db, 'tenants', faturaData.tenantId);
          await setDoc(tenantRef, {
            status: 'ativa',
            dataVencimento: currentVenc
          }, { merge: true });
        }
      }
    }
  }

}
