'use client';

import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, CheckCircle2, AlertCircle, Clock, 
  Search, Building2, Ticket, X, Play, ShieldAlert,
  Key, FileBarChart, Wrench, ChevronRight, MessageSquare,
  LogIn, Globe, UserCheck, RefreshCw, Plus, Send, Shield
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { LicencaMaster } from '@/lib/saas/tenantManager';

interface TicketSuporte {
  id: string;
  clienteNome: string;
  tenantId?: string;
  dominio?: string;
  assunto: string;
  descricao: string;
  dataAbertura: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'Aberto' | 'Em Atendimento' | 'Fechado';
  ultimaAtualizacao: string;
  mensagens?: { autor: string; texto: string; dataHora: string }[];
}

export default function SuportePage() {
  const [tickets, setTickets] = useState<TicketSuporte[]>([]);
  const [licencas, setLicencas] = useState<LicencaMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [abaAtiva, setAbaAtiva] = useState<'tickets' | 'tenants'>('tickets');
  const [isMounted, setIsMounted] = useState(false);

  
  // Modal States
  const [ticketAtivo, setTicketAtivo] = useState<TicketSuporte | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'intervencao'>('detalhes');
  const [novaResposta, setNovaResposta] = useState('');
  
  // Intervenção States
  const [novaSenha, setNovaSenha] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Modal Novo Chamado
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoCliente, setNovoCliente] = useState('');
  const [novoAssunto, setNovoAssunto] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Média');

  useEffect(() => {
    setIsMounted(true);
    const db = getDb();
    const unsubs: any[] = [];

    // 1. Carregar Tickets
    try {
      const qTickets = query(collection(db, 'saas_tickets'), orderBy('dataAbertura', 'desc'));
      const unsubTickets = onSnapshot(qTickets, (snap) => {
        const lista: TicketSuporte[] = [];
        snap.forEach(doc => {
          lista.push({ id: doc.id, ...doc.data() } as TicketSuporte);
        });
        setTickets(lista);
        setLoading(false);
      }, (err) => {
        console.warn('Erro ao carregar tickets do firestore:', err);
        setLoading(false);
      });
      unsubs.push(unsubTickets);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    // 2. Carregar Licenças para suporte direto
    try {
      const unsubLicencas = onSnapshot(collection(db, 'admin_master_licencas'), (snap) => {
        const listaLic: LicencaMaster[] = [];
        snap.forEach(d => {
          const data = d.data();
          listaLic.push({
            id: d.id,
            nomeFantasia: data.nomeFantasia || 'Sem Nome',
            dominio: data.dominio || '',
            documento: data.documento || '',
            status: data.status || 'ativa',
            plano: data.plano || 'Master Pro'
          } as LicencaMaster);
        });
        setLicencas(listaLic);
      }, (err) => {
        console.warn('Erro ao carregar licencas:', err);
      });
      unsubs.push(unsubLicencas);
    } catch (e) {
      console.error(e);
    }

    return () => unsubs.forEach(u => typeof u === 'function' && u());
  }, []);

  const handleStatusChange = async (id: string, novoStatus: 'Aberto' | 'Em Atendimento' | 'Fechado') => {
    try {
      const db = getDb();
      await setDoc(doc(db, 'saas_tickets', id), { 
        status: novoStatus, 
        ultimaAtualizacao: new Date().toISOString() 
      }, { merge: true });
      
      if (novoStatus === 'Fechado') {
        await setDoc(doc(collection(db, 'saas_audit_logs')), {
           acao: 'TICKET_RESOLVIDO',
           entidade: 'suporte',
           entidadeId: id,
           descricao: `O chamado de suporte #${id.substring(3,9)} foi encerrado com sucesso.`,
           autor: 'Sistema Master',
           dataHora: new Date().toISOString()
        });
      }
      setTicketAtivo(prev => prev && prev.id === id ? { ...prev, status: novoStatus } : prev);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar chamado.');
    }
  };

  const handleEnviarResposta = async () => {
    if (!novaResposta.trim() || !ticketAtivo) return;
    try {
      const db = getDb();
      const novasMensagens = ticketAtivo.mensagens || [];
      novasMensagens.push({
        autor: 'Suporte Master (Você)',
        texto: novaResposta,
        dataHora: new Date().toISOString()
      });

      await setDoc(doc(db, 'saas_tickets', ticketAtivo.id), {
        mensagens: novasMensagens,
        status: ticketAtivo.status === 'Aberto' ? 'Em Atendimento' : ticketAtivo.status,
        ultimaAtualizacao: new Date().toISOString()
      }, { merge: true });

      setTicketAtivo(prev => prev ? { ...prev, mensagens: novasMensagens, status: prev.status === 'Aberto' ? 'Em Atendimento' : prev.status } : null);
      setNovaResposta('');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar resposta.');
    }
  };

  const handleCriarChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = getDb();
      const ticketId = `tk_${Date.now()}`;
      const dataHoraIso = new Date().toISOString();

      const novoTicket: TicketSuporte = {
        id: ticketId,
        clienteNome: novoCliente || 'Cliente ERP',
        assunto: novoAssunto || 'Suporte Geral',
        descricao: novaDescricao || 'Solicitação de assistência técnica.',
        dataAbertura: dataHoraIso,
        prioridade: novaPrioridade,
        status: 'Aberto',
        ultimaAtualizacao: dataHoraIso,
        mensagens: [
          { autor: novoCliente || 'Cliente ERP', texto: novaDescricao, dataHora: dataHoraIso }
        ]
      };

      await setDoc(doc(db, 'saas_tickets', ticketId), novoTicket);
      setModalNovoAberto(false);
      setNovoCliente('');
      setNovoAssunto('');
      setNovaDescricao('');
      alert('Chamado de suporte registrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar chamado.');
    }
  };

  const simularChamado = async () => {
    try {
      const db = getDb();
      const ticketId = `tk_${Date.now()}`;
      const dataHoraIso = new Date().toISOString();
      const randomClient = ['João (Empresa Silva)', 'Maria (Consultoria X)', 'Pedro (Loja Tech)', 'Carlos (Distribuidora Master)'][Math.floor(Math.random() * 4)];
      const randomPriority: ('Baixa' | 'Média' | 'Alta' | 'Urgente')[] = ['Baixa', 'Média', 'Alta', 'Urgente'];
      const prioridade = randomPriority[Math.floor(Math.random() * 4)];
      const assuntos = [
        'Dúvida na tela de relatórios e DRE',
        'Como cadastrar novo usuário no financeiro',
        'Solicitação de alteração no fechamento de fatura',
        'Ajuda na conciliação bancária de extrato OFX'
      ];
      const assunto = assuntos[Math.floor(Math.random() * assuntos.length)];

      const novoTicket: TicketSuporte = {
        id: ticketId,
        clienteNome: randomClient,
        assunto,
        descricao: 'Olá equipe de suporte! Preciso de orientações técnicas para ajustar as regras de conciliação e emitir os relatórios gerenciais.',
        dataAbertura: dataHoraIso,
        prioridade,
        status: 'Aberto',
        ultimaAtualizacao: dataHoraIso,
        mensagens: [
          { autor: randomClient, texto: 'Olá equipe! Podem me auxiliar nesta operação?', dataHora: dataHoraIso }
        ]
      };

      await setDoc(doc(db, 'saas_tickets', ticketId), novoTicket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEntrarComoCliente = (tenantId: string, nomeCliente: string) => {
    try {
      // Nova Lógica Integrada de Suporte (Impersonation)
      // O ID da licença (tenantId) deve ser passado ao invés do domínio
      // Buscamos a licença correta pelo domínio
      const licencaEncontrada = licencas.find(l => l.id === tenantId);
      if (licencaEncontrada) {
        localStorage.setItem('suporte_impersonate_tenant', licencaEncontrada.id);
        localStorage.setItem('suporte_impersonate_nome', licencaEncontrada.nomeFantasia || '');
        window.open('/', '_blank');
      } else {
        alert('Licença não encontrada para iniciar o suporte.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao iniciar sessão de suporte como cliente.');
    }
  };

  const handleRedefinirSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setIsResetting(true);
    try {
      const db = getDb();
      await setDoc(doc(collection(db, 'saas_audit_logs')), {
         acao: 'INTERVENCAO_SENHA_RESETADA',
         entidade: 'seguranca',
         entidadeId: ticketAtivo?.id || 'unknown',
         descricao: `Senha do locatário ${ticketAtivo?.clienteNome} foi redefinida manualmente via painel de intervenção do Suporte.`,
         autor: 'Admin Master',
         dataHora: new Date().toISOString()
      });
      
      setTimeout(() => {
        setIsResetting(false);
        setNovaSenha('');
        alert('Senha do cliente redefinida com sucesso! Registro de auditoria gravado.');
      }, 1000);

    } catch (e) {
      console.error(e);
      alert('Erro ao redefinir a senha.');
      setIsResetting(false);
    }
  };

  // KPIs
  const ticketsAbertos = tickets.filter(t => t.status === 'Aberto').length;
  const ticketsAtendimento = tickets.filter(t => t.status === 'Em Atendimento').length;
  const ticketsResolvidosHoje = tickets.filter(t => {
    if (t.status !== 'Fechado') return false;
    const hoje = new Date().toISOString().split('T')[0];
    return t.ultimaAtualizacao && t.ultimaAtualizacao.startsWith(hoje);
  }).length;

  const ticketsFiltrados = tickets.filter(t => {
    const search = busca.toLowerCase();
    const matchBusca = (t.clienteNome || '').toLowerCase().includes(search) || 
                       (t.id || '').toLowerCase().includes(search) || 
                       (t.assunto || '').toLowerCase().includes(search);
    const matchStatus = filtroStatus === 'todas' || t.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const licencasFiltradas = licencas.filter(l => {
    const search = busca.toLowerCase();
    return (l.nomeFantasia || '').toLowerCase().includes(search) || 
           (l.dominio || '').toLowerCase().includes(search) || 
           (l.id || '').toLowerCase().includes(search);
  });

  const getPrioridadeBadge = (p: string) => {
    switch (p) {
      case 'Baixa': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">Baixa</span>;
      case 'Média': return <span className="px-2 py-0.5 bg-blue-100 text-[#cc092f] rounded text-[10px] font-bold uppercase">Média</span>;
      case 'Alta': return <span className="px-2 py-0.5 bg-[#cc092f]mber-100 text-amber-600 rounded text-[10px] font-bold uppercase">Alta</span>;
      case 'Urgente': return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Urgente</span>;
      default: return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{p || 'Normal'}</span>;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-[#cc092f]" />
            Central de Suporte & Atendimento
          </h1>
          <p className="text-gray-500 mt-1">Gerencie chamados técnicos, tire dúvidas e acesse contas com permissão Master.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#cc092f] hover:bg-[#a00725] text-white rounded-none font-bold transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado
          </button>
          <button 
            onClick={simularChamado}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-none font-bold transition-all shadow-sm text-sm"
          >
            <Play className="w-4 h-4 text-blue-500" />
            Simular Chamado
          </button>
        </div>
      </div>

      {/* DASHBOARDS / KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-none border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-none bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-none">Na Fila</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Aguardando Resposta</p>
          <h3 className="text-3xl font-black text-gray-900">{ticketsAbertos}</h3>
        </div>

        <div className="bg-white p-6 rounded-none border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-none bg-[#cc092f]mber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-[#cc092f]mber-50 px-2 py-1 rounded-none">Ativos</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Em Atendimento</p>
          <h3 className="text-3xl font-black text-gray-900">{ticketsAtendimento}</h3>
        </div>

        <div className="bg-white p-6 rounded-none border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-none bg-emerald-50 text-[#cc092f] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#cc092f] bg-emerald-50 px-2 py-1 rounded-none">Hoje</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Resolvidos</p>
          <h3 className="text-3xl font-black text-gray-900" suppressHydrationWarning>{ticketsResolvidosHoje}</h3>
        </div>

        <div className="bg-white p-6 rounded-none border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-none bg-blue-50 text-[#cc092f] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#cc092f] bg-blue-50 px-2 py-1 rounded-none">SaaS</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Empresas Monitoradas</p>
          <h3 className="text-3xl font-black text-gray-900">{licencas.length}</h3>
        </div>
      </div>

      {/* SELETOR DE ABAS PRINCIPAIS */}
      <div className="flex items-center gap-2 border-b border-gray-300 pb-2">
        <button
          onClick={() => setAbaAtiva('tickets')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-bold text-sm transition-all ${
            abaAtiva === 'tickets' ? 'bg-[#cc092f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Ticket className="w-4 h-4" /> Chamados de Suporte ({tickets.length})
        </button>
        <button
          onClick={() => setAbaAtiva('tenants')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-bold text-sm transition-all ${
            abaAtiva === 'tenants' ? 'bg-[#cc092f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Suporte Direto por Empresa ({licencas.length})
        </button>
      </div>

      {/* TAB 1: CHAMADOS DE SUPORTE */}
      {abaAtiva === 'tickets' && (
        <div className="bg-white rounded-none shadow-sm overflow-hidden border border-gray-300">
          <div className="px-10 py-6 border-b border-gray-300 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-500" />
              Fila de Chamados
            </h2>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar ticket ou cliente..." 
                  value={busca} onChange={e => setBusca(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-none pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>
              <select 
                value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 rounded-none px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[#cc092f] outline-none"
              >
                <option value="todas">Todos os Status</option>
                <option value="Aberto">Abertos</option>
                <option value="Em Atendimento">Em Atendimento</option>
                <option value="Fechado">Fechados</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-300 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">ID / Prioridade</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Empresa (Cliente)</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Assunto</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Abertura</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">Carregando chamados...</td>
                  </tr>
                ) : ticketsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <LifeBuoy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="font-bold text-gray-700">Nenhum chamado de suporte no momento.</p>
                      <p className="text-xs text-gray-400 mt-1">Clique em "Simular Chamado" ou "Novo Chamado" para registrar uma solicitação.</p>
                    </td>
                  </tr>
                ) : (
                  ticketsFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap" suppressHydrationWarning>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-gray-900">#{t.id.substring(3, 10)}</span>
                          {getPrioridadeBadge(t.prioridade)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none bg-blue-50 text-[#cc092f] flex items-center justify-center font-bold text-xs">
                            {t.clienteNome ? t.clienteNome.substring(0,2).toUpperCase() : 'CL'}
                          </div>
                          <p className="font-bold text-gray-700">{t.clienteNome}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800 line-clamp-1">{t.assunto}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-500" suppressHydrationWarning>
                          {t.dataAbertura ? new Date(t.dataAbertura).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recente'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.status === 'Aberto' && <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Aberto</span>}
                        {t.status === 'Em Atendimento' && <span className="px-2.5 py-1 bg-[#cc092f]mber-50 text-amber-600 border border-amber-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Em Atendimento</span>}
                        {t.status === 'Fechado' && <span className="px-2.5 py-1 bg-emerald-50 text-[#cc092f] border border-emerald-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> Resolvido</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => {
                            setTicketAtivo(t);
                            setActiveTab('detalhes');
                          }}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-none transition-colors border border-blue-200"
                        >
                          Atender
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BASE DE CLIENTES / SUPORTE DIRETO */}
      {abaAtiva === 'tenants' && (
        <div className="bg-white rounded-none shadow-sm overflow-hidden border border-gray-300">
          <div className="px-10 py-6 border-b border-gray-300 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Acesso Técnico a Empresas Cadastradas (God Mode)
            </h2>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar empresa..." 
                value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-none pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-300 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Empresa</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Domínio / Link</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Documento</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Ação Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {licencasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Nenhuma empresa encontrada.</td>
                  </tr>
                ) : (
                  licencasFiltradas.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {l.nomeFantasia ? l.nomeFantasia.substring(0,2).toUpperCase() : 'SA'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{l.nomeFantasia}</p>
                            <p className="text-xs text-gray-400 font-mono">ID: {l.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#cc092f] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> {l.dominio || 'app.local'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono">
                        {l.documento || 'Não informado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider ${
                          l.status === 'ativa' ? 'bg-emerald-50 text-[#cc092f]' : 'bg-red-50 text-red-600'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEntrarComoCliente(l.id, l.nomeFantasia)}
                          className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-none transition-all shadow-sm inline-flex items-center gap-2"
                        >
                          <LogIn className="w-3.5 h-3.5" /> Entrar como Cliente
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE ATENDIMENTO COM GOD MODE */}
      {ticketAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#cc092f]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center px-10 py-6 border-b border-gray-300 bg-gray-50/70 shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-[#cc092f]" />
                  Atendimento #{ticketAtivo.id.substring(3, 10)}
                </h2>
                <p className="text-sm font-semibold text-gray-500 mt-1 flex items-center gap-2">
                  {getPrioridadeBadge(ticketAtivo.prioridade)}
                  • De: <strong className="text-gray-800">{ticketAtivo.clienteNome}</strong>
                </p>
              </div>
              <button onClick={() => setTicketAtivo(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-none transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* SIDEBAR TABS */}
              <div className="w-64 bg-gray-50 border-r border-gray-300 p-4 shrink-0 flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab('detalhes')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-none font-bold transition-all text-sm ${activeTab === 'detalhes' ? 'bg-[#cc092f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <MessageSquare className="w-5 h-5" /> Chat & Histórico
                </button>
                <button 
                  onClick={() => setActiveTab('intervencao')}
                  className={`flex items-center justify-between px-4 py-3 rounded-none font-bold transition-all text-sm ${activeTab === 'intervencao' ? 'bg-red-600 text-white shadow-md' : 'text-red-600 hover:bg-red-50'}`}
                >
                  <div className="flex items-center gap-3"><ShieldAlert className="w-5 h-5" /> Painel God Mode</div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {activeTab === 'detalhes' && (
                  <div className="space-y-6">
                    {/* ASSUNTO E DESCRIÇÃO ORIGINAL */}
                    <div className="bg-slate-50 border border-gray-300/80 rounded-none p-5">
                      <h4 className="font-bold text-gray-900 text-base mb-1">{ticketAtivo.assunto}</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{ticketAtivo.descricao}</p>
                      <div className="mt-3 text-xs text-gray-400 font-medium" suppressHydrationWarning>
                        Aberto em: {ticketAtivo.dataAbertura ? new Date(ticketAtivo.dataAbertura).toLocaleString('pt-BR') : 'Data recente'}
                      </div>
                    </div>

                    {/* MENSAGENS / RESPOSTAS */}
                    {ticketAtivo.mensagens && ticketAtivo.mensagens.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico de Mensagens</h5>
                        {ticketAtivo.mensagens.map((msg, i) => (
                          <div key={i} className={`p-4 rounded-none text-sm ${
                            msg.autor.includes('Suporte') 
                              ? 'bg-blue-50 border border-blue-100 text-blue-950 ml-6' 
                              : 'bg-gray-100 border border-gray-300 text-gray-800 mr-6'
                          }`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs">{msg.autor}</span>
                              <span className="text-[10px] text-gray-400" suppressHydrationWarning>{new Date(msg.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="leading-relaxed">{msg.texto}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CAMPO DE RESPOSTA */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Digite sua resposta para o cliente..." 
                        value={novaResposta}
                        onChange={e => setNovaResposta(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEnviarResposta()}
                        className="flex-1 bg-white border border-gray-300 rounded-none px-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                      />
                      <button 
                        onClick={handleEnviarResposta}
                        className="px-4 py-2 bg-[#cc092f] hover:bg-[#a00725] text-white rounded-none font-bold text-sm flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Enviar
                      </button>
                    </div>

                    {/* STATUS ACTIONS */}
                    <div className="pt-4 border-t border-gray-300 flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex gap-2">
                        {ticketAtivo.status !== 'Aberto' && (
                          <button onClick={() => handleStatusChange(ticketAtivo.id, 'Aberto')} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-none transition-colors">
                            Reabrir
                          </button>
                        )}
                        {ticketAtivo.status !== 'Em Atendimento' && (
                          <button onClick={() => handleStatusChange(ticketAtivo.id, 'Em Atendimento')} className="px-4 py-2 text-xs font-bold text-amber-600 bg-[#cc092f]mber-50 hover:bg-[#cc092f]mber-100 border border-amber-200 rounded-none transition-colors">
                            Marcar: Em Atendimento
                          </button>
                        )}
                      </div>
                      {ticketAtivo.status !== 'Fechado' && (
                        <button onClick={() => handleStatusChange(ticketAtivo.id, 'Fechado')} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#cc092f] hover:bg-[#a00725] rounded-none transition-colors shadow-md">
                          <CheckCircle2 className="w-4 h-4" /> Finalizar Chamado
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'intervencao' && (
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-100 rounded-none p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 text-sm">Painel de Intervenção Direta (God Mode)</h4>
                        <p className="text-xs text-red-700 mt-1">Acesso irrestrito às contas dos locatários para manutenção e desbloqueio. Todas as ações são auditadas.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* CARD RESET SENHA */}
                      <div className="p-5 rounded-none border border-gray-300 bg-white shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
                          <Key className="w-5 h-5" /> Redefinir Senha do Admin
                        </div>
                        <input 
                          type="password" 
                          placeholder="Nova senha (min. 6 dígitos)..." 
                          value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-2 focus:ring-2 focus:ring-[#cc092f] outline-none text-sm"
                        />
                        <button 
                          onClick={handleRedefinirSenha}
                          disabled={isResetting}
                          className="w-full px-4 py-2.5 bg-[#cc092f] hover:bg-[#a00725] text-white text-sm font-bold rounded-none transition-all shadow-sm"
                        >
                          {isResetting ? 'Redefinindo...' : 'Gravar Nova Senha'}
                        </button>
                      </div>

                      {/* CARD ACESSO COMO CLIENTE */}
                      <div className="p-5 rounded-none border border-gray-300 bg-white shadow-sm space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                            <LogIn className="w-5 h-5" /> Entrar no Sistema como Cliente
                          </div>
                          <p className="text-xs text-gray-500">Inicie uma sessão direta no painel financeiro do cliente com bypass de senha para testes e diagnósticos.</p>
                        </div>
                        <button 
                          onClick={() => handleEntrarComoCliente(ticketAtivo.tenantId || licencas.find(l=>l.nomeFantasia===ticketAtivo?.clienteNome)?.id || '', ticketAtivo?.clienteNome || '')}
                          className="w-full px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-none transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <LogIn className="w-4 h-4" /> Acessar Sistema
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO CHAMADO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#cc092f]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-300 pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#cc092f]" /> Abrir Novo Chamado
              </h3>
              <button onClick={() => setModalNovoAberto(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarChamado} className="px-10 py-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Empresa / Cliente</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome do cliente ou empresa..." 
                  value={novoCliente} onChange={e => setNovoCliente(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-none px-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assunto</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Dúvida na emissão de relatórios..." 
                  value={novoAssunto} onChange={e => setNovoAssunto(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-none px-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prioridade</label>
                <select 
                  value={novaPrioridade} onChange={e => setNovaPrioridade(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-none px-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição do Problema</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Descreva detalhadamente o ocorrido..." 
                  value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-none px-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalNovoAberto(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-none">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-[#cc092f] hover:bg-[#a00725] text-white text-sm font-bold rounded-none shadow-md">
                  Registrar Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
