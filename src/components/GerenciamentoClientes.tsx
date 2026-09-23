'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { Building2, Plus, Search, Power, Ban, Send, CheckCircle2, DollarSign, Users, AlertTriangle, TrendingUp, MoreVertical, CreditCard, Play } from 'lucide-react';
import { gerarId } from '@/lib/storage';
import { CATEGORIAS_PADRAO, CENTROS_CUSTO_PADRAO, CONTAS_PADRAO } from '@/lib/defaults';
import { TenantSaaS, LicencaStatus } from '@/lib/types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function GerenciamentoClientes() {
  const [tenants, setTenants] = useState<TenantSaaS[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFaturaOpen, setModalFaturaOpen] = useState(false);
  const [faturaSelecionada, setFaturaSelecionada] = useState<TenantSaaS | null>(null);
  const [menuAtivo, setMenuAtivo] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  
  // Form State
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [planão, setPlanão] = useState('mensal');
  const [valor, setValor] = useState(0);
  const [maxUsuarios, setMaxUsuarios] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const loadTenants = async () => {
    try {
      const snap = await getDocs(collection(getDb(), 'tenants'));
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as TenantSaaS)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) return alert('Preencha nome e e-mail');
    setIsSubmitting(true);

    const tenantId = 't_' + gerarId();
    const password = Math.random().toString(36).slice(-8) + 'A1!'; // Gerar senha segura

    try {
      const novoTenant: Partial<TenantSaaS> = {
        nome,
        cnpj,
        emailResponsavel: email,
        planão: planão as any,
        valorAssinatura: valor,
        maxUsuarios,
        status: valor === 0 ? 'Ativo' : 'Aguardando Pagamento',
        dataCriacao: new Date().toISOString(),
        vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dataVencimentoBloqueio: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString() // +5 dias de carência
      };

      await setDoc(doc(getDb(), 'tenants', tenantId), novoTenant);

      const proms = [];
      for (const cat of CATEGORIAS_PADRAO) proms.push(setDoc(doc(getDb(), 'tenants', tenantId, 'categorias', cat.id), cat));
      for (const cc of CENTROS_CUSTO_PADRAO) proms.push(setDoc(doc(getDb(), 'tenants', tenantId, 'centros_custo', cc.id), cc));
      for (const c of CONTAS_PADRAO) proms.push(setDoc(doc(getDb(), 'tenants', tenantId, 'contas', c.id), c));
      await Promise.all(proms);

      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, nome, email, password })
      });

      if (!res.ok) throw new Error('Erro ao provisionar usuário');

      alert(`Licença gerada com sucesso!\n\nUm e-mail será disparado para ${email} com a senha gerada (EmailJS via Backend).`);
      
      setModalOpen(false);
      loadTenants();
      // Reset form
      setNome(''); setCnpj(''); setEmail(''); setValor(0);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar licença: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const alternarStatus = async (tenantId: string, statusAtual: LicencaStatus) => {
    try {
      const novoStatus: LicencaStatus = statusAtual === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
      await updateDoc(doc(getDb(), 'tenants', tenantId), { status: novoStatus });
      loadTenants();
      setMenuAtivo(null);
    } catch (e) {
      alert("Erro ao alterar status");
    }
  };

  const confirmarPagamento = async (tenantId: string) => {
    try {
      // Quando paga, joga o vencimento +30 dias pra frente
      const novoVenc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const novoBloq = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(getDb(), 'tenants', tenantId), { 
        status: 'Ativo', 
        vencimento: novoVenc,
        dataVencimentoBloqueio: novoBloq 
      });
      alert("Pagamento confirmado. Licença renovada por +30 dias!");
      loadTenants();
      setMenuAtivo(null);
    } catch (e) {
      alert("Erro ao registrar pagamento");
    }
  };

  const getStatusBadge = (status: LicencaStatus) => {
    switch (status) {
      case 'Ativo': return <span className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Ativo</span>;
      case 'Bloqueado': return <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><Ban size={12}/> Bloqueado</span>;
      case 'Aguardando Pagamento': return <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><AlertTriangle size={12}/> Pendente</span>;
      default: return <span className="bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-200 dark:border-gray-500/30 px-3 py-1 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const mrr = tenants.filter(t => t.status === 'Ativo').reduce((acc, t) => acc + (t.valorAssinatura || 0), 0);
  const ativos = tenants.filter(t => t.status === 'Ativo').length;
  const pendentes = tenants.filter(t => t.status === 'Aguardando Pagamento').length;

  const tenantsFiltrados = tenants.filter(t => t.nome?.toLowerCase().includes(busca.toLowerCase()) || t.emailResponsavel?.toLowerCase().includes(busca.toLowerCase()));

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Building2 className="text-[var(--primary)]" size={32} /> Central SaaS
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Gestão inteligente de licenças, assinaturas e inquilinãos (Tenants).</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="btn-primary"
        >
          <Plus size={20} />
          Nova Licença
        </button>
      </div>

      {/* Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <p className="text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2"><DollarSign size={16} className="text-blue-500"/> MRR Estimado</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{fmt(mrr)}</h3>
        </div>
        <div className="glass p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <p className="text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2"><Users size={16} className="text-emerald-500"/> Empresas Ativas</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{ativos}</h3>
        </div>
        <div className="glass p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
          <p className="text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2"><TrendingUp size={16} className="text-orange-500"/> Inadimplentes</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{pendentes}</h3>
        </div>
        <div className="glass p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--primary-light)] rounded-full blur-2xl transition-all"></div>
          <p className="text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2"><Building2 size={16} className="text-[var(--primary)]"/> Total de Inquilinãos</p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{tenants.length}</h3>
        </div>
      </div>

      {/* Tabela Interativa */}
      <div className="glass overflow-hidden shadow-sm">
        
        <div className="p-4 border-b border-[var(--border)] flex gap-4 items-center bg-[var(--bg-secondary)]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por empresa ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Empresa & Contato</th>
                <th className="px-6 py-4 font-semibold">Planão & Valores</th>
                <th className="px-6 py-4 font-semibold">Validade</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tenantsFiltrados.map(t => (
                <tr key={t.id} className="hover:bg-[var(--bg-active)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--text-primary)] text-base flex items-center gap-2">
                      {t.nome} 
                      {t.status === 'Ativo' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />}
                    </div>
                    <div className="text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                      {t.emailResponsavel} <span className="text-[var(--border)]">|</span> <span className="text-xs font-monão bg-[var(--bg-primary)] px-2 py-0.5 rounded text-[var(--text-muted)]">{t.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="capitalize text-[var(--text-primary)] font-medium">{t.planão}</div>
                    <div className="text-[var(--primary)] font-bold">{fmt(t.valorAssinatura || 0)}/mês</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[var(--text-primary)]">{t.vencimento ? new Date(t.vencimento).toLocaleDateString('pt-BR') : '-'}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {t.dataVencimentoBloqueio ? `Corte: ${new Date(t.dataVencimentoBloqueio).toLocaleDateString('pt-BR')}` : 'Sem corte'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(t.status || 'Ativo')}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={() => setMenuAtivo(menuAtivo === t.id ? null : t.id)}
                      className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Dropdown de Ações */}
                    {menuAtivo === t.id && (
                      <div className="absolute right-8 top-10 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                        {t.status === 'Aguardando Pagamento' && (
                          <button onClick={() => { setFaturaSelecionada(t); setModalFaturaOpen(true); setMenuAtivo(null); }} className="w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-[var(--bg-primary)] flex items-center gap-2">
                            <CreditCard size={16} /> Receber Fatura
                          </button>
                        )}
                        <button 
                          onClick={() => alternarStatus(t.id, t.status)} 
                          className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] flex items-center gap-2"
                        >
                          {t.status === 'Bloqueado' ? <><Play size={16} className="text-green-500" /> Reativar Acesso</> : <><Power size={16} className="text-red-500" /> Suspender Acesso</>}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tenantsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Building2 size={48} className="mb-4 opacity-20 text-[var(--primary)]" />
                      <p className="text-lg">Nenhuma empresa encontrada.</p>
                      <p className="text-sm">Clique em "Nova Licença" para começar.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Licença - Super Polido */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-primary)]">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                <div className="p-2 bg-[var(--primary-light)] rounded-lg"><Building2 className="text-[var(--primary)]" size={24} /></div>
                Emitir Nova Licença
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleProvision} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              
              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Dados da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nome Fantasia / Razão Social *</label>
                    <input required value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors" placeholder="Ex: Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">CNPJ / CPF</label>
                    <input value={cnpj} onChange={e => setCnpj(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors" placeholder="00.000.000/0001-00" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">E-mail Corporativo (Será o Login Master) *</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors" placeholder="admin@empresa.com.br" />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Configuração Comercial</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Planão Contratado</label>
                    <select value={planão} onChange={e => setPlanão(e.target.value)} className="w-full bg-[var(--select-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors appearance-none">
                      <option value="gratuito">Gratuito (Trial)</option>
                      <option value="mensal">Mensal</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Valor (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={e => setValor(Number(e.target.value))} className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors font-monão" placeholder="99.90" />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Máx. Usuários</label>
                    <input type="number" value={maxUsuarios} onChange={e => setMaxUsuarios(Number(e.target.value))} className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-500/30 p-5 rounded-xl flex gap-4 text-blue-800 dark:text-blue-200 text-sm">
                <Send size={28} className="shrink-0 text-blue-500" />
                <div>
                  <h4 className="font-semibold mb-1">Processo 100% Automatizado</h4>
                  <p className="opacity-90">
                    Ao confirmar, o sistema irá criar um banco de dados isolado (Multi-Tenant), aplicar o planão de contas padrão, gerar uma senha forte e <strong>disparar um e-mail HTML</strong> via EmailJS com as credenciais para o cliente.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-primary)] rounded-xl transition-colors border border-[var(--border)]">
                  Cancelar
                </button>
                <button disabled={isSubmitting} type="submit" className="btn-primary flex items-center gap-2">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Building2 size={20} />}
                  {isSubmitting ? 'Provisionando...' : 'Gerar Licença e Enviar E-mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Fatura (PIX/Boleto) */}
      {modalFaturaOpen && faturaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-primary)]">
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg"><DollarSign className="text-green-600 dark:text-green-400" size={24} /></div>
                Receber Pagamento
              </h2>
              <button onClick={() => { setModalFaturaOpen(false); setFaturaSelecionada(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex justify-between items-center">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Cliente</p>
                  <p className="font-bold text-[var(--text-primary)] text-lg">{faturaSelecionada.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">Valor</p>
                  <p className="font-bold text-green-600 dark:text-green-400 text-xl">{fmt(faturaSelecionada.valorAssinatura || 0)}</p>
                </div>
              </div>

              {/* PIX */}
              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] text-center">
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-2 flex justify-center items-center gap-2">Pagamento via PIX</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Escaneie o QR Code ou utilize o código Copia e Cola abaixo.</p>
                
                {/* Mock QR Code */}
                <div className="bg-white p-2 rounded-xl inline-block mb-4 shadow-sm border border-gray-200">
                  {/* Utilizando uma API publica para gerar QR Code dummy para testes visuais */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021126580014br.gov.bcb.pix0136${faturaSelecionada.id}520400005303986540510.005802BR5913${faturaSelecionada.nome.substring(0, 13)}6009Sao Paulo62070503***6304`} alt="QR Code PIX" className="w-32 h-32" />
                </div>
                
                <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 relative flex items-center">
                  <input readOnly value={`00020101021126580014br.gov.bcb.pix0136${faturaSelecionada.id}5204000053039865405${faturaSelecionada.valorAssinatura?.toFixed(2)}5802BR5913${faturaSelecionada.nome.substring(0, 13)}6009Sao Paulo62070503***6304`} className="bg-transparent text-xs text-[var(--text-secondary)] w-full outline-none font-monão" />
                  <button onClick={() => {
                    navigator.clipboard.writeText(`00020101021126580014br.gov.bcb.pix0136${faturaSelecionada.id}5204000053039865405${faturaSelecionada.valorAssinatura?.toFixed(2)}5802BR5913${faturaSelecionada.nome.substring(0, 13)}6009Sao Paulo62070503***6304`);
                    alert('Código PIX Copiado!');
                  }} className="text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-semibold ml-2">Copiar</button>
                </div>
              </div>

              {/* BOLETO */}
              <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] text-center">
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-2">Boleto Bancário</h3>
                <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 relative flex items-center mt-2">
                  <input readOnly value={`03399.00000 00000.000000 00000.000000 1 00000000000000`} className="bg-transparent text-sm text-[var(--text-secondary)] w-full outline-none font-monão" />
                  <button onClick={() => {
                    navigator.clipboard.writeText(`03399000000000000000000000000000100000000000000`);
                    alert('Código de Barras Copiado!');
                  }} className="text-[var(--primary)] hover:text-[var(--primary-hover)] text-sm font-semibold ml-2">Copiar</button>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)] flex justify-end gap-3">
               <button onClick={() => { setModalFaturaOpen(false); setFaturaSelecionada(null); }} className="px-5 py-2.5 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl transition-colors">
                  Fechar
               </button>
               <button onClick={() => { confirmarPagamento(faturaSelecionada.id); setModalFaturaOpen(false); setFaturaSelecionada(null); }} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> Confirmar Recebimento Manual
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
