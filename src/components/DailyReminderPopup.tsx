'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellRing, X, Calendar, ArrowRight, CheckCircle2, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, Zap, Clock, Loader2, Volume2, ShieldAlert
} from 'lucide-react';
import { Transacao } from '@/lib/types';
import { getTenantId, setTenantId as setStorageTenantId, formatarMoeda } from '@/lib/storage';
import { playSound } from '@/lib/audio';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';

const INTERVALO_30_MIN_MS = 30 * 60 * 1000; // 30 minutos
const CHAVE_ADIADO_ATE = 'alerta_contas_adiado_ate_ts';
const CHAVE_ULTIMA_NOTIF_NATIVA = 'alerta_contas_ultima_notif_nativa_ts';

export function DailyReminderPopup({
  userId,
  tenantId,
  setActiveTab,
  isDeslogado = false
}: {
  userId?: string;
  tenantId?: string | null;
  setActiveTab?: (tab: string) => void;
  isDeslogado?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [contasVencendo, setContasVencendo] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'todas' | 'receitas' | 'despesas'>('todas');
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [baixandoGeral, setBaixandoGeral] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolver tenantId de forma infalível (prioriza Autocred se aplicável)
  const resolverTenant = useCallback((): string => {
    if (tenantId && tenantId !== 'master') return tenantId;
    if (typeof window !== 'undefined') {
      const savedTenant = localStorage.getItem('last_logged_tenantId') || localStorage.getItem('suporte_impersonate_tenant');
      if (savedTenant && savedTenant !== 'master') return savedTenant;
      try {
        const sess = sessionStorage.getItem('active_session_profile');
        if (sess) {
          const p = JSON.parse(sess);
          if (p?.tenantId && p.tenantId !== 'master') return p.tenantId;
        }
      } catch {}
    }
    const tid = getTenantId();
    if (tid && tid !== 'master') return tid;
    // Default do sistema caso seja Autocred
    return 'autocred-promotora-de-credito';
  }, [tenantId]);

  // Solicitar permissão de notificação nativa do sistema
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Disparar Notificação Nativa do Sistema Operacional (Windows / Android / Mac)
  const enviarNotificacaoNativa = useCallback((titulo: string, corpo: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      // Evita spam de notificações nativas em menos de 5 minutos
      const ultimaNotif = Number(localStorage.getItem(CHAVE_ULTIMA_NOTIF_NATIVA) || '0');
      if (Date.now() - ultimaNotif < 5 * 60 * 1000) return;
      localStorage.setItem(CHAVE_ULTIMA_NOTIF_NATIVA, String(Date.now()));

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: titulo,
          options: {
            body: corpo,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'alerta-contas-pendentes-30min',
            vibrate: [200, 100, 200, 100, 200],
            data: { url: '/' }
          }
        });
      } else {
        new Notification(titulo, {
          body: corpo,
          icon: '/icon-192.png',
          tag: 'alerta-contas-pendentes-30min'
        });
      }
    } catch (e) {
      console.warn('[NOTIFICAÇÃO NATIVA FALHOU]', e);
    }
  }, []);

  // Feriados Nacionais Fixos do Brasil
  const FERIADOS_NACIONAIS = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
  ];

  const isFeriadoOuFds = useCallback((dataStr: string) => {
    const d = new Date(dataStr + 'T12:00:00');
    const day = d.getDay();
    if (day === 0 || day === 6) return true;
    const mesDia = dataStr.substring(5);
    return FERIADOS_NACIONAIS.includes(mesDia);
  }, []);

  const getDiaUtilAnterior = useCallback((dataStr: string) => {
    let date = new Date(dataStr + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    while (isFeriadoOuFds(date.toISOString().split('T')[0])) {
      date.setDate(date.getDate() - 1);
    }
    return date.toISOString().split('T')[0];
  }, [isFeriadoOuFds]);

  // Data atual no fuso horário local do usuário
  const getHojeStr = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }, []);

  // Monitoramento em tempo real com onSnapshot do Firestore
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tid = resolverTenant();
    if (tid) setStorageTenantId(tid);

    const colPath = (!tid || tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2')
      ? 'transacoes'
      : `tenants/${tid}/transacoes`;

    const q = query(collection(getDb(), colPath));

    const unsub = onSnapshot(q, (snapshot) => {
      const hojeStr = getHojeStr();
      const todas = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transacao));

      // Filtra despesas ou receitas pendentes vencendo hoje ou atrasadas
      const pendentes = todas.filter(t => {
        if (t.status === 'pago') return false;
        const dtVenc = t.dataVencimento || t.data;
        if (!dtVenc) return false;

        // Vencendo hoje ou atrasada
        if (dtVenc <= hojeStr) return true;

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

      // Ordena: mais atrasadas primeiro
      pendentes.sort((a, b) => {
        const dtA = a.dataVencimento || a.data || '';
        const dtB = b.dataVencimento || b.data || '';
        return dtA.localeCompare(dtB);
      });

      setContasVencendo(pendentes);
      setLoading(false);

      if (pendentes.length > 0) {
        const temRec = pendentes.some(t => t.tipo === 'receita');
        const temDesp = pendentes.some(t => t.tipo !== 'receita');
        if (temRec && !temDesp) setAbaAtiva('receitas');
        else if (temDesp && !temRec) setAbaAtiva('despesas');

        // Checar se o usuário adiou o popup por 30 minutos
        const adiadoAte = Number(localStorage.getItem(CHAVE_ADIADO_ATE) || '0');
        const agora = Date.now();

        if (agora >= adiadoAte) {
          setIsOpen(true);
          playSound('aviso');

          const totRec = pendentes.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0);
          const totDesp = pendentes.filter(t => t.tipo !== 'receita').reduce((s, t) => s + (t.valor || 0), 0);

          let tituloNotif = '⚠️ Contas Pendentes de Hoje!';
          let corpoNotif = `Você possui ${pendentes.length} conta(s) pendente(s) que precisam ser baixadas.`;

          if (temDesp && temRec) {
            tituloNotif = `⚠️ ${pendentes.length} Contas Pendentes Hoje!`;
            corpoNotif = `A Pagar: ${formatarMoeda(totDesp)} • A Receber: ${formatarMoeda(totRec)}. Toque para baixar.`;
          } else if (temDesp) {
            tituloNotif = `🚨 ${pendentes.length} Conta(s) a Pagar Vencendo Hoje!`;
            corpoNotif = `Total a Pagar: ${formatarMoeda(totDesp)}. Dê baixa antes que vença.`;
          } else if (temRec) {
            tituloNotif = `💰 ${pendentes.length} Recebimento(s) Previstos para Hoje!`;
            corpoNotif = `Total a Receber: ${formatarMoeda(totRec)}. Confirme a entrada em caixa.`;
          }

          enviarNotificacaoNativa(tituloNotif, corpoNotif);
        }
      } else {
        // Todas foram baixadas!
        setIsOpen(false);
        localStorage.removeItem(CHAVE_ADIADO_ATE);
      }
    }, (err) => {
      console.warn('[DAILY POPUP SNAPSHOT ERROR]', err);
      setLoading(false);
    });

    return () => unsub();
  }, [resolverTenant, getHojeStr, isFeriadoOuFds, getDiaUtilAnterior, enviarNotificacaoNativa]);

  // Listener para evento customizado de abertura manual via Sininho ou Menus
  useEffect(() => {
    const handleForcarAbertura = () => {
      setIsOpen(true);
      playSound('aviso');
    };
    window.addEventListener('abrir-popup-lembrete', handleForcarAbertura);
    return () => window.removeEventListener('abrir-popup-lembrete', handleForcarAbertura);
  }, []);

  // Intervalo rigoroso a cada 20 segundos para reabrir popup quando bater os 30 minutos
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (contasVencendo.length > 0) {
        const adiadoAte = Number(localStorage.getItem(CHAVE_ADIADO_ATE) || '0');
        if (Date.now() >= adiadoAte && !isOpen) {
          setIsOpen(true);
          playSound('aviso');

          const totRec = contasVencendo.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0);
          const totDesp = contasVencendo.filter(t => t.tipo !== 'receita').reduce((s, t) => s + (t.valor || 0), 0);
          enviarNotificacaoNativa(
            `🔔 Lembrete: ${contasVencendo.length} Contas Pendentes!`,
            `Total Despesas: ${formatarMoeda(totDesp)} | Total Receitas: ${formatarMoeda(totRec)}`
          );
        }
      }
    }, 20000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [contasVencendo, isOpen, enviarNotificacaoNativa]);

  const receitas = contasVencendo.filter(c => c.tipo === 'receita');
  const despesas = contasVencendo.filter(c => c.tipo !== 'receita');

  const itensExibidos = abaAtiva === 'receitas'
    ? receitas
    : abaAtiva === 'despesas'
    ? despesas
    : contasVencendo;

  // Baixa Rápida em 1 Clique para item individual diretamente no Firestore
  const handleBaixarIndividual = async (transacao: Transacao) => {
    try {
      setBaixandoId(transacao.id);
      const hojeStr = getHojeStr();
      const tid = resolverTenant();
      const colPath = (!tid || tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2')
        ? 'transacoes'
        : `tenants/${tid}/transacoes`;

      // Atualiza o documento no Firestore
      await updateDoc(doc(getDb(), colPath, transacao.id), {
        status: 'pago',
        dataPagamento: hojeStr
      });

      // Som imediato
      playSound(transacao.tipo === 'receita' ? 'recebimento' : 'pagamento');

      // Se restar apenas essa
      if (contasVencendo.length <= 1) {
        playSound('sucesso');
        setMensagemSucesso('🎉 Todas as contas de hoje foram baixadas com sucesso!');
        localStorage.removeItem(CHAVE_ADIADO_ATE);
        enviarNotificacaoNativa('✅ Contas do Dia Concluídas', 'Todas as contas e recebimentos de hoje foram baixados!');
        setTimeout(() => {
          setIsOpen(false);
          setMensagemSucesso(null);
        }, 1800);
      }
    } catch (err) {
      console.error('[ERRO AO BAIXAR INDIVIDUAL]', err);
    } finally {
      setBaixandoId(null);
    }
  };

  // Baixa Rápida de Todas as Contas Exibidas
  const handleMarcarTodasPagas = async () => {
    try {
      setBaixandoGeral(true);
      const hojeStr = getHojeStr();
      const tid = resolverTenant();
      const colPath = (!tid || tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2')
        ? 'transacoes'
        : `tenants/${tid}/transacoes`;

      for (const item of itensExibidos) {
        await updateDoc(doc(getDb(), colPath, item.id), {
          status: 'pago',
          dataPagamento: hojeStr
        });
      }

      playSound('sucesso');
      setMensagemSucesso(`✅ ${itensExibidos.length} lançamento(s) baixados com sucesso!`);

      if (itensExibidos.length >= contasVencendo.length) {
        localStorage.removeItem(CHAVE_ADIADO_ATE);
        enviarNotificacaoNativa('✅ Contas do Dia Concluídas', 'Todas as contas e recebimentos de hoje foram baixados!');
        setTimeout(() => {
          setIsOpen(false);
          setMensagemSucesso(null);
        }, 1800);
      } else {
        setTimeout(() => {
          setMensagemSucesso(null);
        }, 1800);
      }
    } catch (e) {
      console.error('[ERRO AO MARCAR TODAS PAGAS]', e);
    } finally {
      setBaixandoGeral(false);
    }
  };

  // Botão "Lembrar em 30 minutos"
  const handleLembrarEm30Min = () => {
    setIsOpen(false);
    localStorage.setItem(CHAVE_ADIADO_ATE, String(Date.now() + INTERVALO_30_MIN_MS));
  };

  const handleIrParaLancamentos = () => {
    setIsOpen(false);
    if (setActiveTab) setActiveTab('lancamentos');
  };

  if (!isOpen || loading || contasVencendo.length === 0) return null;

  const totalReceitas = receitas.reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalDespesas = despesas.reduce((acc, c) => acc + (c.valor || 0), 0);
  const hojeStr = getHojeStr();

  const temApenasReceitas = receitas.length > 0 && despesas.length === 0;
  const temApenasDespesas = despesas.length > 0 && receitas.length === 0;

  let headerGradient = 'linear-gradient(135deg, #0284c7, #4f46e5)';
  let modalBorder = '1px solid rgba(2, 132, 199, 0.4)';
  let tituloHeader = 'LEMBRETE DE CONTAS DO DIA!';

  if (abaAtiva === 'receitas' || (temApenasReceitas && abaAtiva === 'todas')) {
    headerGradient = 'linear-gradient(135deg, #10b981, #059669)';
    modalBorder = '1px solid rgba(16, 185, 129, 0.4)';
    tituloHeader = 'RECEITAS & COMISSÕES A RECEBER HOJE!';
  } else if (abaAtiva === 'despesas' || (temApenasDespesas && abaAtiva === 'todas')) {
    headerGradient = 'linear-gradient(135deg, #ef4444, #f97316)';
    modalBorder = '1px solid rgba(239, 68, 68, 0.4)';
    tituloHeader = 'CONTAS A PAGAR VENCENDO HOJE!';
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
      background: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="modal-box scale-up" style={{
        position: 'relative',
        width: '100%',
        maxWidth: 540,
        background: 'var(--bg-card, #ffffff)',
        borderRadius: 20,
        border: modalBorder,
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.45)',
        overflow: 'hidden'
      }}>
        {/* Banner de Mensagem de Sucesso */}
        {mensagemSucesso && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '12px 16px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {mensagemSucesso}
          </div>
        )}

        {/* Header Elegante */}
        <div style={{
          background: headerGradient,
          padding: '18px 20px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={handleLembrarEm30Min}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Lembrar novamente em 30 minutos"
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BellRing size={22} className="animate-pulse" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9 }}>
                Aviso a Cada 30 Minutos • Licença Ativa
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {tituloHeader}
              </h3>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>Alerta ativo até que todos os lançamentos sejam baixados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação (Todas / A Receber / A Pagar) */}
        {receitas.length > 0 && despesas.length > 0 && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.02)',
            padding: '4px 12px'
          }}>
            <button
              onClick={() => setAbaAtiva('todas')}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: abaAtiva === 'todas' ? 800 : 500,
                color: abaAtiva === 'todas' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: abaAtiva === 'todas' ? 'var(--bg-card)' : 'transparent',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              Todas ({contasVencendo.length})
            </button>
            <button
              onClick={() => setAbaAtiva('receitas')}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: abaAtiva === 'receitas' ? 800 : 500,
                color: abaAtiva === 'receitas' ? '#10b981' : 'var(--text-muted)',
                background: abaAtiva === 'receitas' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <ArrowDownLeft size={14} color="#10b981" /> A Receber ({receitas.length})
            </button>
            <button
              onClick={() => setAbaAtiva('despesas')}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: abaAtiva === 'despesas' ? 800 : 500,
                color: abaAtiva === 'despesas' ? '#ef4444' : 'var(--text-muted)',
                background: abaAtiva === 'despesas' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <ArrowUpRight size={14} color="#ef4444" /> A Pagar ({despesas.length})
            </button>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div style={{ padding: '16px 20px', background: 'var(--bg-glass)' }}>
          {/* Card de Valores Totais */}
          {abaAtiva === 'todas' && receitas.length > 0 && despesas.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                  A Receber Hoje
                </span>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#10b981', marginTop: 1 }}>
                  {formatarMoeda(totalReceitas)}
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                  A Pagar Hoje
                </span>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#ef4444', marginTop: 1 }}>
                  {formatarMoeda(totalDespesas)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: (abaAtiva === 'receitas' || temApenasReceitas) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: (abaAtiva === 'receitas' || temApenasReceitas) ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 14,
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: (abaAtiva === 'receitas' || temApenasReceitas) ? '#10b981' : '#ef4444',
                textTransform: 'uppercase'
              }}>
                {(abaAtiva === 'receitas' || temApenasReceitas) ? 'Total a Receber Hoje' : 'Total a Pagar Hoje'}
              </span>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: (abaAtiva === 'receitas' || temApenasReceitas) ? '#10b981' : '#ef4444',
                marginTop: 2
              }}>
                {formatarMoeda((abaAtiva === 'receitas' || temApenasReceitas) ? totalReceitas : totalDespesas)}
              </div>
            </div>
          )}

          {/* Lista com Baixa Rápida em Cada Linha */}
          <div style={{
            maxHeight: 240,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 14
          }}>
            {itensExibidos.map(c => {
              const dt = c.dataVencimento || c.data || '';
              const isHoje = dt === hojeStr;
              const isReceita = c.tipo === 'receita';
              const borderCor = isReceita ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
              const emBaixa = baixandoId === c.id;

              return (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card)',
                  border: `1px solid ${borderCor}`,
                  borderRadius: 12,
                  padding: '9px 12px',
                  gap: 8
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                        {isReceita ? 'Receita' : 'Despesa'}
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

                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}>
                      {c.descricao}
                    </div>

                    {(c as any).antecipadoPorFeriado ? (
                      <div style={{ fontSize: 10.5, color: '#3b82f6', fontWeight: 600, marginTop: 1 }}>
                        📅 Vence {dt.split('-').reverse().join('/')} (antecipado por FDS/Feriado)
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: isReceita ? '#10b981' : (isHoje ? '#f59e0b' : '#ef4444'), fontWeight: 600, marginTop: 1 }}>
                        {isReceita
                          ? (isHoje ? '⚡ Recebimento Previsto Hoje' : `⚠️ Recebimento Pendente desde ${dt.split('-').reverse().join('/')}`)
                          : (isHoje ? '⚡ Vence Hoje' : `⚠️ Atrasado desde ${dt.split('-').reverse().join('/')}`)}
                      </div>
                    )}
                  </div>

                  {/* Valor + Botão de Baixa Rápida Individual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isReceita ? '#10b981' : '#ef4444',
                      textAlign: 'right',
                      whiteSpace: 'nowrap'
                    }}>
                      {isReceita ? `+${formatarMoeda(c.valor)}` : `-${formatarMoeda(c.valor)}`}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBaixarIndividual(c)}
                      disabled={emBaixa || baixandoGeral}
                      style={{
                        background: isReceita ? '#10b981' : '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: isReceita ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.1s ease'
                      }}
                      title={isReceita ? 'Confirmar recebimento agora' : 'Confirmar pagamento agora'}
                    >
                      {emBaixa ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      {isReceita ? 'Receber' : 'Pagar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões de Ação do Rodapé */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleMarcarTodasPagas}
              disabled={baixandoGeral || itensExibidos.length === 0}
              className="btn-primary hover-lift active-press"
              style={{
                width: '100%',
                justifyContent: 'center',
                height: 42,
                borderRadius: 12,
                background: (abaAtiva === 'receitas' || temApenasReceitas)
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #0284c7, #4f46e5)',
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
              }}
            >
              {baixandoGeral ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {baixandoGeral
                ? 'Baixando lançamentos...'
                : (abaAtiva === 'receitas'
                  ? `Dar Baixa em Todas as Receitas (${receitas.length})`
                  : abaAtiva === 'despesas'
                  ? `Dar Baixa em Todas as Despesas (${despesas.length})`
                  : `Dar Baixa Geral em Todas (${contasVencendo.length})`)}
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleLembrarEm30Min}
                className="btn-secondary hover-lift active-press"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  height: 38,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  gap: 6
                }}
                title="Fechar e lembrar novamente em 30 minutos se ainda houver contas não baixadas"
              >
                <Clock size={14} /> Lembrar em 30 min
              </button>

              {!isDeslogado && (
                <button
                  type="button"
                  onClick={handleIrParaLancamentos}
                  className="btn-secondary hover-lift active-press"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    height: 38,
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    gap: 6
                  }}
                >
                  <span>Ver Extrato</span> <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
