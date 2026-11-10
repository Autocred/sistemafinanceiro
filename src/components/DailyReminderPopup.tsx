'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, X, Calendar, ArrowRight, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transacao } from '@/lib/types';
import { getTransacoes, atualizarTransacao, formatarMoeda } from '@/lib/storage';
import { playSound } from '@/lib/audio';

export function DailyReminderPopup({ userId, setActiveTab }: { userId?: string; setActiveTab?: (tab: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contasVencendo, setContasVencendo] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'todas' | 'receitas' | 'despesas'>('todas');

  const checarContasEAlertar = useCallback(async () => {
    try {
      let transacoes: Transacao[] = [];
      try {
        if (!userId) throw new Error('Offline mode');
        transacoes = await getTransacoes();
        localStorage.setItem('cached_transacoes_vencendo', JSON.stringify(transacoes));
      } catch (err) {
        const cached = localStorage.getItem('cached_transacoes_vencendo');
        if (cached) transacoes = JSON.parse(cached);
      }
      if (!transacoes || transacoes.length === 0) return;

      const hojeStr = new Date().toISOString().split('T')[0];

      // Feriados Nacionais Fixos do Brasil
      const FERIADOS_NACIONAIS = [
        '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
      ];
      
      const isFeriadoOuFds = (dataStr: string) => {
         const d = new Date(dataStr + 'T12:00:00');
         const day = d.getDay();
         if (day === 0 || day === 6) return true;
         const mesDia = dataStr.substring(5);
         if (FERIADOS_NACIONAIS.includes(mesDia)) return true;
         return false;
      };

      const getDiaUtilAnterior = (dataStr: string) => {
         let date = new Date(dataStr + 'T12:00:00');
         date.setDate(date.getDate() - 1);
         while (isFeriadoOuFds(date.toISOString().split('T')[0])) {
            date.setDate(date.getDate() - 1);
         }
         return date.toISOString().split('T')[0];
      };

      // Filtra despesas ou receitas pendentes vencendo hoje, atrasadas, em até 2 dias ou antecipadas pelo FDS/Feriado
      const pendentesVencendo = transacoes.filter(t => {
        if (t.status === 'pago') return false;
        const dtVenc = t.dataVencimento || t.data;
        if (!dtVenc) return false;
        
        // Vencendo hoje ou atrasada
        if (dtVenc <= hojeStr) return true;

        // Vencendo com até 2 dias de antecedência
        const diffMs = new Date(dtVenc + 'T12:00:00').getTime() - new Date(hojeStr + 'T12:00:00').getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias > 0 && diffDias <= 2) {
          (t as any).venceEm2Dias = true;
          (t as any).diasRestantes = diffDias;
          return true;
        }
        
        // Se vence no futuro, mas cai em feriado/FDS e o "dia útil anterior" é hoje
        if (isFeriadoOuFds(dtVenc)) {
           const diaUtilAnt = getDiaUtilAnterior(dtVenc);
           if (diaUtilAnt === hojeStr) {
               (t as any).antecipadoPorFeriado = true;
               return true;
           }
        }
        
        return false;
      });

      if (pendentesVencendo.length > 0) {
        setContasVencendo(pendentesVencendo);
        
        const temRec = pendentesVencendo.some(t => t.tipo === 'receita');
        const temDesp = pendentesVencendo.some(t => t.tipo !== 'receita');
        if (temRec && !temDesp) setAbaAtiva('receitas');
        else if (temDesp && !temRec) setAbaAtiva('despesas');
        else setAbaAtiva('todas');

        setIsOpen(true);
        playSound('aviso');
        
        // Notificação Nativa do SO
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
           const titulo = temRec && !temDesp 
              ? 'Receitas e Comissões a Receber!' 
              : temDesp && !temRec 
              ? 'Atenção: Contas Vencendo Hoje!' 
              : 'Lembretes Financeiros de Hoje!';
           new Notification(titulo, {
             body: `Você tem ${pendentesVencendo.length} lançamento(s) que exigem atenção hoje.`,
             icon: '/icon.png'
           });
        }
      } else {
        setContasVencendo([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("[DAILY POPUP CHECK ERROR]", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let intervalLimpar: NodeJS.Timeout | null = null;

    const iniciarVerificacao = async () => {
      const cfg = userId ? await import('@/lib/storage').then(m => m.getConfiguracoes(userId)).catch(() => null) : null;
      
      const apenasAoIniciar = cfg?.lembretesPopupAoIniciar ?? true;
      const horarios = cfg?.lembretesPopupHorarios || [];
      const hojeStr = new Date().toISOString().split('T')[0];
      const sessaoChave = `popup_mostrado_${hojeStr}`;

      if (apenasAoIniciar) {
         if (!sessionStorage.getItem(sessaoChave)) {
            checarContasEAlertar();
            sessionStorage.setItem(sessaoChave, 'true');
         }
      } else {
         checarContasEAlertar();
      }

      intervalLimpar = setInterval(() => {
         const agora = new Date();
         const hs = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
         
         if (horarios.includes(hs)) {
            const chaveMinuto = `popup_horario_${hojeStr}_${hs}`;
            if (!sessionStorage.getItem(chaveMinuto)) {
               checarContasEAlertar();
               sessionStorage.setItem(chaveMinuto, 'true');
            }
         }
      }, 30000);
    };

    iniciarVerificacao();

    return () => {
      if (intervalLimpar) clearInterval(intervalLimpar);
    };
  }, [checarContasEAlertar, userId]);

  const receitas = contasVencendo.filter(c => c.tipo === 'receita');
  const despesas = contasVencendo.filter(c => c.tipo !== 'receita');

  const itensExibidos = abaAtiva === 'receitas' 
    ? receitas 
    : abaAtiva === 'despesas' 
    ? despesas 
    : contasVencendo;

  const handleMarcarPagas = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      for (const item of itensExibidos) {
        await atualizarTransacao(item.id, {
          status: 'pago',
          dataPagamento: hoje
        });
      }
      playSound('sucesso');
      setIsOpen(false);
      await checarContasEAlertar();
    } catch (e) {
      console.error("[DAILY POPUP PAY ERROR]", e);
    }
  };

  const handleIrParaLancamentos = () => {
    setIsOpen(false);
    if (setActiveTab) setActiveTab('lancamentos');
  };

  if (!isOpen || loading || contasVencendo.length === 0) return null;

  const totalReceitas = receitas.reduce((acc, c) => acc + c.valor, 0);
  const totalDespesas = despesas.reduce((acc, c) => acc + c.valor, 0);
  const hojeStr = new Date().toISOString().split('T')[0];

  const temApenasReceitas = receitas.length > 0 && despesas.length === 0;
  const temApenasDespesas = despesas.length > 0 && receitas.length === 0;

  // Cores de cabeçalho dinâmicas conforme o tipo
  let headerGradient = 'linear-gradient(135deg, #0284c7, #4f46e5)'; // Multiplo
  let bellColor = '#0284c7';
  let modalBorder = '1px solid rgba(2, 132, 199, 0.4)';
  let tituloHeader = 'LEMBRETES FINANCEIROS!';

  if (abaAtiva === 'receitas' || (temApenasReceitas && abaAtiva === 'todas')) {
    headerGradient = 'linear-gradient(135deg, #10b981, #059669)';
    bellColor = '#10b981';
    modalBorder = '1px solid rgba(16, 185, 129, 0.4)';
    tituloHeader = 'RECEITAS & COMISSÕES A RECEBER!';
  } else if (abaAtiva === 'despesas' || (temApenasDespesas && abaAtiva === 'todas')) {
    headerGradient = 'linear-gradient(135deg, #ef4444, #f97316)';
    bellColor = '#ef4444';
    modalBorder = '1px solid rgba(239, 68, 68, 0.4)';
    tituloHeader = 'CONTAS VENCENDO E EM ATRASO!';
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(12px)'
    }}>
      <div className="modal-box scale-up" style={{
        position: 'relative',
        width: '100%',
        maxWidth: 440,
        borderRadius: 24,
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        background: 'var(--bg-glass-strong)',
        border: modalBorder
      }}>
        {/* Top Header */}
        <div style={{
          background: headerGradient,
          padding: '24px 20px',
          textAlign: 'center',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            width: 60,
            height: 60,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 0 0 8px rgba(255,255,255,0.2), 0 10px 25px rgba(0,0,0,0.4)',
            animation: 'shake-bell 1s ease-in-out infinite'
          }}>
            <BellRing size={32} color={bellColor} />
          </div>

          <h2 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px' }}>
            {tituloHeader}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.92)', margin: '4px 0 0 0', fontSize: 13 }}>
            {receitas.length > 0 && despesas.length > 0 
              ? `${receitas.length} receita(s) e ${despesas.length} conta(s) pendente(s)`
              : `${itensExibidos.length} lançamento(s) pendente(s) aguardando liquidação.`}
          </p>
        </div>

        {/* Abas de Navegação (se tiver receitas e despesas) */}
        {receitas.length > 0 && despesas.length > 0 && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <button
              onClick={() => setAbaAtiva('todas')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: abaAtiva === 'todas' ? 'var(--bg-glass)' : 'transparent',
                borderBottom: abaAtiva === 'todas' ? '2px solid #0284c7' : 'none',
                fontWeight: abaAtiva === 'todas' ? 800 : 600,
                fontSize: 12,
                color: abaAtiva === 'todas' ? '#0284c7' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Todos ({contasVencendo.length})
            </button>
            <button
              onClick={() => setAbaAtiva('receitas')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: abaAtiva === 'receitas' ? 'var(--bg-glass)' : 'transparent',
                borderBottom: abaAtiva === 'receitas' ? '2px solid #10b981' : 'none',
                fontWeight: abaAtiva === 'receitas' ? 800 : 600,
                fontSize: 12,
                color: abaAtiva === 'receitas' ? '#10b981' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <ArrowDownLeft size={14} color="#10b981" /> A Receber ({receitas.length})
            </button>
            <button
              onClick={() => setAbaAtiva('despesas')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: abaAtiva === 'despesas' ? 'var(--bg-glass)' : 'transparent',
                borderBottom: abaAtiva === 'despesas' ? '2px solid #ef4444' : 'none',
                fontWeight: abaAtiva === 'despesas' ? 800 : 600,
                fontSize: 12,
                color: abaAtiva === 'despesas' ? '#ef4444' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <ArrowUpRight size={14} color="#ef4444" /> A Pagar ({despesas.length})
            </button>
          </div>
        )}

        {/* Content Box */}
        <div style={{ padding: '18px 20px', background: 'var(--bg-glass)' }}>
          {/* Card de Valores */}
          {abaAtiva === 'todas' && receitas.length > 0 && despesas.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 14,
                padding: '10px 12px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  A Receber
                </span>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', marginTop: 2 }}>
                  {formatarMoeda(totalReceitas)}
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 14,
                padding: '10px 12px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  A Pagar
                </span>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginTop: 2 }}>
                  {formatarMoeda(totalDespesas)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: (abaAtiva === 'receitas' || temApenasReceitas) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: (abaAtiva === 'receitas' || temApenasReceitas) ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: (abaAtiva === 'receitas' || temApenasReceitas) ? '#10b981' : '#ef4444', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                {(abaAtiva === 'receitas' || temApenasReceitas) ? 'Valor Total a Receber' : 'Valor Total a Pagar'}
              </span>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 900, 
                color: (abaAtiva === 'receitas' || temApenasReceitas) ? '#10b981' : '#ef4444', 
                marginTop: 2 
              }}>
                {formatarMoeda((abaAtiva === 'receitas' || temApenasReceitas) ? totalReceitas : totalDespesas)}
              </div>
            </div>
          )}

          {/* List items */}
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {itensExibidos.map(c => {
              const dt = c.dataVencimento || c.data;
              const isHoje = dt === hojeStr;
              const isReceita = c.tipo === 'receita';
              const borderCor = isReceita ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';

              return (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card)',
                  border: `1px solid ${borderCor}`,
                  borderRadius: 12,
                  padding: '10px 14px'
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: isReceita ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isReceita ? '#10b981' : '#ef4444'
                      }}>
                        {isReceita ? 'Receita / Comissão' : 'Conta a Pagar'}
                      </span>
                      {c.clienteNome && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          • {c.clienteNome}
                        </span>
                      )}
                      {c.fornecedorNome && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          • {c.fornecedorNome}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.descricao}
                    </div>

                    {(c as any).antecipadoPorFeriado ? (
                      <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, marginTop: 2 }}>
                        📅 Vence {dt.split('-').reverse().join('/')}, avisado antes por cair em FDS/Feriado.
                      </div>
                    ) : (c as any).venceEm2Dias ? (
                      <div style={{ fontSize: 11, color: isReceita ? '#10b981' : '#eab308', fontWeight: 700, marginTop: 2 }}>
                        {isReceita ? `💰 A receber em ${(c as any).diasRestantes} dia(s) (${dt.split('-').reverse().join('/')})` : `⏳ Vence em ${(c as any).diasRestantes} dia(s) (${dt.split('-').reverse().join('/')})`}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: isReceita ? '#10b981' : (isHoje ? '#f59e0b' : '#ef4444'), fontWeight: 600, marginTop: 2 }}>
                        {isReceita 
                          ? (isHoje ? '⚡ Recebimento Hoje' : `📅 Previsão: ${dt.split('-').reverse().join('/')}`) 
                          : (isHoje ? '⚡ Vence Hoje' : `⚠️ Atrasado desde ${dt.split('-').reverse().join('/')}`)}
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: 900, 
                    color: isReceita ? '#10b981' : '#ef4444',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}>
                    {isReceita ? `+ ${formatarMoeda(c.valor)}` : `- ${formatarMoeda(c.valor)}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleMarcarPagas}
              className="btn-primary"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                height: 44, 
                borderRadius: 12, 
                background: (abaAtiva === 'receitas' || temApenasReceitas)
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #0284c7, #4f46e5)', 
                border: 'none',
                fontWeight: 800
              }}
            >
              <CheckCircle2 size={16} /> {abaAtiva === 'receitas' ? 'Confirmar Recebimento / Dar Baixa' : abaAtiva === 'despesas' ? 'Confirmar Pagamento / Dar Baixa' : 'Confirmar Liquidação / Dar Baixa'}
            </button>

            <button
              onClick={handleIrParaLancamentos}
              style={{
                width: '100%',
                justifyContent: 'center',
                height: 44,
                borderRadius: 12,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: 14,
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <span>Ir para Extrato / Lançamentos</span> <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
