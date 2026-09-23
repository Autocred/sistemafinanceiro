'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { ConciliacaoItem, Transacao } from '@/lib/types';
import { parseConteudoConciliacao, executarMatchConciliacao } from '@/lib/conciliacao';
import { getTransacoes, formatarMoeda } from '@/lib/storage';

export function CentralConciliacao() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [itensExtrato, setItensExtrato] = useState<ConciliacaoItem[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getTransacoes();
      setTransacoes(data);
    })();
  }, []);

  const [modoSwipe, setModoSwipe] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    setLoading(true);
    setModoSwipe(false);
    setSwipeIndex(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const conteudo = evt.target?.result as string;
      if (conteudo) {
        const brutos = parseConteudoConciliacao(conteudo, file.name);
        const conciliados = executarMatchConciliacao(brutos, transacoes);
        setItensExtrato(conciliados);
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleMatch = () => {
    // Aqui seria a lógica para confirmar a conciliação não Firebase
    avancarSwipe();
  };

  const handleDescartar = () => {
    // Ignãorar ou criar novo sem match
    avancarSwipe();
  };

  const avancarSwipe = () => {
    if (swipeIndex < itensExtrato.length - 1) {
      setSwipeIndex(prev => prev + 1);
    } else {
      setModoSwipe(false); // Terminãou
      alert("Conciliação finalizada! 🎉");
    }
  };

  const fmt = formatarMoeda;

  const itemAtual = itensExtrato[swipeIndex];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      {/* HEADER CONCILIAÇÃO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            🔄 Central de Conciliação Bancária (OFX / CSV)
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Importe seu extrato bancário oficial e realize o confronto automático de lançamentos
          </p>
        </div>

        {/* BOTAO UPLOAD */}
        <div style={{ display: 'flex', gap: 10 }}>
          {itensExtrato.length > 0 && !modoSwipe && (
            <button onClick={() => setModoSwipe(true)} className="btn-primary" style={{ background: '#ec4899', border: 'none' }}>
               Modo Tinder (Foco) 💘
            </button>
          )}
          <label className="btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Importar Extrato (OFX/CSV)
            <input type="file" accept=".ofx,.csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {nomeArquivo && !modoSwipe && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          📄 Arquivo carregado: <strong>{nomeArquivo}</strong> ({itensExtrato.length} lançamentos lidos)
        </div>
      )}

      {itensExtrato.length === 0 ? (
        <div className="glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 20 }}>
          <FileSpreadsheet size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Nenhum extrato importado
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 20px' }}>
            Clique não botão acima para carregar o arquivo **.OFX** ou **.CSV** exportado do seu internet banking. O sistema irá conciliar os valores automaticamente.
          </p>
        </div>
      ) : modoSwipe && itemAtual ? (
        // MODO SWIPE (TINDER)
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
          <div style={{ marginBottom: 20, fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>
            Lançamento {swipeIndex + 1} de {itensExtrato.length}
          </div>
          
          <div className="modern-card" style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden', border: '2px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
             <div style={{ fontSize: 12, fontWeight: 800, color: itemAtual.tipo === 'receita' ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
               {itemAtual.tipo === 'receita' ? 'Entrada' : 'Saída'}
             </div>
             <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 5 }}>
               {itemAtual.descricao}
             </h2>
             <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
               Data do Banco: {itemAtual.data.split('-').reverse().join('/')}
             </div>
             <div style={{ fontSize: 48, fontWeight: 900, color: itemAtual.tipo === 'receita' ? '#10b981' : '#ef4444', letterSpacing: '-2px', marginBottom: 30 }}>
                {itemAtual.tipo === 'receita' ? '+' : '-'}{fmt(itemAtual.valor)}
             </div>

             {itemAtual.status === 'conciliado' ? (
                <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
                  A IA encontrou um Match perfeito não sistema!
                </div>
             ) : (
                <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
                  Nenhum lançamento exato encontrado não sistema.
                </div>
             )}

             <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
               <button onClick={handleDescartar} style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                 <span style={{ fontSize: 24 }}>❌</span>
               </button>
               
               <button onClick={handleMatch} style={{ width: 80, height: 80, borderRadius: '50%', background: '#10b981', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16,185,129,0.4)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                 <span style={{ fontSize: 32 }}>💚</span>
               </button>
             </div>
          </div>
        </div>
      ) : (
        // MODO LISTA NORMAL
        <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
            Resultado do Auto-Match de Conciliação
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itensExtrato.map(item => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--bg-card)',
                border: `1px solid ${item.status === 'conciliado' ? 'rgba(16,185,129,0.3)' : item.status === 'divergente' ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                borderRadius: 14
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.descricao}</span>
                    <span className={`badge ${item.status === 'conciliado' ? 'badge-green' : item.status === 'divergente' ? 'badge-yellow' : 'badge-gray'}`}>
                      {item.status === 'conciliado' ? 'MATCH 100%' : item.status === 'divergente' ? 'PARCIAL' : 'PENDENTE'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Data: {item.data.split('-').reverse().join('/')} {item.documento ? `• Doc: ${item.documento}` : ''}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: item.tipo === 'receita' ? '#10b981' : '#ef4444' }}>
                    {item.tipo === 'receita' ? '+' : '-'}{fmt(item.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
