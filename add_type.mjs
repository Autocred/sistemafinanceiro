import fs from 'fs';
let c = fs.readFileSync('src/lib/types.ts', 'utf8');

if (!c.includes('export interface MetaFinanceira')) {
  c += `
export interface MetaFinanceira {
  id: string;
  nome: string;
  descricao?: string;
  tipo: 'receita' | 'despesa';
  valorAlvo: number;
  dataInicio: string; // YYYY-MM-DD
  dataTermino: string; // YYYY-MM-DD
  categoria?: string; 
  centroDeCusto?: string; 
  frequencia: 'unica' | 'mensal' | 'anual';
  status: 'ativa' | 'concluida' | 'cancelada';
  alertaPercentual?: number; 
  padraoNome?: string;
  padraoDescricao?: string;
  createdAt: number;
}
`;
  fs.writeFileSync('src/lib/types.ts', c);
  console.log('Added MetaFinanceira to types.ts');
}
