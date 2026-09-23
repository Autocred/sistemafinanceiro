import { addMonths, addDays, addWeeks, addYears, format, parseISO, isLastDayOfMonth, endOfMonth, setDate, getDate } from 'date-fns';

export interface ISortableItem {
  dataVencimento?: string;
  dataLancamento?: string;
  data?: string; // fallback
  timestamp?: string; // Para movimentacoes precisas se houver
}

// Função auxiliar para garantir formato YYYY-MM-DD na comparação
function normalizeDateStr(d: string): string {
  if (!d) return '';
  if (d.includes('/')) {
    const p = d.split('/');
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  } else if (d.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const p = d.split('-');
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  }
  return d;
}

/**
 * Ordenação obrigatória para painéis de Vencimento e Contas a Pagar
 * ASC: O que vence primeiro fica em cima.
 */
export function ordenarVencimentosAsc<T extends ISortableItem>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const dataA = normalizeDateStr(a.dataVencimento || a.data || '');
    const dataB = normalizeDateStr(b.dataVencimento || b.data || '');
    if (!dataA) return 1;
    if (!dataB) return -1;
    return dataA.localeCompare(dataB); // Agora seguro
  });
}

/**
 * Ordenação obrigatória para Extrato e Histórico de Movimentações
 * DESC: A movimentação mais recente fica em cima.
 */
export function ordenarMovimentacoesDesc<T extends ISortableItem>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    // 1. dataPagamento se existir, senao timestamp, senao dataLancamento, senao data
    const aVal = (a as any).dataPagamento || a.timestamp || a.dataLancamento || a.data || '';
    const bVal = (b as any).dataPagamento || b.timestamp || b.dataLancamento || b.data || '';
    const dataA = normalizeDateStr(aVal);
    const dataB = normalizeDateStr(bVal);
    if (!dataA) return 1;
    if (!dataB) return -1;
    return dataB.localeCompare(dataA); // Invertido para DESC
  });
}

/**
 * Avança meses respeitando a lógica bancária de fim de mês.
 */
export function addBankMonths(dataIso: string, monthsToAdd: number): string {
  const dataObj = parseISO(dataIso);
  let newDate = addMonths(dataObj, monthsToAdd);
  
  if (isLastDayOfMonth(dataObj)) {
      newDate = endOfMonth(newDate);
  }

  return format(newDate, 'yyyy-MM-dd');
}

export function avancarDataRecorrencia(dataIso: string, frequencia: string): string {
    const dataObj = parseISO(dataIso);
    let newDate = dataObj;
    
    switch(frequencia) {
        case 'diario':
            newDate = addDays(dataObj, 1);
            break;
        case 'semanal':
            newDate = addDays(dataObj, 7);
            break;
        case 'quinzenal':
            newDate = addDays(dataObj, 15);
            break;
        case 'mensal':
            return addBankMonths(dataIso, 1);
        case 'bimestral':
            return addBankMonths(dataIso, 2);
        case 'trimestral':
            return addBankMonths(dataIso, 3);
        case 'semestral':
            return addBankMonths(dataIso, 6);
        case 'anual':
            return addBankMonths(dataIso, 12);
        default:
            return addBankMonths(dataIso, 1);
    }
    
    return format(newDate, 'yyyy-MM-dd');
}
