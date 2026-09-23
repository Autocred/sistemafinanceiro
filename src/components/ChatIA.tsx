'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AgenteDiretorFinanceiro, RespostaDiretor } from '@/lib/ai-agent-engine';
import { Send, Cpu, RefreshCw, Loader2 } from 'lucide-react';
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

export default function ChatIA() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#cc0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(204,0,0,0.3)', flexShrink: 0
          }}>
            <Cpu size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Assistente Financeiro IA
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Consultas objetivas e respostas em tempo real
            </p>
          </div>
        </div>

        <button onClick={() => setMensagens([])} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>
          <RefreshCw size={13} /> Limpar
        </button>
      </div>

      {/* ÁREA INTERNA DE MENSAGENS COM SCROLL DEDICADO */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
        padding: '14px', background: 'var(--bg-glass)', border: '1px solid var(--border)',
        borderRadius: 16, marginBottom: 10, minHeight: 0
      }}>
        {mensagens.map(msg => (
          <BubbleAgente key={msg.id} mensagem={msg} />
        ))}

        {carregando && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#cc0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Cpu size={16} color="#ffffff" />
            </div>
            <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(204,0,0,0.3)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cc0000', fontWeight: 700 }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Consultando dados...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* SUGESTÕES DE PERGUNTAS RÁPIDAS (FIXAS) */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        {PERGUNTAS_DIRETOR.map((p, i) => (
          <button
            key={i}
            onClick={() => enviarPergunta(p)}
            disabled={carregando}
            style={{
              padding: '6px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap'
            }}>
            💡 {p}
          </button>
        ))}
      </div>

      {/* CAMPO DE ENTRADA FIXO NO RODAPÉ DO CONTAINER */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="input-field"
          placeholder="Pergunte algo objetivo (Ex: Qual conta vence primeiro?)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={carregando}
          style={{ fontSize: 13, padding: '12px 14px' }}
        />
        <button
          onClick={() => enviarPergunta(input)}
          disabled={!input.trim() || carregando}
          className="btn-primary"
          style={{ padding: '12px 18px', flexShrink: 0, fontWeight: 700 }}>
          {carregando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

function BubbleAgente({ mensagem }: { mensagem: MensagemAgente }) {
  const isUser = mensagem.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        <div style={{ background: '#cc0000', color: '#ffffff', padding: '10px 14px', borderRadius: '14px 14px 2px 14px', maxWidth: '85%', fontSize: 13, fontWeight: 600 }}>
          {mensagem.conteudo as string}
        </div>
      </div>
    );
  }

  const res = mensagem.conteudo as RespostaDiretor;
  const textoExibir = typeof res === 'string' ? res : res.respostaTexto;

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#cc0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Cpu size={16} color="#ffffff" />
      </div>

      <div className="glass" style={{ padding: '12px 16px', borderRadius: '4px 14px 14px 14px', maxWidth: '85%', width: 'fit-content' }}>
        {textoExibir.split('\n').map((line, idx) => {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={idx} style={{ fontSize: 13, lineHeight: 1.5, margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />;
        })}
      </div>
    </div>
  );
}
