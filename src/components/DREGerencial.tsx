import React, { useMemo } from 'react';
import { Transacao } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';

interface DREGerencialProps {
  transacoes: Transacao[];
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
}

export function DREGerencial({ transacoes, dataInicio, dataFim }: DREGerencialProps) {
  const dre = useMemo(() => {
    let receitaBruta = 0;
    let deducoes = 0; // impostos e devoluções
    let cpv = 0; // Custo de Produtos Vendidos (variável)
    let despesasOperacionais = 0; // Despesas Fixas

    transacoes.forEach(t => {
      // Os dados recebidos já estão filtrados pelo componente pai (Relatorios.tsx)
      // de acordo com as preferências do usuário (Competência/Vencimento ou Lançamento) e período.

      const valor = t.valor;

      if (t.tipo === 'receita') {
        receitaBruta += valor;
      } else if (t.tipo === 'despesa') {
        // Classificação inteligente baseada não nome da categoria (simples para exemplo)
        const cat = (t.categoriaNome || '').toLowerCase();
        if (cat.includes('imposto') || cat.includes('taxa')) {
          deducoes += valor;
        } else if (cat.includes('fornecedor') || cat.includes('matéria') || cat.includes('estoque') || cat.includes('mercadoria')) {
          cpv += valor;
        } else {
          despesasOperacionais += valor;
        }
      }
    });

    const receitaLiquida = receitaBruta - deducoes;
    const margemContribuicao = receitaLiquida - cpv;
    const ebitda = margemContribuicao - despesasOperacionais; // Simplificado

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      cpv,
      margemContribuicao,
      despesasOperacionais,
      ebitda,
      margemLucro: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0
    };
  }, [transacoes, dataInicio, dataFim]);

  const ItemDRE = ({ label, valor, isNegative = false, bold = false, isResult = false }: any) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
      borderBottom: isResult ? 'none' : '1px solid var(--border)',
      background: isResult ? 'var(--bg-secondary)' : 'transparent',
      borderRadius: isResult ? 8 : 0,
      fontWeight: bold || isResult ? 700 : 500,
      color: isResult ? 'var(--text-primary)' : 'var(--text-secondary)'
    }}>
      <span>{label}</span>
      <span style={{ color: isNegative ? '#ef4444' : isResult && valor > 0 ? '#10b981' : 'inherit' }}>
        {isNegative ? '-' : ''}{formatarMoeda(valor)}
      </span>
    </div>
  );

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>DRE Gerencial (P&L)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demonstração do Resultado do Exercício - Classificação Inteligente</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ItemDRE label="Receita Bruta de Vendas" valor={dre.receitaBruta} />
        <ItemDRE label="(-) Deduções e Impostos" valor={dre.deducoes} isNegative />
        <ItemDRE label="(=) Receita Líquida" valor={dre.receitaLiquida} bold isResult />
        
        <ItemDRE label="(-) Custos Variáveis (CPV/CMV)" valor={dre.cpv} isNegative />
        <ItemDRE label="(=) Margem de Contribuição" valor={dre.margemContribuicao} bold isResult />
        
        <ItemDRE label="(-) Despesas Operacionais (Fixas)" valor={dre.despesasOperacionais} isNegative />
        
        <div style={{ marginTop: 12 }}>
          <ItemDRE label="(=) EBITDA / Resultado Operacional" valor={dre.ebitda} bold isResult />
        </div>
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>Margem de Lucratividade:</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: dre.margemLucro >= 0 ? '#10b981' : '#ef4444' }}>
          {dre.margemLucro.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
