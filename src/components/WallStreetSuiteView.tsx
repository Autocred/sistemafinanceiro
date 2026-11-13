'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, DollarSign } from 'lucide-react';
import { subscribeTransacoes, subscribeFaturas, subscribeContas } from '@/lib/storage';
import { Transacao, Fatura, Conta } from '@/lib/types';
import { calcularMotorFinanceiro } from '@/lib/financialEngine';
import WaterfallAttribution from './WaterfallAttribution';
import DebtPayoffSimulator from './DebtPayoffSimulator';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function WallStreetSuiteView() {
  const [mesSelecionado, setMesSelecionado] = useState<Date>(() => new Date());
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let loadedTx = false;
    let loadedFat = false;
    let loadedCon = false;

    const check = () => {
      if (loadedTx && loadedFat && loadedCon) setLoading(false);
    };

    const u1 = subscribeTransacoes((d: Transacao[]) => {
      setTransacoes(d);
      loadedTx = true;
      check();
    });
    const u2 = subscribeFaturas((d: Fatura[]) => {
      setFaturas(d);
      loadedFat = true;
      check();
    });
    const u3 = subscribeContas((d: Conta[]) => {
      setContas(d);
      loadedCon = true;
      check();
    });

    return () => {
      if (typeof u1 === 'function') u1();
      if (typeof u2 === 'function') u2();
      if (typeof u3 === 'function') u3();
    };
  }, []);

  const mesFormatado = `${mesSelecionado.getFullYear()}-${String(mesSelecionado.getMonth() + 1).padStart(2, '0')}`;
  const nomeMes = `${MESES[mesSelecionado.getMonth()]} / ${mesSelecionado.getFullYear()}`;

  const motor = useMemo(() => {
    return calcularMotorFinanceiro(transacoes, faturas, contas, mesSelecionado);
  }, [transacoes, faturas, contas, mesSelecionado]);

  const prevMes = () => {
    const d = new Date(mesSelecionado);
    d.setMonth(d.getMonth() - 1);
    setMesSelecionado(d);
  };

  const nextMes = () => {
    const d = new Date(mesSelecionado);
    d.setMonth(d.getMonth() + 1);
    setMesSelecionado(d);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando Ferramentas Wall Street & Quitação...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1480, margin: '0 auto' }}>
      {/* Cabeçalho com seletor de mês */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 20,
          padding: '16px 22px',
          borderRadius: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary) 0%, #0f172a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: 'var(--text-title)' }}>
              Central Wall Street: Raio-X de Cada R$ 100 & Acelerador de Quitação
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Ferramentas corporativas americanas (Padrão Stripe Sigma, SoFi & Tally) aplicadas em tempo real aos seus lançamentos
            </p>
          </div>
        </div>

        {/* Navegador de Mês */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-secondary)',
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid var(--border)'
          }}
        >
          <button
            onClick={prevMes}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: 6,
              cursor: 'pointer',
              color: 'var(--text-title)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-title)', minWidth: 135, textAlign: 'center' }}>
            {nomeMes}
          </span>
          <button
            onClick={nextMes}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: 6,
              cursor: 'pointer',
              color: 'var(--text-title)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 1. Raio-X de Destino de Cada R$ 100,00 */}
      <WaterfallAttribution
        transacoes={transacoes}
        faturas={faturas}
        mesFormatado={mesFormatado}
        nomeMes={nomeMes}
        receitasRealizadas={motor.receitasPagas || 0}
        receitasAReceber={motor.receitasAReceberTotal || 0}
        despesasRealizadas={motor.despesasPagas || 0}
        despesasAPagar={motor.despesasAPagarTotal || 0}
        compactOnDashboard={false}
      />

      {/* 2. Acelerador de Quitação Snowball vs. Avalanche & Calendário de Alívio */}
      <DebtPayoffSimulator
        transacoes={transacoes}
        mesFormatado={mesFormatado}
        saldoEmCaixa={motor.saldoEmContas || 0}
        compactOnDashboard={false}
      />
    </div>
  );
}
