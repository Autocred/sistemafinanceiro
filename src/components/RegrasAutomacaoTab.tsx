'use client';

import React, { useState, useEffect } from 'react';
import { Zap, PlusCircle, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import { RegraAutomacao } from '@/lib/types';
import { getRegrasAutomacao, salvarRegraAutomacao, REGRAS_PADRAO } from '@/lib/rulesEngine';
import { ReguaCobranca } from './ReguaCobranca';

export function RegrasAutomacaoTab() {
  const [regras, setRegras] = useState<RegraAutomacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [termo, setTermo] = useState('');
  const [nomeRegra, setNomeRegra] = useState('');
  const [categoria, setCategoria] = useState('');

  const carregar = async () => {
    const data = await getRegrasAutomacao();
    setRegras(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleCriarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim() || !nomeRegra.trim()) return;

    const nova: RegraAutomacao = {
      id: `regra_${Date.now()}`,
      nome: nomeRegra,
      termoBusca: termo,
      campoBusca: 'descricao',
      categoriaId: categoria.toLowerCase() || 'outros',
      categoriaNome: categoria || 'Outros',
      ativo: true
    };

    await salvarRegraAutomacao(nova);
    setTermo('');
    setNomeRegra('');
    setCategoria('');
    await carregar();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            ⚙️ Motor de Regras e Automações
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Crie automações inteligentes "SE termo X ENTÃO categoria Y"
          </p>
        </div>
      </div>

      {/* FORMULÁRIO DE NOVA REGRA */}
      <div className="glass" style={{ padding: 20, borderRadius: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} color="#f59e0b" /> Nova Regra de Automação
        </h3>

        <form onSubmit={handleCriarRegra} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Nome da Regra (ex: Posto -> Combustível)"
            value={nomeRegra}
            onChange={e => setNomeRegra(e.target.value)}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Termo de Busca (ex: Posto, Uber, Netflix)"
            value={termo}
            onChange={e => setTermo(e.target.value)}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Categoria Alvo (ex: Combustível)"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            <PlusCircle size={16} /> Adicionar Regra
          </button>
        </form>
      </div>

      {/* LISTA DE REGRAS ATIVAS */}
      <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          Regras Ativas não Sistema ({regras.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regras.map(r => (
            <div key={r.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14
            }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{r.nome}</h4>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  SE contiver <strong>"{r.termoBusca || 'Alçada > R$ 5.000'}"</strong> &rarr; Categoria <strong>{r.categoriaNome || 'Aprovação'}</strong>
                </p>
              </div>

              <span className={`badge ${r.ativo ? 'badge-green' : 'badge-gray'}`}>
                {r.ativo ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NOVO MÓDULO: Régua de Cobrança Automatizada */}
      <div style={{ marginTop: 24 }}>
        <ReguaCobranca />
      </div>
    </div>
  );
}
