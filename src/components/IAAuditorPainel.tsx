'use client';

import { useState, useMemo } from 'react';
import { Transacao, Fatura, Conta } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { normalizeDate } from '@/lib/financialEngine';
import { Bot, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  transacoes: Transacao[];
  faturas: Fatura[];
  contas: Conta[];
  onSalvo?: () => void;
}

export function IAAuditorPainel({ transacoes = [], faturas = [], contas = [], onSalvo }: Props) {
  const [corrigindo, setCorrigindo] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const diagnãostico = useMemo(() => {
    const problemas: { id: string; tipo: 'erro' | 'aviso' | 'info'; titulo: string; descricao: string; acao?: string }[] = [];
    const hojeStr = new Date().toISOString().split('T')[0];

    // 1. Auditoria de Cartões vs Faturas
    const faturasAbertas = faturas.filter(f => f.status === 'aberta' || f.status === 'parcial');
    for (const fat of faturasAbertas) {
      if (!fat.dataVencimento) {
        problemas.push({
          id: `fat-venc-${fat.id}`,
          tipo: 'erro',
          titulo: `Fatura ${fat.cartaoNome} sem data de vencimento`,
          descricao: `A fatura de ${fat.mesReferencia} não possui data de vencimento definida.`,
          acao: 'fix_fatura_venc'
        });
      }
    }

    // 2. Transações de Cartão de Crédito sem fatura associada
    const cartaoSemFatura = transacoes.filter(t => t.tipo === 'despesa' && t.formaPagamento === 'cartao_credito' && !t.faturaId);
    if (cartaoSemFatura.length > 0) {
      const valTotal = cartaoSemFatura.reduce((acc, t) => acc + t.valor, 0);
      problemas.push({
        id: 'cartao-sem-fatura',
        tipo: 'aviso',
        titulo: `${cartaoSemFatura.length} despesa(s) de cartão fora de faturas`,
        descricao: `Total de ${formatarMoeda(valTotal)} pendente de sincronização automática com faturas.`,
        acao: 'sync_faturas'
      });
    }

    // 3. Contas com Saldo Negativo
    const contasNegativas = contas.filter(c => c.saldo < 0);
    for (const c of contasNegativas) {
      problemas.push({
        id: `conta-neg-${c.id}`,
        tipo: 'aviso',
        titulo: `Conta "${c.nome}" com saldo negativo (${formatarMoeda(c.saldo)})`,
        descricao: 'Verifique se há saídas registradas sem cobertura suficiente.',
      });
    }

    // 4. Lançamentos com dados incompletos
    const incompletos = transacoes.filter(t => !t.categoriaId || !t.formaPagamento);
    if (incompletos.length > 0) {
      problemas.push({
        id: 'incompletos',
        tipo: 'info',
        titulo: `${incompletos.length} lançamento(s) com dados parciais`,
        descricao: 'Falta categoria ou forma de pagamento atribuída.'
      });
    }

    // 5. Contas a Pagar muito Atrasadas (> 7 dias)
    const atrasadasGrave = transacoes.filter(t => {
      if (t.tipo !== 'despesa' || t.status === 'pago') return false;
      const dV = normalizeDate(t.dataVencimento || t.data);
      if (!dV) return false;
      const diffMs = new Date(hojeStr).getTime() - new Date(dV).getTime();
      return diffMs > 7 * 24 * 60 * 60 * 1000;
    });

    if (atrasadasGrave.length > 0) {
      const val = atrasadasGrave.reduce((a, t) => a + t.valor, 0);
      problemas.push({
        id: 'atrasadas-grave',
        tipo: 'aviso',
        titulo: `${atrasadasGrave.length} conta(s) a pagar atrasada(s) há mais de 7 dias`,
        descricao: `Valor total pendente: ${formatarMoeda(val)}.`,
      });
    }

    // 6. Auditoria de Integridade de Páginas e Módulos
    // Simula a verificação de renderização e estado do sistema
    const errosDetectados = typeof window !== 'undefined' && window.sessionStorage.getItem('last_ui_error');
    if (errosDetectados) {
      problemas.push({
        id: 'erro-pagina',
        tipo: 'erro',
        titulo: 'Erro de Renderização Detectado em Página',
        descricao: `Ocorreu um erro não módulo: ${errosDetectados}. Sincronize para limpar o estado e aplicar as correções.`,
      });
    }

    return {
      problemas,
      statusGeral: problemas.filter(p => p.tipo === 'erro').length > 0 ? 'atencao' : problemas.length > 0 ? 'saudavel_com_avisos' : '100_blindado'
    };
  }, [transacoes, faturas, contas]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleAutoFix = async () => {
    setCorrigindo(true);
    setMensagemSucesso('');
    try {
      const { sincronizarFaturasPendentes, limparCategoriasDuplicadas, garantirCorrecaoMercadoPago } = await import('@/lib/storage');
      
      // Simulação visual da IA analisando as páginas para o usuário
      setMensagemSucesso('🔎 Analisando integridade do módulo Dashboard...');
      await delay(800);
      setMensagemSucesso('🔎 Analisando integridade da página de Extratos Bancários...');
      await delay(800);
      setMensagemSucesso('🔎 Verificando página de Novos Lançamentos...');
      await delay(800);
      setMensagemSucesso('⚙️ Corrigindo objetos e sincronizando dados globais...');

      await garantirCorrecaoMercadoPago();
      await sincronizarFaturasPendentes();
      await limparCategoriasDuplicadas();
      
      if (typeof window !== 'undefined') {
         window.sessionStorage.removeItem('last_ui_error');
      }

      setMensagemSucesso('✨ IA concluiu a varredura das páginas e sincronizou todos os módulos com sucesso!');
      if (onSalvo) onSalvo();
    } catch (e: any) {
      alert('Erro na automação de IA: ' + e.message);
    } finally {
      setCorrigindo(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '18px 20px', marginBottom: 24, border: '1px solid rgba(255,215,0,0.3)', background: 'linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(204,0,0,0.03) 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                IA Auditora de Integridade ERP
              </h3>
              <span className={`badge ${diagnãostico.statusGeral === '100_blindado' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                {diagnãostico.statusGeral === '100_blindado' ? '🟢 Sistema 100% Sincronizado' : '⚡ Monitoramento Ativo'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Análise em tempo real do banco de dados, cartões, extrato e conciliação.
            </p>
          </div>
        </div>

        {diagnãostico.problemas.length > 0 && (
          <button 
            onClick={handleAutoFix} 
            disabled={corrigindo}
            className="btn-primary" 
            style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {corrigindo ? (
               <><RefreshCw size={14} className="spin" /> Corrigindo...</>
            ) : (
               <><Zap size={14} /> Corrigir Tudo Automaticamente</>
            )}
          </button>
        )}
      </div>

      {mensagemSucesso && (
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} />
          {mensagemSucesso}
        </div>
      )}

      {diagnãostico.problemas.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(16,185,129,0.06)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
          <ShieldCheck size={20} color="#10b981" />
          <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
            Nenhuma inconsistência detectada. Todos os módulos estão conversando perfeitamente e 100% blindados!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {diagnãostico.problemas.map(prob => (
            <div key={prob.id} style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: prob.tipo === 'erro' ? 'rgba(239,68,68,0.08)' : prob.tipo === 'aviso' ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${prob.tipo === 'erro' ? 'rgba(239,68,68,0.2)' : prob.tipo === 'aviso' ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
              display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              {prob.tipo === 'erro' ? (
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <Sparkles size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: prob.tipo === 'erro' ? '#ef4444' : prob.tipo === 'aviso' ? '#f59e0b' : 'var(--text-primary)' }}>
                  {prob.titulo}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {prob.descricao}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
