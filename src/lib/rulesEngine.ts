import { RegraAutomacao, Transacao } from './types';
import { getDoc, setDoc, doc, collection, getDocs } from 'firebase/firestore';
import { getDb } from './firebase';
import { isBrowser, gerarId } from './storage';

/**
 * MOTOR DE REGRAS DE AUTOMAÇÃO E CLASSIFICAÇÃO AUTOMÁTICA
 */

export const REGRAS_PADRAO: RegraAutomacao[] = [
  { id: 'r1', nome: 'Energia Elétrica -> Moradia', termoBusca: 'energia', campoBusca: 'descricao', categoriaId: 'moradia', categoriaNome: 'Moradia', ativo: true },
  { id: 'r2', nome: 'Uber / 99 -> Transporte', termoBusca: 'uber', campoBusca: 'descricao', categoriaId: 'transporte', categoriaNome: 'Transporte', ativo: true },
  { id: 'r3', nome: 'Posto -> Combustível', termoBusca: 'posto', campoBusca: 'descricao', categoriaId: 'combustivel', categoriaNome: 'Combustível', ativo: true },
  { id: 'r4', nome: 'Mercado / Supermercado', termoBusca: 'mercado', campoBusca: 'descricao', categoriaId: 'mercado', categoriaNome: 'Mercado', ativo: true },
  { id: 'r5', nome: 'Alçadas > R$ 5.000 Exigem Aprovação', termoBusca: '', campoBusca: 'descricao', categoriaId: '', categoriaNome: '', ativo: true, requerAprovacao: true, limiteValorAprovacao: 5000 }
];

export async function getRegrasAutomacao(): Promise<RegraAutomacao[]> {
  if (!isBrowser()) return REGRAS_PADRAO;
  try {
    const snap = await getDocs(collection(getDb(), 'regras_automacao'));
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as RegraAutomacao);
    }
  } catch {}
  return REGRAS_PADRAO;
}

export async function salvarRegraAutomacao(regra: RegraAutomacao): Promise<void> {
  if (!isBrowser()) return;
  await setDoc(doc(getDb(), 'regras_automacao', regra.id), regra, { merge: true });
}

export function aplicarRegrasAutomacao(
  transacao: Partial<Transacao>,
  regras: RegraAutomacao[] = REGRAS_PADRAO
): Partial<Transacao> {
  const t = { ...transacao };
  const desc = (t.descricao || '').toLowerCase();
  const forn = (t.fornecedorNome || '').toLowerCase();

  for (const r of regras) {
    if (!r.ativo) continue;

    const termo = r.termoBusca.toLowerCase().trim();
    if (termo) {
      const matchDesc = r.campoBusca === 'descricao' && desc.includes(termo);
      const matchForn = r.campoBusca === 'fornecedor' && forn.includes(termo);

      if (matchDesc || matchForn) {
        if (r.categoriaId) {
          t.categoriaId = r.categoriaId;
          t.categoriaNome = r.categoriaNome;
        }
        if (r.centroCustoId) {
          t.centroCustoId = r.centroCustoId;
          t.centroCustoNome = r.centroCustoNome;
        }
        if (r.contaId) {
          t.contaId = r.contaId;
        }
      }
    }
  }

  return t;
}
