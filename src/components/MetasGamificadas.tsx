'use client';

import React, { useState, useEffect } from 'react';
import { Target, Trophy, Flame, TrendingDown, TrendingUp, AlertTriangle, PlusCircle, CheckCircle2, Edit2, Trash2, Wand2, CalendarDays, Wallet, Shield, Zap, Medal } from 'lucide-react';
import { formatarMoeda, getTransacoes, subscribeTransacoes, salvarMetasConfig, getMetasConfig, subscribeMetasConfig } from '@/lib/storage';
import { Transacao } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrcamentoMensal {
  id: string;
  categoriaNome: string;
  limite: number;
}

export function MetasGamificadas() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Na versão real, os orçamentos vêm do Firebase. Aqui usamos LocalStorage para agilidade.
  const [orcamentos, setOrcamentos] = useState<OrcamentoMensal[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [orcamentoMaximo, setOrcamentoMaximo] = useState<number>(0);
  
  // Modal States
  const [modalMetaOpen, setModalMetaOpen] = useState(false);
  const [modalMetaEditId, setModalMetaEditId] = useState<string | null>(null);
  const [metaFormCategoria, setMetaFormCategoria] = useState('');
  const [metaFormValor, setMetaFormValor] = useState('');

  useEffect(() => {
    // Carrega do Firebase na inicialização
    const initMetas = async () => {
      const config = await getMetasConfig();
      if (config.orcamentos && config.orcamentos.length > 0) {
         setOrcamentos(config.orcamentos);
         setOrcamentoMaximo(config.orcamentoMaximo || 0);
      } else {
         // Se não houver nada não Firebase, tenta migrar do localStorage (se existir)
         const loaded = localStorage.getItem('sfp_orcamentos');
         if (loaded) {
            const orcLocal = JSON.parse(loaded);
            const maxLocal = parseFloat(localStorage.getItem('sfp_orcamento_maximo') || '0');
            setOrcamentos(orcLocal);
            setOrcamentoMaximo(maxLocal);
            // Migra para o Firebase automaticamente
            await salvarMetasConfig(orcLocal, maxLocal);
         } else {
            // Metas padrão para demonstração inicial se ambos estiverem vazios
            const padrao = [
              { id: '1', categoriaNome: 'Mercado', limite: 2000 },
              { id: '2', categoriaNome: 'Lazer', limite: 800 },
              { id: '3', categoriaNome: 'Transporte', limite: 500 }
            ];
            setOrcamentos(padrao);
            await salvarMetasConfig(padrao, 0);
         }
      }
    };
    initMetas();

    const init = async () => {
      const t = await getTransacoes();
      setTransacoes(t);
      setLoading(false);
    };
    init();
    
    const unsubTransacoes = subscribeTransacoes(data => setTransacoes(data));
    const unsubMetas = subscribeMetasConfig(data => {
       if (data.orcamentos) setOrcamentos(data.orcamentos);
       if (data.orcamentoMaximo !== undefined) setOrcamentoMaximo(data.orcamentoMaximo);
    });

    return () => {
      unsubTransacoes();
      unsubMetas();
    };
  }, []);

  const salvarModalMeta = () => {
    if (!metaFormCategoria.trim()) return alert("Preencha a categoria");
    const valor = parseFloat(metaFormValor.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido");
    
    const cat = metaFormCategoria;
    const oldValor = modalMetaEditId 
      ? (orcamentos.find(o => o.id === modalMetaEditId)?.limite || 0)
      : (orcamentos.find(o => o.categoriaNome.toLowerCase() === cat.toLowerCase())?.limite || 0);

    const diferenca = valor - oldValor;
    const totalAtual = orcamentos.reduce((acc, o) => acc + o.limite, 0);

    if (diferenca > 0 && orcamentoMaximo > 0 && (totalAtual + diferenca) > orcamentoMaximo) {
      const disp = Math.max(0, (orcamentoMaximo - totalAtual) + oldValor);
      alert(`⚠️ ERRO: Orçamento Global Excedido!\n\nVocê tentou aumentar para R$ ${valor}, mas o teto permitido (considerando as outras metas) é R$ ${disp}.\nReduza outra meta primeiro.`);
      return;
    }

    const novos = [...orcamentos];
    if (modalMetaEditId) {
       const idx = novos.findIndex(o => o.id === modalMetaEditId);
       if (idx >= 0) {
         novos[idx].categoriaNome = cat;
         novos[idx].limite = valor;
       }
    } else {
       const idx = novos.findIndex(o => o.categoriaNome.toLowerCase() === cat.toLowerCase());
       if (idx >= 0) {
         novos[idx].limite = valor;
       } else {
         novos.push({ id: Date.now().toString(), categoriaNome: cat, limite: valor });
       }
    }

    setOrcamentos(novos);
    salvarMetasConfig(novos, orcamentoMaximo);
    
    // Atualizamos o LocalStorage tbm como fallback provisório
    localStorage.setItem('sfp_orcamentos', JSON.stringify(novos));
    
    setModalMetaOpen(false);
  };

  const handleNovoOrcamento = () => {
    if (orcamentoMaximo > 0) {
      const totalAtual = orcamentos.reduce((acc, o) => acc + o.limite, 0);
      const disp = orcamentoMaximo - totalAtual;
      if (disp <= 0) {
        alert("Seu Orçamento Máximo Global já está 100% alocado! Você não pode criar novas metas sem reduzir as outras ou aumentar o limite global.");
        return;
      }
    }
    setModalMetaEditId(null);
    setMetaFormCategoria('');
    setMetaFormValor('');
    setModalMetaOpen(true);
  };

  const handleDefinirOrcamentoMaximo = () => {
    const atual = orcamentoMaximo > 0 ? orcamentoMaximo.toString() : '';
    const valorStr = window.prompt("Qual o SEU ORÇAMENTO MÁXIMO GLOBAL mensal? (0 para remover limite)", atual);
    if (valorStr === null) return; // cancel
    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor < 0) return alert("Valor inválido.");
    
    const totalAlocado = orcamentos.reduce((acc, o) => acc + o.limite, 0);
    if (valor > 0 && valor < totalAlocado) {
      if (!window.confirm(`Atenção: O valor que você informou (R$ ${valor}) é MENOR do que a soma das suas metas atuais (R$ ${totalAlocado}).\nDeseja prosseguir mesmo assim? Você precisará reduzir suas metas para o sistema liberar novos cadastros.`)) {
        return;
      }
    }

    setOrcamentoMaximo(valor);
    salvarMetasConfig(orcamentos, valor);
  };

  const handleAutoGerarMetas = () => {
    if (transacoes.length === 0) {
      alert("Você ainda não tem transações cadastradas para análise.");
      return;
    }
    
    // Calcula gasto total por categoria
    const gastosPorCategoria: Record<string, number> = {};
    transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
      const cat = t.categoriaNome || 'Outros';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + t.valor;
    });

    // Ordena as categorias que mais gastou
    const topCategorias = Object.entries(gastosPorCategoria)
      .sort((a, b) => b[1] - a[1]);

    if (topCategorias.length === 0) {
      alert("Nenhuma despesa encontrada para gerar metas.");
      return;
    }

    if (!window.confirm(`A Inteligência do sistema identificou suas categorias de maiores gastos.\nDeseja auto-gerar orçamentos baseados não seu histórico?`)) return;

    const novosOrcamentos = [...orcamentos];
    let adicionados = 0;

    topCategorias.forEach(([cat, gastoTotal]) => {
      const existe = novosOrcamentos.find(o => o.categoriaNome.toLowerCase() === cat.toLowerCase());
      if (!existe && adicionados < 50) { // limite de segurança
        // Estipula um limite baseado não histórico. Arredonda para a centena superior.
        let limiteSugerido = Math.ceil(gastoTotal / 100) * 100;
        if (limiteSugerido < 50) limiteSugerido = 50;
        novosOrcamentos.push({ id: Date.now().toString() + Math.random(), categoriaNome: cat, limite: limiteSugerido });
        adicionados++;
      }
    });

    if (adicionados > 0) {
      setOrcamentos(novosOrcamentos);
      salvarMetasConfig(novosOrcamentos, orcamentoMaximo);
      alert(`✅ Sucesso! O sistema criou ${adicionados} novas metas automaticamente para as suas categorias de maior impacto!`);
    } else {
      alert("Você já possui metas para todas as suas principais categorias!");
    }
  };

  const handleEditarOrcamento = (orc: OrcamentoMensal) => {
    setModalMetaEditId(orc.id);
    setMetaFormCategoria(orc.categoriaNome);
    setMetaFormValor(orc.limite.toString());
    setModalMetaOpen(true);
  };

  const excluirMeta = (id: string) => {
    if (!confirm("Deseja realmente excluir esta meta?")) return;
    const novos = orcamentos.filter(o => o.id !== id);
    setOrcamentos(novos);
    salvarMetasConfig(novos, orcamentoMaximo);
  };

  const salvarOrcamentoMaximo = (e: React.FocusEvent<HTMLInputElement>) => {
    const valor = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(valor) && valor >= 0) {
       setOrcamentoMaximo(valor);
       salvarMetasConfig(orcamentos, valor);
    } else {
       e.target.value = orcamentoMaximo > 0 ? orcamentoMaximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando Metas...</div>;

  const dataHoje = new Date();
  const mesAtualReal = format(dataHoje, 'yyyy-MM');
  const isMesAtual = mesSelecionado === mesAtualReal;

  const [anãoSelec, mesSelec] = mesSelecionado.split('-');
  const dataReferencia = new Date(parseInt(anãoSelec), parseInt(mesSelec) - 1, 15);
  
  const mesNome = format(dataReferencia, 'MMMM', { locale: ptBR });
  const anãoAtual = format(dataReferencia, 'yyyy');
  const mesNomeFormatado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
  const diaAtual = dataHoje.getDate();
  const diasNoMes = new Date(parseInt(anãoSelec), parseInt(mesSelec), 0).getDate();

  const despesasDoMes = transacoes.filter(t => t.tipo === 'despesa' && String(t.data || '').startsWith(mesSelecionado));

  const calcularGastoCategoria = (nome: string) => {
    return despesasDoMes
      .filter(t => t.categoriaNome?.toLowerCase() === nome.toLowerCase())
      .reduce((s, t) => s + t.valor, 0);
  };

  const totalOrcamento = orcamentos.reduce((acc, o) => acc + o.limite, 0);
  const totalGastoMetas = orcamentos.reduce((acc, o) => acc + calcularGastoCategoria(o.categoriaNome), 0);
  const percentualAlocado = orcamentoMaximo > 0 ? Math.min(100, Math.round((totalOrcamento / orcamentoMaximo) * 100)) : 0;
  
  // O percentual gasto é sobre as metas ou sobre o orçamento global? 
  // O usuário quer saber o quanto ainda tem para gastar não mês globalmente.
  const percentualGastoGlobal = orcamentoMaximo > 0 ? Math.min(100, Math.round((totalGastoMetas / orcamentoMaximo) * 100)) : 
    (totalOrcamento > 0 ? Math.min(100, Math.round((totalGastoMetas / totalOrcamento) * 100)) : 0);
  const globalDisponivelMeta = Math.max(0, orcamentoMaximo - totalOrcamento);
  const globalDisponivelGasto = Math.max(0, orcamentoMaximo - totalGastoMetas);

  const bateramMeta = orcamentos.filter(o => {
    const gasto = calcularGastoCategoria(o.categoriaNome);
    return gasto > 0 && gasto <= o.limite;
  }).length;

  const estouraram = orcamentos.filter(o => {
    const gasto = calcularGastoCategoria(o.categoriaNome);
    return gasto > o.limite;
  }).length;

  // Lógica de Conquistas (Badges)
  const isGuardiao = percentualGastoGlobal < 50 && totalGastoMetas > 0;
  const isEstrategista = bateramMeta >= 3 && estouraram === 0;
  const faltamDias = diasNoMes - diaAtual;
  const isSobrevivente = faltamDias <= 5 && faltamDias >= 0 && globalDisponivelGasto > 0;
  
  // Para a Animação do Gráfico Circular
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentualAlocado / 100) * circumference;
  const strokeColor = percentualAlocado > 95 ? '#ef4444' : (percentualAlocado > 75 ? '#f59e0b' : '#10b981');

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 160 }}>
      {/* HEADER METAS */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', // Indigo premium
        borderRadius: 24, padding: '32px', marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '0 12px 32px rgba(49, 46, 129, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
            <Trophy size={32} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>Metas & Orçamentos</h1>
            <p style={{ fontSize: 14, color: '#a5b4fc', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} /> 
              Referência Mensal: <strong>{mesNomeFormatado} de {anãoAtual}</strong>
            </p>
          </div>
        </div>

        {/* SELETOR DE MÊS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '6px', background: 'var(--bg-secondary)', borderRadius: 12, width: 'fit-content' }}>
          <button 
            onClick={() => {
              const dateAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 1, 15);
              setMesSelecionado(format(dateAnterior, 'yyyy-MM'));
            }}
            style={{ 
              padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
              background: !isMesAtual ? 'var(--bg-primary)' : 'transparent',
              color: !isMesAtual ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: !isMesAtual ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Mês Anterior
          </button>
          <button 
            onClick={() => setMesSelecionado(mesAtualReal)}
            style={{ 
              padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
              background: isMesAtual ? 'var(--bg-primary)' : 'transparent',
              color: isMesAtual ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isMesAtual ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Mês Atual
          </button>
        </div>
        </div>

        {/* PAINEL DE CONQUISTAS */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 800, marginRight: 8 }}>
            🏆 Troféus do Mês:
          </div>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: isGuardiao ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 12, opacity: isGuardiao ? 1 : 0.4 }}>
              <Shield size={16} color={isGuardiao ? "#34d399" : "#a5b4fc"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isGuardiao ? "#34d399" : "#a5b4fc" }}>Guardião</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: isEstrategista ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 12, opacity: isEstrategista ? 1 : 0.4 }}>
              <Target size={16} color={isEstrategista ? "#f59e0b" : "#a5b4fc"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isEstrategista ? "#f59e0b" : "#a5b4fc" }}>Estrategista</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: isSobrevivente ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 12, opacity: isSobrevivente ? 1 : 0.4 }}>
              <Zap size={16} color={isSobrevivente ? "#a855f7" : "#a5b4fc"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isSobrevivente ? "#a855f7" : "#a5b4fc" }}>Sobrevivente</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%' }}>
          {/* PAINEL GLOBAL */}
          <div style={{ flex: 1, minWidth: 280, background: 'rgba(255,255,255,0.1)', padding: '16px 20px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Wallet size={24} color="#34d399" />
                <div>
                  <div style={{ fontSize: 12, color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Orçamento Global (Mês)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                    {orcamentoMaximo > 0 ? formatarMoeda(orcamentoMaximo) : 'Não definido'}
                  </div>
                </div>
              </div>
              <button onClick={handleDefinirOrcamentoMaximo} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', padding: '6px 12px', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Edit2 size={12} /> {orcamentoMaximo > 0 ? 'Editar' : 'Definir'}
              </button>
            </div>

            {orcamentoMaximo > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* Gráfico Circular */}
                  <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <circle 
                        cx="45" cy="45" r={radius} 
                        fill="none" 
                        stroke={strokeColor} 
                        strokeWidth="8" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={strokeDashoffset} 
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
                        transform="rotate(-90 45 45)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{percentualAlocado}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: percentualAlocado > 95 ? '#fca5a5' : (percentualAlocado > 75 ? '#fcd34d' : '#a5b4fc'), fontWeight: 600 }}>
                        Projetado (Metas):<br/>{formatarMoeda(totalOrcamento)}
                      </span>
                      <span style={{ color: globalDisponivelMeta > 0 ? '#34d399' : '#f87171', fontWeight: 700, textAlign: 'right' }}>
                        {globalDisponivelMeta > 0 ? `Livre para metas:\n${formatarMoeda(globalDisponivelMeta)}` : 'Estourado!'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Total Gasto do Mês: {formatarMoeda(totalGastoMetas)}</span>
                  <span style={{ color: globalDisponivelGasto > 0 ? '#34d399' : '#f87171', fontWeight: 800, fontSize: 13 }}>
                    Pode Gastar: {formatarMoeda(globalDisponivelGasto)}
                  </span>
                </div>
              </div>
            )}

            {orcamentoMaximo === 0 && (
              <div style={{ fontSize: 13, color: '#a5b4fc', marginTop: 4 }}>
                A soma das suas metas atuais é {formatarMoeda(totalOrcamento)}. Clique em 'Definir' para travar um teto máximo de gastos não mês.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>Metas Seguras</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#34d399' }}>{bateramMeta} <Flame size={18} style={{ display: 'inline', marginBottom: 4 }} /></div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.15)', padding: '16px 24px', borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: '#fca5a5', textTransform: 'uppercase', fontWeight: 700 }}>Estouradas</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#f87171' }}>{estouraram}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={handleAutoGerarMetas} className="btn-primary" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #ec4899, #d946ef)', border: 'none' }}>
          <Wand2 size={16} /> Descobrir Maiores Gastos (Auto-Gerar)
        </button>
        <button onClick={handleNovoOrcamento} className="btn-primary" style={{ padding: '8px 16px', background: '#4f46e5' }}>
          <PlusCircle size={16} /> Novo Orçamento Manual
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {orcamentos.map(orc => {
          const gasto = calcularGastoCategoria(orc.categoriaNome);
          const percentual = Math.min(100, Math.round((gasto / orc.limite) * 100));
          
          let statusColor = '#34d399'; // Verde
          let alertMsg = 'No controle';
          let AlertIcon = CheckCircle2;
          
          if (percentual >= 100) {
            statusColor = '#ef4444'; // Vermelho
            alertMsg = 'Orçamento estourado!';
            AlertIcon = AlertTriangle;
          } else if (percentual >= 80) {
            statusColor = '#f59e0b'; // Laranja
            alertMsg = 'Atenção, limite próximo!';
            AlertIcon = AlertTriangle;
          }

          let aiSuggestion = null;
          let aiColor = 'var(--text-muted)';
          
          if (isMesAtual && percentual < 100 && gasto > 0 && diaAtual < diasNoMes) {
            const gastoDiarioMedio = gasto / diaAtual;
            const projecaoFinal = gastoDiarioMedio * diasNoMes;
            
            if (projecaoFinal > orc.limite) {
              const diasParaEstourar = Math.floor((orc.limite - gasto) / gastoDiarioMedio);
              const dataEstouro = new Date();
              dataEstouro.setDate(dataEstouro.getDate() + diasParaEstourar);
              aiColor = '#f59e0b';
              
              if (diasParaEstourar <= 0) {
                 aiSuggestion = "⚠️ Atenção: Mantendo a média diária, a meta vai estourar ainda hoje!";
              } else {
                 aiSuggestion = `🤖 Dica da IA: Se continuar essa média de gasto com ${orc.categoriaNome}, a meta vai estourar não dia ${format(dataEstouro, 'dd/MM')}.`;
              }
            } else {
                 aiColor = '#10b981';
                 aiSuggestion = `🤖 Dica da IA: Ritmo excelente! Você vai fechar o mês com folga nesta categoria.`;
            }
          } else if (percentual >= 100) {
                 aiColor = '#ef4444';
                 aiSuggestion = `⚠️ Meta estourada! Tente compensar reduzindo os gastos nas outras categorias.`;
          } else if (gasto === 0) {
                 aiSuggestion = `🤖 Dica da IA: Nenhum gasto registrado ainda este mês! Muito bem!`;
          }

          return (
            <div key={orc.id} className="modern-card card-hover-effect" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {orc.categoriaNome}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEditarOrcamento(orc)} className="action-icon-btn" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar Orçamento">
                        <Edit2 size={14} color="var(--text-muted)" />
                      </button>
                      <button onClick={() => excluirMeta(orc.id)} className="action-icon-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Excluir Orçamento">
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Limite: {formatarMoeda(orc.limite)}</div>
                </div>
                <div style={{ background: `${statusColor}15`, padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertIcon size={14} color={statusColor} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{percentual}%</span>
                </div>
              </div>

              {/* BARRA DE PROGRESSO GAMIFICADA */}
              <div style={{ 
                height: 20, background: 'var(--bg-secondary)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12, position: 'relative',
                animation: percentual >= 100 ? 'pulse-red 2s infinite' : 'none'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: statusColor,
                  width: `${percentual}%`, 
                  borderRadius: 20, 
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.15), 0 0 10px ${statusColor}80`,
                  animation: (percentual < 80 && percentual > 0) ? 'glow-green 3s infinite' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: percentual > 10 ? 8 : 0,
                  minWidth: percentual > 0 ? '5%' : '0%'
                }}>
                  {percentual > 10 && (
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                      {percentual}%
                    </span>
                  )}
                </div>
                {percentual <= 10 && percentual > 0 && (
                  <span style={{ position: 'absolute', left: `${percentual}%`, marginLeft: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: statusColor }}>
                    {percentual}%
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Gasto: {formatarMoeda(gasto)}</span>
                <span style={{ color: statusColor }}>Restante: {formatarMoeda(Math.max(0, orc.limite - gasto))}</span>
              </div>

              {aiSuggestion && (
                <div style={{ fontSize: 12, color: aiColor, background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 12, border: `1px solid ${aiColor}30`, lineHeight: 1.4 }}>
                  {aiSuggestion}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE META */}
      {modalMetaOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              {modalMetaEditId ? <Edit2 size={20} color="#6366f1" /> : <PlusCircle size={20} color="#6366f1" />}
              {modalMetaEditId ? 'Editar Meta' : 'Nova Meta'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Nome da Categoria</label>
                <input 
                  type="text" 
                  value={metaFormCategoria} 
                  onChange={e => setMetaFormCategoria(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Energia Elétrica"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Valor Limite Mensal</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>R$</span>
                  <input 
                    type="number" 
                    value={metaFormValor} 
                    onChange={e => setMetaFormValor(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: 40 }}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                onClick={() => setModalMetaOpen(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={salvarModalMeta}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
