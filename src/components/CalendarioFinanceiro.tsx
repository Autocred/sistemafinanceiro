'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertCircle, Filter
} from 'lucide-react';
import { Transacao } from '@/lib/types';
import { getTransacoes, formatarMoeda } from '@/lib/storage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ModoVisao = 'mes' | 'semana' | 'dia' | 'agenda';

export function CalendarioFinanceiro() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [modo, setModo] = useState<ModoVisao>('mes');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date());

  const carregar = useCallback(async () => {
    const data = await getTransacoes();
    setTransacoes(data);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const mesInicio = startOfMonth(dataAtual);
  const mesFim = endOfMonth(dataAtual);
  const diasDoMes = eachDayOfInterval({ start: mesInicio, end: mesFim });

  const fmt = formatarMoeda;

  const proximoMes = () => setDataAtual(addMonths(dataAtual, 1));
  const mesAnterior = () => setDataAtual(subMonths(dataAtual, 1));

  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
    return true;
  });

  const getTransacoesDoDia = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return transacoesFiltradas.filter(t => {
      const dt = t.dataVencimento || t.data;
      return dt === dayStr;
    });
  };

  const transacoesDiaSelecionado = getTransacoesDoDia(diaSelecionado);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      {/* HEADER DO CALENDÁRIO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            📅 Calendário Financeiro ERP
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Visão Consolidada de Vencimentos, Contas e Compromissos
          </p>
        </div>

        {/* CONTROLES DE MÊS & VISÃO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 8px' }}>
            <button onClick={mesAnterior} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 6 }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', minWidth: 140, textAlign: 'center' }}>
              {format(dataAtual, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button onClick={proximoMes} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 6 }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* SELETOR DE VISÃO */}
          <div style={{ display: 'flex', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 3 }}>
            {(['mes', 'semana', 'dia', 'agenda'] as const).map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: modo === m ? '#cc0000' : 'transparent',
                  color: modo === m ? '#ffffff' : 'var(--text-muted)',
                  textTransform: 'capitalize'
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID DE DIAS DO MÊS */}
      {modo === 'mes' && (
        <div className="glass" style={{ padding: 16, borderRadius: 20 }}>
          {/* Cabeçalho dos dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 12, textAlign: 'center' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {diasDoMes.map(day => {
              const itens = getTransacoesDoDia(day);
              const totalDesp = itens.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
              const totalRec = itens.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, diaSelecionado);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setDiaSelecionado(day)}
                  style={{
                    minHeight: 90,
                    borderRadius: 12,
                    padding: 8,
                    background: isSelected ? 'rgba(204,0,0,0.12)' : 'var(--bg-secondary)',
                    border: isToday ? '2px solid #cc0000' : isSelected ? '1px solid #cc0000' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: isToday ? 900 : 700,
                      color: isToday ? '#cc0000' : 'var(--text-primary)',
                      background: isToday ? 'rgba(204,0,0,0.15)' : 'transparent',
                      padding: '2px 6px',
                      borderRadius: 6
                    }}>
                      {format(day, 'd')}
                    </span>
                    {itens.length > 0 && (
                      <span className="badge badge-red" style={{ fontSize: 9, padding: '1px 5px' }}>
                        {itens.length}
                      </span>
                    )}
                  </div>

                  {/* Resumo de valores não dia */}
                  <div style={{ marginTop: 4 }}>
                    {totalRec > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        +{fmt(totalRec)}
                      </div>
                    )}
                    {totalDesp > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        -{fmt(totalDesp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETALHES DO DIA SELECIONADO */}
      <div className="glass" style={{ padding: 20, borderRadius: 20, marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
          Lançamentos do dia {format(diaSelecionado, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>

        {transacoesDiaSelecionado.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Nenhum lançamento agendado para esta data.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transacoesDiaSelecionado.map(t => (
              <div key={t.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {t.tipo === 'receita' ? <ArrowUpCircle size={22} color="#10b981" /> : <ArrowDownCircle size={22} color="#ef4444" />}
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t.descricao}</h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.categoriaNome || 'Geral'} • {t.contaId}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: t.tipo === 'receita' ? '#10b981' : '#ef4444' }}>
                    {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor)}
                  </span>
                  <span className={`badge ${t.status === 'pago' ? 'badge-green' : 'badge-yellow'}`} style={{ display: 'block', fontSize: 10, marginTop: 2 }}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
