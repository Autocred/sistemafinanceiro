import React, { useState } from 'react';
import { Bot, Plus, Trash2, Mail, MessageSquare, Phone } from 'lucide-react';

export function ReguaCobranca() {
  const [regras, setRegras] = useState([
    { id: '1', dias: -3, canais: ['email'], mensagem: 'Olá, sua fatura vence em 3 dias!' },
    { id: '2', dias: 0, canais: ['whatsapp'], mensagem: 'Lembrete: O vencimento do seu boleto é hoje.' },
    { id: '3', dias: 5, canais: ['email', 'whatsapp'], mensagem: 'Aviso de atraso: Identificamos um débito pendente há 5 dias.' }
  ]);

  const addRegra = () => {
    setRegras([...regras, { id: Date.now().toString(), dias: 1, canais: ['email'], mensagem: 'Nova mensagem automática' }]);
  };

  const removeRegra = (id: string) => {
    setRegras(regras.filter(r => r.id !== id));
  };

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={20} color="#6366f1" /> Régua de Cobrança Automatizada
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Configure fluxos de lembretes automáticos para contas a receber antes e depois do vencimento.
          </p>
        </div>
        <button onClick={addRegra} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
          <Plus size={16} /> Adicionar Regra
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {regras.map(regra => (
          <div key={regra.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            
            <div style={{ flex: '0 0 140px' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Quando enviar?</label>
              <select className="input-field" value={regra.dias.toString()} onChange={e => {
                const n = [...regras];
                n.find(r => r.id === regra.id)!.dias = parseInt(e.target.value);
                setRegras(n);
              }}>
                <option value="-5">5 dias antes</option>
                <option value="-3">3 dias antes</option>
                <option value="-1">1 dia antes</option>
                <option value="0">No dia do Venc.</option>
                <option value="1">1 dia de atraso</option>
                <option value="3">3 dias de atraso</option>
                <option value="5">5 dias de atraso</option>
                <option value="15">15 dias de atraso</option>
              </select>
            </div>

            <div style={{ flex: '0 0 160px' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Canais</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn-icon ${regra.canais.includes('email') ? 'active' : ''}`} style={{ background: regra.canais.includes('email') ? 'rgba(99,102,241,0.1)' : 'transparent', color: regra.canais.includes('email') ? '#6366f1' : 'var(--text-muted)', border: '1px solid', borderColor: regra.canais.includes('email') ? '#6366f1' : 'var(--border)' }}>
                  <Mail size={16} />
                </button>
                <button className={`btn-icon ${regra.canais.includes('whatsapp') ? 'active' : ''}`} style={{ background: regra.canais.includes('whatsapp') ? 'rgba(16,185,129,0.1)' : 'transparent', color: regra.canais.includes('whatsapp') ? '#10b981' : 'var(--text-muted)', border: '1px solid', borderColor: regra.canais.includes('whatsapp') ? '#10b981' : 'var(--border)' }}>
                  <MessageSquare size={16} />
                </button>
                <button className={`btn-icon ${regra.canais.includes('sms') ? 'active' : ''}`} style={{ background: regra.canais.includes('sms') ? 'rgba(245,158,11,0.1)' : 'transparent', color: regra.canais.includes('sms') ? '#f59e0b' : 'var(--text-muted)', border: '1px solid', borderColor: regra.canais.includes('sms') ? '#f59e0b' : 'var(--border)' }}>
                  <Phone size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Mensagem (Template)</label>
              <input type="text" className="input-field" value={regra.mensagem} onChange={e => {
                const n = [...regras];
                n.find(r => r.id === regra.id)!.mensagem = e.target.value;
                setRegras(n);
              }} />
            </div>

            <div style={{ marginTop: 22 }}>
              <button onClick={() => removeRegra(regra.id)} className="btn-icon" style={{ color: '#ef4444' }} title="Remover Regra">
                <Trash2 size={18} />
              </button>
            </div>

          </div>
        ))}

        {regras.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Nenhuma regra de cobrança configurada.
          </div>
        )}
      </div>
      
      <div style={{ marginTop: 20, padding: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: 'var(--text-primary)' }}>
        <strong>Nota:</strong> A Régua de Cobrança automatizada verifica contas diariamente às 08:00h e dispara as mensagens configuradas via API (WhatsApp/Email).
      </div>
    </div>
  );
}
