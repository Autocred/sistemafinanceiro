'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie
} from 'recharts';
import { Transacao, Cliente } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { getComportamentoTransacao } from './ExtratoBancario';
import {
  Building2, TrendingUp, DollarSign, Calendar, Filter,
  ArrowUpRight, PieChart as PieIcon, BarChart3, Award,
  ChevronDown, ChevronUp, FileSpreadsheet, Search, CheckCircle2,
  Clock, ShieldCheck
} from 'lucide-react';

interface RelatorioComissoesProps {
  transacoes: Transacao[];
  transacoesFiltradas: Transacao[];
  dataInicio: string;
  dataFim: string;
}

export function RelatorioComissoes({
  transacoes,
  transacoesFiltradas,
  dataInicio,
  dataFim
}: RelatorioComissoesProps) {
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('todos');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<'todas' | 'diferida' | 'avista'>('todas');
  const [buscaLcto, setBuscaLcto] = useState<string>('');
  const [bancoExpandido, setBancoExpandido] = useState<string | null>(null);

  const fmt = formatarMoeda;

  // 1. Filtrar apenas RECEITAS que representem operações / comissões
  const receitasFiltradas = useMemo(() => {
    return transacoesFiltradas.filter(t => {
      if (t.tipo !== 'receita') return false;
      // Não incluir transferências ou ajustes internos
      if (t.categoriaNome?.toLowerCase().includes('ajuste') || t.categoriaNome?.toLowerCase().includes('transferência')) return false;

      // Filtro de banco selecionado
      const bancoNome = t.clienteNome || 'Sem Parceiro Vinculado';
      if (bancoSelecionado !== 'todos' && bancoNome !== bancoSelecionado) return false;

      // Filtro por modalidade (Diferida / À Vista)
      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      if (modalidadeFiltro === 'diferida' && !isDiferida) return false;
      if (modalidadeFiltro === 'avista' && isDiferida) return false;

      // Filtro de texto de busca
      if (buscaLcto) {
        const q = buscaLcto.toLowerCase();
        const match =
          (t.descricao && t.descricao.toLowerCase().includes(q)) ||
          (t.clienteNome && t.clienteNome.toLowerCase().includes(q)) ||
          ((t as any).subcategoria && (t as any).subcategoria.toLowerCase().includes(q)) ||
          String(t.valor).includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [transacoesFiltradas, bancoSelecionado, modalidadeFiltro, buscaLcto]);

  // 2. Extrair lista única de Bancos Parceiros presentes nas receitas
  const listaBancos = useMemo(() => {
    const set = new Set<string>();
    transacoes.forEach(t => {
      if (t.tipo === 'receita' && t.clienteNome) {
        set.add(t.clienteNome.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transacoes]);

  // 3. Indicadores de Topo (KPIs)
  const kpis = useMemo(() => {
    let total = 0;
    let totalDiferida = 0;
    let totalAvista = 0;
    let qtdDiferida = 0;
    let qtdAvista = 0;

    receitasFiltradas.forEach(t => {
      const v = Number(t.valor) || 0;
      total += v;

      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      if (isDiferida) {
        totalDiferida += v;
        qtdDiferida++;
      } else {
        totalAvista += v;
        qtdAvista++;
      }
    });

    const totalQtd = receitasFiltradas.length;
    const ticketMedio = totalQtd > 0 ? total / totalQtd : 0;
    const percDiferida = total > 0 ? (totalDiferida / total) * 100 : 0;
    const percAvista = total > 0 ? (totalAvista / total) * 100 : 0;

    return {
      total,
      totalQtd,
      totalDiferida,
      qtdDiferida,
      percDiferida,
      totalAvista,
      qtdAvista,
      percAvista,
      ticketMedio
    };
  }, [receitasFiltradas]);

  // 4. Agrupamento por Banco Parceiro para Ranking e Gráficos
  const dadosPorBanco = useMemo(() => {
    const map = new Map<string, {
      banco: string;
      total: number;
      diferida: number;
      avista: number;
      qtd: number;
      qtdDiferida: number;
      qtdAvista: number;
      transacoes: Transacao[];
    }>();

    receitasFiltradas.forEach(t => {
      const b = (t.clienteNome || 'Sem Parceiro Vinculado').trim();
      const v = Number(t.valor) || 0;

      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      let item = map.get(b);
      if (!item) {
        item = {
          banco: b,
          total: 0,
          diferida: 0,
          avista: 0,
          qtd: 0,
          qtdDiferida: 0,
          qtdAvista: 0,
          transacoes: []
        };
        map.set(b, item);
      }

      item.total += v;
      item.qtd++;
      item.transacoes.push(t);

      if (isDiferida) {
        item.diferida += v;
        item.qtdDiferida++;
      } else {
        item.avista += v;
        item.qtdAvista++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [receitasFiltradas]);

  // Banco líder
  const bancoLider = dadosPorBanco[0] || null;

  // 5. Dados para Gráfico de Distribuição por Modalidade
  const pieDataModalidade = useMemo(() => {
    return [
      { name: 'Comissão Diferida (Fixa/Recorrente)', value: kpis.totalDiferida, color: '#8b5cf6' },
      { name: 'Comissão À Vista (Variável/Spot)', value: kpis.totalAvista, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [kpis]);

  // 6. Dados para Gráfico de Barras (Top Bancos)
  const barDataBancos = useMemo(() => {
    return dadosPorBanco.slice(0, 8).map(b => ({
      banco: b.banco.length > 18 ? b.banco.substring(0, 16) + '...' : b.banco,
      bancoCompleto: b.banco,
      'À Vista': b.avista,
      'Diferida': b.diferida,
      Total: b.total
    }));
  }, [dadosPorBanco]);

  // 7. Projeção de Comissões Diferidas nos Próximos 6 Meses
  const projecaoMeses = useMemo(() => {
    const hoje = new Date();
    const meses = [];
    // Média dos últimos recebimentos de comissões diferidas
    const mediaDiferidaMensal = kpis.totalDiferida > 0 ? kpis.totalDiferida : 0;

    for (let i = 1; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesNome = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      // Estimativa baseada no volume recorrente ativo
      const estimativa = mediaDiferidaMensal;
      meses.push({
        mes: mesNome.toUpperCase(),
        estimativa
      });
    }
    return meses;
  }, [kpis.totalDiferida]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* CABEÇALHO DO MÓDULO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(204,0,0,0.06), rgba(204,0,0,0.02))',
        border: '1px solid rgba(204,0,0,0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--primary, #cc0000)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(204,0,0,0.3)'
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
              Painel Analítico de Comissões & Bancos Parceiros
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Visão consolidada de produção por instituição financeira, comparativo de Comissões À Vista vs. Diferidas (recorrência) e projeções.
            </p>
          </div>
        </div>

        {/* CONTROLES / FILTROS LOCAIS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Seletor de Banco */}
          <div style={{ minWidth: 180 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Filtrar Banco
            </label>
            <select
              className="input-field filter-select-sm"
              value={bancoSelecionado}
              onChange={e => setBancoSelecionado(e.target.value)}
            >
              <option value="todos">Todos os Bancos ({listaBancos.length})</option>
              {listaBancos.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div style={{ minWidth: 150 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Modalidade
            </label>
            <select
              className="input-field filter-select-sm"
              value={modalidadeFiltro}
              onChange={e => setModalidadeFiltro(e.target.value as any)}
            >
              <option value="todas">Todas as Modalidades</option>
              <option value="diferida">Apenas Diferidas (Fixas)</option>
              <option value="avista">Apenas À Vista (Spot)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE INDICADORES (KPIs) */}
      <div className="grid-responsive-4" style={{ gap: 16 }}>
        {/* TOTAL COMISSÕES */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(204,0,0,0.18)',
          background: 'linear-gradient(135deg, rgba(204,0,0,0.04), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total em Comissões
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(204,0,0,0.1)', color: 'var(--primary, #cc0000)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {fmt(kpis.total)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{kpis.totalQtd} lançamentos de comissão</span>
          </div>
        </div>

        {/* COMISSÕES DIFERIDAS (FIXAS) */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(139,92,246,0.25)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Comissões Diferidas (Fixas)
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', letterSpacing: '-0.5px' }}>
            {fmt(kpis.totalDiferida)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <strong style={{ color: '#7c3aed' }}>{kpis.percDiferida.toFixed(1)}%</strong> da receita total ({kpis.qtdDiferida} recebimentos)
          </div>
        </div>

        {/* COMISSÕES À VISTA (VARIÁVEIS) */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(16,185,129,0.25)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
              Comissões À Vista (Spot)
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px' }}>
            {fmt(kpis.totalAvista)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <strong style={{ color: '#059669' }}>{kpis.percAvista.toFixed(1)}%</strong> da receita total ({kpis.qtdAvista} contratos)
          </div>
        </div>

        {/* BANCO LÍDER DO PERÍODO */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(245,158,11,0.25)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
              Parceiro Líder
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={16} />
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bancoLider ? bancoLider.banco : 'Nenhum'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {bancoLider ? (
              <>
                <strong style={{ color: '#d97706' }}>{fmt(bancoLider.total)}</strong> ({((bancoLider.total / (kpis.total || 1)) * 100).toFixed(1)}% do volume)
              </>
            ) : 'Sem dados'}
          </div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS ANALÍTICOS */}
      <div className="grid-responsive-2" style={{ gap: 20 }}>
        {/* GRÁFICO 1: RANKING POR BANCO PARCEIRO */}
        <div className="glass" style={{ padding: 22, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Ranking por Banco Parceiro (Top 8)
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Divisão entre À Vista e Diferida por instituição
              </p>
            </div>
            <BarChart3 size={18} color="var(--primary, #cc0000)" />
          </div>

          <div style={{ width: '100%', height: 280 }}>
            {barDataBancos.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum dado encontrado para os filtros selecionados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataBancos} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="banco"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [fmt(Number(value) || 0), name]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: 12
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="À Vista" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Diferida" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: COMPOSIÇÃO DA CARTEIRA (À VISTA VS DIFERIDA) */}
        <div className="glass" style={{ padding: 22, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Composição: À Vista vs. Diferida
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Proporção de recorrência fixa vs. receita pontual
              </p>
            </div>
            <PieIcon size={18} color="#8b5cf6" />
          </div>

          <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieDataModalidade.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Sem dados de comissões para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataModalidade}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {pieDataModalidade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [fmt(Number(value) || 0), name]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: 12
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* TABELA CONSOLIDADA POR BANCO PARCEIRO */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Detalhamento por Instituição Parceira
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Clique em qualquer parceiro para expandir e ver os lançamentos individuais
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Campo de busca rápida */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar contrato/descrição..."
                className="input-field filter-select-sm"
                style={{ paddingLeft: 30 }}
                value={buscaLcto}
                onChange={e => setBuscaLcto(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 60 }}>#</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Banco / Parceiro</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Operações</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>À Vista (Spot)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Diferida (Fixa)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total Geral</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Share (%)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: 80 }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorBanco.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nenhuma operação de comissão encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                dadosPorBanco.map((b, index) => {
                  const share = kpis.total > 0 ? (b.total / kpis.total) * 100 : 0;
                  const expandido = bancoExpandido === b.banco;

                  return (
                    <React.Fragment key={b.banco}>
                      <tr
                        onClick={() => setBancoExpandido(expandido ? null : b.banco)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: expandido ? 'rgba(204,0,0,0.03)' : (index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'),
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: index < 3 ? 'var(--primary, #cc0000)' : 'var(--text-muted)' }}>
                          #{index + 1}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: index === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(204,0,0,0.08)',
                              color: index === 0 ? '#d97706' : 'var(--primary, #cc0000)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12
                            }}>
                              <Building2 size={16} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {b.banco}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 12, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {b.qtd}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                          {fmt(b.avista)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>
                          {fmt(b.diferida)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 14, textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {fmt(b.total)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {share.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          >
                            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* DETALHAMENTO DE LANÇAMENTOS DO BANCO EXPANDIDO */}
                      {expandido && (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(204,0,0,0.15)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  Lançamentos de Comissões de <strong>{b.banco}</strong> ({b.transacoes.length} registros)
                                </span>
                              </div>

                              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-glass)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Data</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Descrição</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Subcategoria</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Modalidade</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {b.transacoes.map((t, tIdx) => {
                                      const comp = getComportamentoTransacao(t);
                                      const sub = ((t as any).subcategoria || '').toLowerCase();
                                      const desc = (t.descricao || '').toLowerCase();
                                      const isDif = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

                                      return (
                                        <tr key={t.id || tIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                            {String(t.dataPagamento || t.data || '').split('-').reverse().join('/')}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {t.descricao}
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            {(t as any).subcategoria ? (
                                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
                                                {(t as any).subcategoria}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            <span style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              background: isDif ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                                              color: isDif ? '#7c3aed' : '#059669'
                                            }}>
                                              {isDif ? 'Diferida (Fixa)' : 'À Vista (Spot)'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            <span style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              background: t.status === 'pago' ? 'rgba(21,128,61,0.12)' : 'rgba(234,179,8,0.15)',
                                              color: t.status === 'pago' ? '#15803d' : '#d97706'
                                            }}>
                                              {t.status === 'pago' ? 'Confirmado' : 'Pendente'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                            +{fmt(t.valor)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUADRO DE PROJEÇÃO DE RECORRÊNCIA FUTURA */}
      <div className="glass" style={{ padding: 22, borderRadius: 20, border: '1px solid rgba(139,92,246,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🔮 Projeção de Carteira Recorrente (Comissões Diferidas)
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Estimativa de fluxo de caixa garantido por comissões fixas/diferidas para os próximos 6 meses
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'rgba(139,92,246,0.1)', padding: '6px 12px', borderRadius: 8 }}>
            Base Ativa: {fmt(kpis.totalDiferida)} / mês
          </span>
        </div>

        <div className="grid-responsive-3" style={{ gap: 12 }}>
          {projecaoMeses.map((p, idx) => (
            <div key={idx} style={{
              background: 'rgba(139,92,246,0.04)',
              border: '1px solid rgba(139,92,246,0.18)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Previsão {p.mes}
                </span>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed', margin: '4px 0 0' }}>
                  {fmt(p.estimativa)}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                Recorrente
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
