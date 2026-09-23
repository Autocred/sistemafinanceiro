'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AgenteDiretorFinanceiro, RespostaDiretor } from '@/lib/ai-agent-engine';
import { Send, Cpu, RefreshCw, Loader2, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MensagemAgente {
  id: string;
  role: 'user' | 'agent';
  conteudo: RespostaDiretor | string;
  timestamp: Date;
}

const PERGUNTAS_DIRETOR = [
  'Qual conta vence primeiro?',
  'Qual minha maior categoria de despesas?',
  'Quanto tenho em caixa e patrimônio?',
  'Quanto gastei com combustível este anão?',
];

export default function ChatIAV2() {
  const [mensagens, setMensagens] = useState<MensagemAgente[]>([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [agente] = useState(() => new AgenteDiretorFinanceiro());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mensagem de boas-vindas objetiva
    const boasVindas: MensagemAgente = {
      id: '0',
      role: 'agent',
      conteudo: {
        respostaTexto: '👋 **Olá, Clovis! Sou seu Assistente Financeiro.**\n\nRespondo a qualquer dúvida sobre seu caixa, contas a pagar, faturas e categorias com dados precisos do seu sistema.'
      },
      timestamp: new Date(),
    };
    setMensagens([boasVindas]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviarPergunta = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return;

    const msgUser: MensagemAgente = {
      id: Date.now().toString(),
      role: 'user',
      conteudo: texto,
      timestamp: new Date(),
    };

    setMensagens(prev => [...prev, msgUser]);
    setInput('');
    setCarregando(true);

    try {
      const historicoAnterior = mensagens.map(m => typeof m.conteudo === 'string' ? m.conteudo : m.conteudo.respostaTexto);
      const resultado = await agente.analisarPergunta(texto, historicoAnterior);

      const msgAgente: MensagemAgente = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        conteudo: resultado,
        timestamp: new Date(),
      };
      setMensagens(prev => [...prev, msgAgente]);
    } catch (err) {
      const msgErro: MensagemAgente = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        conteudo: '❌ Ocorreu um erro ao consultar o banco de dados. Tente novamente.',
        timestamp: new Date(),
      };
      setMensagens(prev => [...prev, msgErro]);
    } finally {
      setCarregando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [agente, carregando, mensagens]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarPergunta(input);
    }
  };

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 140px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box'
    }}>
      {/* CABEÇALHO FIXO DO CHAT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(139,92,246,0.4)', flexShrink: 0
          }}>
            <Bot size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 2 }}>
              Assistente IA <span style={{ color: '#8b5cf6' }}>Ultra</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Inteligência Financeira avançada
            </p>
          </div>
        </div>

        <button onClick={() => setMensagens([])} className="btn-secondary hover-lift" style={{ padding: '8px 14px', fontSize: 12, borderRadius: 10 }}>
          <RefreshCw size={14} /> Novo Chat
        </button>
      </div>

      {/* ÁREA INTERNA DE MENSAGENS COM SCROLL DEDICADO */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        padding: '20px', background: 'var(--bg-glass)', border: '1px solid var(--border)',
        borderRadius: 20, marginBottom: 16, minHeight: 0, boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.02)'
      }}>
        {mensagens.map(msg => (
          <BubbleAgente key={msg.id} mensagem={msg} />
        ))}

        {carregando && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={20} color="#ffffff" />
            </div>
            <div className="glass" style={{ padding: '12px 18px', borderRadius: 16, border: '1px solid rgba(139,92,246,0.3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontWeight: 700 }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Processando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* SUGESTÕES DE PERGUNTAS RÁPIDAS (FIXAS) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        {PERGUNTAS_DIRETOR.map((p, i) => (
          <button
            key={i}
            onClick={() => enviarPergunta(p)}
            disabled={carregando}
            className="hover-lift"
            style={{
              padding: '8px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
              background: 'var(--bg-glass)', border: '1px solid rgba(139,92,246,0.3)',
              color: 'var(--text-primary)', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}>
            💡 {p}
          </button>
        ))}
      </div>

      {/* CAMPO DE ENTRADA FIXO NO RODAPÉ DO CONTAINER */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="input-field"
          placeholder="Pergunte algo objetivo (Ex: Qual conta vence primeiro?)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={carregando}
          style={{ fontSize: 14, padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(139,92,246,0.4)', background: 'var(--bg-glass)' }}
        />
        <button
          onClick={() => enviarPergunta(input)}
          disabled={!input.trim() || carregando}
          className="hover-lift"
          style={{ padding: '16px', flexShrink: 0, fontWeight: 700, borderRadius: 16, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {carregando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}

function BubbleAgente({ mensagem }: { mensagem: MensagemAgente }) {
  const isUser = mensagem.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', color: '#ffffff', padding: '14px 18px', borderRadius: '20px 20px 4px 20px', maxWidth: '85%', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 15px rgba(14,165,233,0.3)' }}>
          {mensagem.conteudo as string}
        </div>
      </div>
    );
  }

  const res = mensagem.conteudo as RespostaDiretor;
  const textoExibir = typeof res === 'string' ? res : res.respostaTexto;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 2px 10px rgba(139,92,246,0.3)' }}>
        <Bot size={20} color="#ffffff" />
      </div>

      <div className="glass" style={{ padding: '14px 20px', borderRadius: '4px 20px 20px 20px', maxWidth: '85%', width: 'fit-content', border: '1px solid rgba(139,92,246,0.2)' }}>
        {textoExibir.split('\n').map((line, idx) => {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={idx} style={{ fontSize: 14, lineHeight: 1.6, margin: '4px 0', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />;
        })}
      </div>
    </div>
  );
}
