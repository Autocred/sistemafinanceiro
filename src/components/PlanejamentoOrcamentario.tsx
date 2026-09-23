import React, { useState, useEffect, useMemo } from 'react';
import { Transacao } from '@/lib/types';
import { formatarMoeda, subscribeTransacoes } from '@/lib/storage';
import { Calendar, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PlanejamentoOrcamentario() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodoAtual, setPeriodoAtual] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [periodoAnterior, setPeriodoAnterior] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const unsub = subscribeTransacoes(data => {
      setTransacoes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatPeriodo = (p: string) => {
    if (!p) return '';
    const [y, m] = p.split('-');
    return `${m}/${y}`;
  };

  const strMesAtual = formatPeriodo(periodoAtual);
  const strMesAnterior = formatPeriodo(periodoAnterior);

  // Cálculo DRE Real (Mês Atual vs Mês Anterior)
  const dre = useMemo(() => {
    const calcMes = (periodo: string) => {
      let receitaBruta = 0;
      let deducoes = 0;
      let cpv = 0;
      let despVendas = 0;
      let despOperacionais = 0;
      let outrasDespesas = 0;
      let outrasReceitas = 0;

      if (!periodo) return { receitaBruta, deducoes, receitaLiquida: 0, cpv, despVendas, margemContribuicao: 0, despOperacionais, ebitda: 0, outrasDespesas, outrasReceitas };

      const [anoStr, mesStr] = periodo.split('-');
      const ano = parseInt(anoStr);
      const mes = parseInt(mesStr);

      transacoes.forEach(t => {
        if (!t.dataVencimento) return;
        const [tAno, tMes] = t.dataVencimento.split('-');
        if (parseInt(tAno) !== ano || parseInt(tMes) !== mes) return;

        const valor = t.valor;
        if (t.tipo === 'receita') {
          receitaBruta += valor;
        } else {
          const cat = (t.categoriaNome || '').toLowerCase();
          if (cat.includes('imposto') || cat.includes('taxa')) deducoes += valor;
          else if (cat.includes('fornecedor') || cat.includes('estoque') || cat.includes('produto')) cpv += valor;
          else if (cat.includes('marketing') || cat.includes('venda') || cat.includes('comiss')) despVendas += valor;
          else if (cat.includes('juros') || cat.includes('multa')) outrasDespesas += valor;
          else despOperacionais += valor;
        }
      });

      const receitaLiquida = receitaBruta - deducoes;
      const margemContribuicao = receitaLiquida - cpv - despVendas;
      const ebitda = margemContribuicao - despOperacionais;

      return { receitaBruta, deducoes, receitaLiquida, cpv, despVendas, margemContribuicao, despOperacionais, ebitda, outrasDespesas, outrasReceitas };
    };

    const atual = calcMes(periodoAtual);
    const anterior = calcMes(periodoAnterior);

    const buildRow = (id: string, nome: string, key: keyof ReturnType<typeof calcMes>, tipo: 'receita' | 'despesa' | 'resultado', isTitle: boolean) => {
      const vAtual = atual[key];
      const vAnterior = anterior[key];
      let variacao = 0;
      if (vAnterior > 0) variacao = ((vAtual - vAnterior) / vAnterior) * 100;
      else if (vAtual > 0) variacao = 100;

      return { id, nome, atual: vAtual, anterior: vAnterior, variacao, tipo, isTitle };
    };

    return [
      buildRow('1', 'Receita Bruta (+)', 'receitaBruta', 'receita', false),
      buildRow('2', 'Deduções e Impostos (-)', 'deducoes', 'despesa', false),
      buildRow('3', 'Receita Líquida', 'receitaLiquida', 'resultado', true),
      buildRow('4', 'Custos Variáveis (Fornecedores/Estoque) (-)', 'cpv', 'despesa', false),
      buildRow('5', 'Despesas Variáveis de Vendas (-)', 'despVendas', 'despesa', false),
      buildRow('6', 'Margem de Contribuição', 'margemContribuicao', 'resultado', true),
      buildRow('7', 'Despesas Operacionais (Fixas) (-)', 'despOperacionais', 'despesa', false),
      buildRow('8', 'Lucro/Prejuízo Operacional', 'ebitda', 'resultado', true),
      buildRow('9', 'Outras Despesas (-)', 'outrasDespesas', 'despesa', false),
      buildRow('10', 'Outras Receitas (+)', 'outrasReceitas', 'receita', false),
    ];
  }, [transacoes, periodoAtual, periodoAnterior]);

  const TableRow = ({ item }: { item: any }) => {
    let variacaoColor = 'var(--text-muted)';
    let Icon = Minus;

    if (item.variacao > 0) {
      if (item.tipo === 'despesa') { variacaoColor = '#ef4444'; Icon = TrendingUp; }
      else { variacaoColor = '#10b981'; Icon = TrendingUp; }
    } else if (item.variacao < 0) {
      if (item.tipo === 'despesa') { variacaoColor = '#10b981'; Icon = TrendingDown; }
      else { variacaoColor = '#ef4444'; Icon = TrendingDown; }
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
        background: item.isTitle ? 'var(--bg-secondary)' : 'transparent',
        fontWeight: item.isTitle ? 700 : 500,
        color: item.tipo === 'despesa' && !item.isTitle ? '#ef4444' : 'var(--text-primary)',
        fontSize: 14
      }}>
        <div style={{ paddingLeft: item.isTitle ? 0 : 24 }}>{item.nome}</div>
        <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatarMoeda(item.atual)}</div>
        <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatarMoeda(item.anterior)}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, color: variacaoColor, fontWeight: 700 }}>
          {item.variacao !== 0 ? (
            <>
              {Math.abs(item.variacao).toFixed(1).replace('.', ',')}%
              <Icon size={16} />
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>-</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>DRE Gerencial</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Demonstrativo de Resultados do Exercício — Acompanhamento Mensal</p>
        </div>
      </div>

      {/* Painel de Filtros / Info */}
      <div style={{ padding: '20px 32px', display: 'flex', gap: 48, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: 8, borderRadius: 8 }}>
            <Calendar size={20} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Período 1 (Referência)</span>
            <input 
              type="month" 
              value={periodoAtual}
              onChange={e => setPeriodoAtual(e.target.value)}
              style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', display: 'block', marginTop: 2, fontFamily: 'inherit', padding: 0 }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--border)', color: 'var(--text-primary)', padding: 8, borderRadius: 8 }}>
            <Calendar size={20} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Período 2 (Comparativo)</span>
            <input 
              type="month" 
              value={periodoAnterior}
              onChange={e => setPeriodoAnterior(e.target.value)}
              style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', display: 'block', marginTop: 2, fontFamily: 'inherit', padding: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div style={{ flex: 1, overflow: 'visible' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr 1fr', 
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          padding: '16px 24px',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '2px solid var(--border)'
        }}>
          <div>Estrutura do DRE</div>
          <div style={{ textAlign: 'right' }}>Período 1 ({strMesAtual})</div>
          <div style={{ textAlign: 'right' }}>Período 2 ({strMesAnterior})</div>
          <div style={{ textAlign: 'right' }}>Variação (P1 / P2)</div>
        </div>

        <div style={{ paddingBottom: 32 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div>
          ) : (
            dre.map((item) => (
              <TableRow key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
