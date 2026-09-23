import React, { useState } from 'react';
import { CreditCard, Plus, Filter, Search, Settings, MoreVertical, Zap } from 'lucide-react';
import { formatarMoeda } from '@/lib/storage';

interface CorporateCard {
  id: string;
  titular: string;
  final: string;
  limite: number;
  utilizado: number;
  status: 'ativo' | 'bloqueado' | 'cancelado';
  departamento: string;
  tipo: 'virtual' | 'fisico';
  bandeira: 'mastercard' | 'visa';
}

const FAKE_CARDS: CorporateCard[] = [
  { id: '1', titular: 'João Silva', final: '4321', limite: 15000, utilizado: 8450, status: 'ativo', departamento: 'Marketing', tipo: 'virtual', bandeira: 'mastercard' },
  { id: '2', titular: 'Maria Souza', final: '9876', limite: 50000, utilizado: 42000, status: 'ativo', departamento: 'Diretoria', tipo: 'fisico', bandeira: 'visa' },
  { id: '3', titular: 'Pedro Santos', final: '1122', limite: 5000, utilizado: 1200, status: 'ativo', departamento: 'Vendas', tipo: 'virtual', bandeira: 'mastercard' },
  { id: '4', titular: 'Ana Costa', final: '3344', limite: 2000, utilizado: 2000, status: 'bloqueado', departamento: 'Operações', tipo: 'virtual', bandeira: 'visa' },
];

export default function CorporateCards() {
  const [cards, setCards] = useState<CorporateCard[]>(FAKE_CARDS);
  const [filtroDepto, setFiltroDepto] = useState('Todos');

  const CardItem = ({ card }: { card: CorporateCard }) => {
    const pUtilizado = (card.utilizado / card.limite) * 100;
    
    return (
      <div style={{
        background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', borderRadius: 16, padding: 20,
        display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden'
      }}>
        {/* Fundo decorativo */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: card.status === 'ativo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '50%', filter: 'blur(30px)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: 6, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <CreditCard size={18} color={card.status === 'ativo' ? '#10b981' : '#ef4444'} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{card.titular}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•••• {card.final}</span>
              </div>
            </div>
          </div>
          <span style={{ 
            fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 12, textTransform: 'uppercase',
            background: card.status === 'ativo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: card.status === 'ativo' ? '#10b981' : '#ef4444'
          }}>
            {card.status}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Departamento</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{card.departamento}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gasto / Limite</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatarMoeda(card.utilizado)} <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>/ {formatarMoeda(card.limite)}</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pUtilizado, 100)}%`, height: '100%', background: pUtilizado > 90 ? '#ef4444' : pUtilizado > 70 ? '#f59e0b' : '#10b981', transition: 'width 1s ease-in-out' }} />
        </div>
        
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, justifyContent: 'center' }}>
            Detalhes
          </button>
          <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, justifyContent: 'center', color: card.status === 'ativo' ? '#ef4444' : '#10b981' }}>
            {card.status === 'ativo' ? 'Bloquear' : 'Desbloquear'}
          </button>
        </div>
      </div>
    );
  };

  const deptos = ['Todos', ...Array.from(new Set(cards.map(c => c.departamento)))];
  const filtered = cards.filter(c => filtroDepto === 'Todos' || c.departamento === filtroDepto);

  return (
    <div className="glass" style={{ borderRadius: 16, padding: '32px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap color="#3b82f6" /> Cartões Corporativos Kaminão
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Gestão de limites e despesas de colaboradores em tempo real.</p>
        </div>
        <button className="btn-primary" style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700, borderRadius: 12 }}>
          <Plus size={18} /> Novo Cartão Virtual
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {deptos.map(d => (
            <button
              key={d}
              onClick={() => setFiltroDepto(d)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filtroDepto === d ? 'var(--primary)' : 'var(--bg-secondary)',
                color: filtroDepto === d ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar titular..." style={{ padding: '10px 16px 10px 36px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: 13 }} />
          </div>
          <button className="btn-icon"><Filter size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, overflowY: 'auto', paddingBottom: 32 }}>
        {filtered.map(c => <CardItem key={c.id} card={c} />)}
      </div>
    </div>
  );
}
