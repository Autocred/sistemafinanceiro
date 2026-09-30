'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Transacao } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { normalizeDate } from '@/lib/financialEngine';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, TrendingDown, DollarSign, Users, MessageCircle } from 'lucide-react';

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface AgingFaixa {
  aVencer: number;
  v30: number;
  v60: number;
  v90: number;
  vMais90: number;
  total: number;
}

interface DevedorItem {
  nome: string;
  valor: number;
  diasAtraso: number;
  categoria: string;
  telefone?: string;
}

// ─── Cores das faixas de aging ───────────────────────────────────────────────
const FAIXA_CORES  = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7c3aed'];
const FAIXA_LABELS = ['A Vencer', '1–30 dias', '31–60 dias', '61–90 dias', '+90 dias'];

// ─── Card KPI ────────────────────────────────────────────────────────────────
function SummaryCard({
  label, valor, cor, icon: Icon, formatarComo = 'moeda',
}: {
  label: string;
  valor: number | string;
  cor: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  formatarComo?: 'moeda' | 'pct' | 'texto';
}) {
  const valorFormatado =
    formatarComo === 'moeda'   ? formatarMoeda(valor as number) :
    formatarComo === 'pct'     ? `${(valor as number).toFixed(1)}%` :
    valor;

  return (
    <div style={{
      flex: 1, minWidth: 180,
      background: 'var(--bg-card)',
      border: `1px solid ${cor}33`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: `0 2px 12px ${cor}18`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${cor}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={cor} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: cor, lineHeight: 1.1 }}>
        {valorFormatado}
      </div>
    </div>
  );
}

// ─── Célula da tabela de aging ───────────────────────────────────────────────
function Coluna({ label, valor, cor, bgLight }: { label: string; valor: number; cor?: string; bgLight?: string }) {
  return (
    <div style={{
      padding: '12px 10px',
      borderRight: '1px solid var(--border)',
      flex: 1, textAlign: 'center',
      background: bgLight,
    }}>
      <div style={{ fontSize: 10, color: cor || 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: cor || 'var(--text-primary)', marginTop: 4 }}>
        {formatarMoeda(valor)}
      </div>
    </div>
  );
}

// ─── Cor do badge por dias de atraso ────────────────────────────────────────
function corAtraso(dias: number) {
  if (dias <= 30) return '#f59e0b';
  if (dias <= 60) return '#f97316';
  if (dias <= 90) return '#ef4444';
  return '#7c3aed';
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AgingList({ transacoes: transacoesProp }: { transacoes?: Transacao[] }) {
  // Permite uso autossuficiente (busca do Firebase) ou com prop
  const [transacoesLocal, setTransacoesLocal] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(!transacoesProp);

  useEffect(() => {
    // Se já recebeu transações pela prop, não precisa buscar
    if (transacoesProp && transacoesProp.length >= 0) {
      setCarregando(false);
      return;
    }
    // Busca do Firebase quando autossuficiente
    let cancelado = false;
    (async () => {
      try {
        const { getTransacoes } = await import('@/lib/storage');
        const data = await getTransacoes();
        if (!cancelado) {
          setTransacoesLocal(data);
          setCarregando(false);
        }
      } catch (e) {
        console.error('[AgingList] Erro ao carregar transações:', e);
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [transacoesProp]);

  const transacoes = transacoesProp ?? transacoesLocal;

  // ─── Lógica de aging ─────────────────────────────────────────────────────
  const { agingData, devedores, kpis } = useMemo(() => {
    const hojeStr  = new Date().toISOString().split('T')[0];
    const hojeMs   = new Date(hojeStr).getTime();

    const data: { receber: AgingFaixa; pagar: AgingFaixa } = {
      receber: { aVencer: 0, v30: 0, v60: 0, v90: 0, vMais90: 0, total: 0 },
      pagar:   { aVencer: 0, v30: 0, v60: 0, v90: 0, vMais90: 0, total: 0 },
    };

    const devedoresMap: Record<string, DevedorItem> = {};

    transacoes.forEach((t) => {
      if (t.status === 'pago') return;
      const dV = normalizeDate(t.dataVencimento || t.data);
      if (!dV) return;

      const diffMs   = hojeMs - new Date(dV).getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const tipo     = t.tipo === 'receita' ? 'receber' : 'pagar';

      data[tipo].total += t.valor;

      if      (diffDias <= 0)   data[tipo].aVencer  += t.valor;
      else if (diffDias <= 30)  data[tipo].v30      += t.valor;
      else if (diffDias <= 60)  data[tipo].v60      += t.valor;
      else if (diffDias <= 90)  data[tipo].v90      += t.valor;
      else                      data[tipo].vMais90  += t.valor;

      // Registra devedor: receitas vencidas (atraso > 0)
      if (t.tipo === 'receita' && diffDias > 0) {
        const nome  = t.clienteNome || t.fornecedorNome || 'Cliente sem nome';
        const tel   = (t as any).fornecedorTelefone || (t as any).clienteTelefone || undefined;
        if (!devedoresMap[nome]) {
          devedoresMap[nome] = { nome, valor: 0, diasAtraso: diffDias, categoria: t.categoriaNome || '—', telefone: tel };
        }
        devedoresMap[nome].valor      += t.valor;
        devedoresMap[nome].diasAtraso  = Math.max(devedoresMap[nome].diasAtraso, diffDias);
      }
    });

    const lista         = Object.values(devedoresMap).sort((a, b) => b.valor - a.valor);
    const totalReceber  = data.receber.total;
    const totalAtrasado = data.receber.v30 + data.receber.v60 + data.receber.v90 + data.receber.vMais90;
    const taxaInadimpl  = totalReceber > 0 ? (totalAtrasado / totalReceber) * 100 : 0;
    const maiorDevedor  = lista[0];

    return { agingData: data, devedores: lista, kpis: { totalReceber, totalAtrasado, taxaInadimpl, maiorDevedor } };
  }, [transacoes]);

  // ─── Dados para gráfico de pizza ─────────────────────────────────────────
  const pieData = useMemo(() => {
    const { receber } = agingData;
    return [
      { name: 'A Vencer',   value: receber.aVencer  },
      { name: '1–30 dias',  value: receber.v30      },
      { name: '31–60 dias', value: receber.v60      },
      { name: '61–90 dias', value: receber.v90      },
      { name: '+90 dias',   value: receber.vMais90  },
    ].filter((d) => d.value > 0);
  }, [agingData]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando dados de inadimplência...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── CABEÇALHO ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={22} color="#ef4444" />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Painel de Inadimplência
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Aging List — Mapeamento de risco por faixa de atraso
          </p>
        </div>
      </div>

      {/* ── CARDS KPI ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <SummaryCard label="Total a Receber"       valor={kpis.totalReceber}  cor="#10b981" icon={DollarSign}   formatarComo="moeda"  />
        <SummaryCard label="Total em Atraso"        valor={kpis.totalAtrasado} cor="#ef4444" icon={TrendingDown} formatarComo="moeda"  />
        <SummaryCard label="Taxa de Inadimplência"  valor={kpis.taxaInadimpl}  cor="#1e3a8a" icon={AlertTriangle} formatarComo="pct"  />
        <SummaryCard
          label="Maior Devedor"
          valor={kpis.maiorDevedor ? kpis.maiorDevedor.nome : '—'}
          cor="#f59e0b"
          icon={Users}
          formatarComo="texto"
        />
      </div>

      {/* ── TABELAS DE AGING (Receber + Pagar) ─────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Contas a Receber */}
        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Contas a Receber</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Total: <strong style={{ color: '#10b981' }}>{formatarMoeda(agingData.receber.total)}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            <Coluna label="A Vencer"   valor={agingData.receber.aVencer}  cor="#10b981" bgLight="rgba(16,185,129,0.04)"  />
            <Coluna label="1–30 dias"  valor={agingData.receber.v30}      cor="#f59e0b" bgLight="rgba(245,158,11,0.04)"  />
            <Coluna label="31–60 dias" valor={agingData.receber.v60}      cor="#f97316" bgLight="rgba(249,115,22,0.05)"  />
            <Coluna label="61–90 dias" valor={agingData.receber.v90}      cor="#ef4444" bgLight="rgba(239,68,68,0.05)"   />
            <div style={{ padding: '12px 10px', flex: 1, textAlign: 'center', background: 'rgba(124,58,237,0.08)' }}>
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                +90 dias (Risco Alto)
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>
                {formatarMoeda(agingData.receber.vMais90)}
              </div>
            </div>
          </div>
        </div>

        {/* Contas a Pagar */}
        <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Contas a Pagar</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Total: <strong style={{ color: '#ef4444' }}>{formatarMoeda(agingData.pagar.total)}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            <Coluna label="A Vencer"   valor={agingData.pagar.aVencer}  cor="#10b981" bgLight="rgba(16,185,129,0.04)"  />
            <Coluna label="1–30 dias"  valor={agingData.pagar.v30}      cor="#f59e0b" bgLight="rgba(245,158,11,0.04)"  />
            <Coluna label="31–60 dias" valor={agingData.pagar.v60}      cor="#f97316" bgLight="rgba(249,115,22,0.05)"  />
            <Coluna label="61–90 dias" valor={agingData.pagar.v90}      cor="#ef4444" bgLight="rgba(239,68,68,0.05)"   />
            <Coluna label="+90 dias"   valor={agingData.pagar.vMais90}  cor="#f59e0b" bgLight="rgba(245,158,11,0.06)"  />
          </div>
        </div>
      </div>

      {/* ── GRÁFICO DE PIZZA + TABELA DE DEVEDORES ─────────────────────── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Gráfico de pizza */}
        {pieData.length > 0 && (
          <div className="glass" style={{
            flex: '0 0 320px', minWidth: 280,
            borderRadius: 14, border: '1px solid var(--border)',
            padding: '16px 12px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, paddingLeft: 8 }}>
              Distribuição por Faixa (Receber)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => {
                    const idx = FAIXA_LABELS.indexOf(entry.name);
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={FAIXA_CORES[idx >= 0 ? idx : index % FAIXA_CORES.length]}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatarMoeda(value), 'Valor']}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de clientes/fornecedores em atraso */}
        <div className="glass" style={{
          flex: 1, minWidth: 300,
          borderRadius: 14, border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Clientes / Fornecedores em Atraso
            </div>
            {devedores.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                padding: '3px 8px', borderRadius: 20,
              }}>
                {devedores.length} inadimplente{devedores.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {devedores.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              ✅ Nenhum cliente ou fornecedor com receitas em atraso.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Nome', 'Valor em Atraso', 'Dias de Atraso', 'Categoria', 'Ação'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devedores.map((d, idx) => (
                    <tr
                      key={`${d.nome}-${idx}`}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{d.nome}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#ef4444' }}>
                          {formatarMoeda(d.valor)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: `${corAtraso(d.diasAtraso)}22`,
                          color: corAtraso(d.diasAtraso),
                          padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                        }}>
                          {d.diasAtraso}d de atraso
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.categoria}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {d.telefone ? (
                          <a
                            href={`whatsapp://send?phone=${d.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                              `Olá ${d.nome}, identificamos um valor em aberto de ${formatarMoeda(d.valor)}. Podemos verificar?`
                            )}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 700,
                              color: '#10b981', background: 'rgba(16,185,129,0.12)',
                              padding: '5px 10px', borderRadius: 8,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                            }}
                          >
                            <MessageCircle size={13} />
                            Cobrar
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgingList;
