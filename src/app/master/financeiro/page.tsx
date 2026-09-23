'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, ArrowDownToLine, ShieldAlert, Search,
  CheckCircle2, PlusCircle, AlertTriangle, Receipt,
  Building2, Calendar, Clock, X, ExternalLink, RefreshCw,
  ChevronRight, Zap, TrendingUp, Filter, Lock, Unlock
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, getDocs } from 'firebase/firestore';
import { atualizarStatusFaturaSaaS } from '@/lib/saas/billingManager';
import { formatarMoeda } from '@/lib/storage';

export default function FinanceiroMaster() {
  const router = useRouter();
  const [faturas, setFaturas] = useState<any[]>([]);
  const [licencas, setLicencas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [modalPlanoId, setModalPlanoId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [confirmPagar, setConfirmPagar] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  // Modal Nova Fatura
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTenantId, setModalTenantId] = useState('');
  const [modalClienteNome, setModalClienteNome] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novosMeses, setNovosMeses] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDb();

    // Faturas — fonte única de verdade
    const qF = query(collection(db, 'admin_master_faturas'), orderBy('dataVencimento', 'desc'));
    const unsubF = onSnapshot(qF, (snap) => {
      setFaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.warn(err); setLoading(false); });

    // Licenças para o selector do modal
    const unsubL = onSnapshot(collection(db, 'admin_master_licencas'), (snap) => {
      setLicencas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubF(); unsubL(); };
  }, []);

  const handleDarBaixa = async (faturaId: string) => {
    setProcessando(faturaId);
    try {
      await atualizarStatusFaturaSaaS(faturaId, 'pago', new Date().toISOString().split('T')[0]);
      const db = getDb();
      await setDoc(doc(collection(db, 'saas_audit_logs')), {
        acao: 'FATURA_PAGA',
        entidade: 'fatura',
        entidadeId: faturaId,
        descricao: `Fatura ${faturaId.slice(0, 8)} marcada como PAGA — licença ativada automaticamente.`,
        autor: 'Sistema Master',
        dataHora: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao processar pagamento.');
    } finally {
      setProcessando(null);
      setConfirmPagar(null);
    }
  };

  const handleCriarFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTenantId) { alert('Selecione uma licença.'); return; }
    setSaving(true);
    try {
      const db = getDb();
      const faturaId = `fat_${Date.now()}`;
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 30);

      await setDoc(doc(db, 'admin_master_faturas', faturaId), {
        tenantId: modalTenantId,
        clienteNome: modalClienteNome,
        dominio: modalTenantId,
        valor: parseFloat(novoValor),
        dataVencimento: vencimento.toISOString().split('T')[0],
        status: 'pendente',
        descricao: novaDescricao || 'Cobrança avulsa',
        mesesLiberacao: parseInt(novosMeses),
        dataCriacao: new Date().toISOString()
      });

      await setDoc(doc(collection(db, 'saas_audit_logs')), {
        acao: 'NOVA_FATURA',
        entidade: 'fatura',
        entidadeId: faturaId,
        descricao: `Fatura manual criada para ${modalClienteNome}.`,
        planoId: modalPlanoId,
        autor: 'Sistema Master',
        dataHora: new Date().toISOString()
      });

      setIsModalOpen(false);
      setModalTenantId('');
      setModalClienteNome('');
      setNovoValor('');
      setNovaDescricao(''); setModalPlanoId('');
      setNovosMeses('1');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar fatura.');
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const faturasNesteMes = faturas.filter(f => (f.dataVencimento || '').startsWith(mesAtual));
  const mrr = faturasNesteMes.reduce((acc, f) => acc + (f.valor || 0), 0);
  const recebido = faturasNesteMes.filter(f => f.status === 'pago').reduce((acc, f) => acc + (f.valor || 0), 0);
  const pendentesTotal = faturas.filter(f => f.status === 'pendente').reduce((acc, f) => acc + (f.valor || 0), 0);
  const atrasadasTotal = faturas.filter(f => f.status === 'atrasado').reduce((acc, f) => acc + (f.valor || 0), 0);
  const totalAReceber = pendentesTotal + atrasadasTotal;

  const faturasFiltradas = faturas.filter(f => {
    const search = busca.toLowerCase();
    const matchBusca = (f.clienteNome || '').toLowerCase().includes(search)
      || (f.tenantId || '').toLowerCase().includes(search)
      || (f.descricao || '').toLowerCase().includes(search);
    const matchStatus = filtroStatus === 'todas' || f.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Pago</span>;
      case 'pendente': return <span className="px-2.5 py-1 bg-[#cc092f]mber-50 text-amber-700 border border-amber-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Pendente</span>;
      case 'atrasado': return <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Atrasado</span>;
      case 'cancelada': return <span className="px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-300 rounded-none text-xs font-bold uppercase tracking-wider w-max">Cancelada</span>;
      default: return null;
    }
  };

  const isVencida = (f: any) => f.status === 'pendente' && f.dataVencimento && new Date(f.dataVencimento + 'T12:00:00') < hoje;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-[#cc092f]" />
            Faturamento SaaS
          </h1>
          <p className="text-gray-500 mt-1">Gestão centralizada de cobranças. Ao marcar uma fatura como paga, a licença é liberada automaticamente.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#cc092f] hover:bg-[#a00725] text-white rounded-none font-bold transition-all shadow-md hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          Nova Cobrança Manual
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'MRR (Mês Atual)', value: formatarMoeda(mrr), icon: <DollarSign className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50', badge: 'Realtime', badgeCor: 'text-[#cc092f] bg-blue-100' },
          { label: 'Recebido (Mês)', value: formatarMoeda(recebido), icon: <ArrowDownToLine className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50', badge: null, badgeCor: '' },
          { label: 'A Receber', value: formatarMoeda(totalAReceber), icon: <TrendingUp className="w-5 h-5 text-violet-500" />, bg: 'bg-violet-50', badge: `${faturas.filter(f => f.status === 'pendente').length} faturas`, badgeCor: 'text-violet-600 bg-violet-100' },
          { label: 'Inadimplência', value: formatarMoeda(atrasadasTotal), icon: <ShieldAlert className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', badge: faturas.filter(f => f.status === 'atrasado').length > 0 ? `${faturas.filter(f => f.status === 'atrasado').length} em atraso` : null, badgeCor: 'text-red-600 bg-red-100' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-none p-5 border border-gray-300 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${kpi.bg} rounded-none flex items-center justify-center`}>{kpi.icon}</div>
              {kpi.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none ${kpi.badgeCor}`}>{kpi.badge}</span>}
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* INFO BANNER */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-none p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-indigo-800">Como funciona o vínculo Fatura ↔ Licença</p>
          <p className="text-sm text-[#cc092f] mt-0.5">
            Cada fatura está vinculada a uma licença pelo <strong>Tenant ID</strong>. Ao clicar em <strong>"✓ Dar Baixa"</strong>, o sistema automaticamente altera o status da licença para <strong>Ativa</strong> e calcula a nova data de vencimento com base nos meses de liberação da fatura. Você também pode ver as faturas de cada licença individualmente em <strong>Licenças → [Nome da Licença] → Aba "Faturas"</strong>.
          </p>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-none shadow-sm overflow-hidden border border-gray-300">
        {/* Filtros */}
        <div className="p-5 border-b border-gray-300 flex flex-col md:flex-row justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Todas as Cobranças</h2>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente ou descrição..."
                value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-none pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
              />
            </div>
            <select
              value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 rounded-none px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[#cc092f] outline-none"
            >
              <option value="todas">Todos os Status</option>
              <option value="pendente">🟡 Pendentes</option>
              <option value="pago">🟢 Pagas</option>
              <option value="atrasado">🔴 Atrasadas</option>
              <option value="cancelada">⚪ Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-300 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Cliente / Licença</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Descrição</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Valor</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Vencimento</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Carregando cobranças...
                </td></tr>
              ) : faturasFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhuma cobrança encontrada</p>
                  <p className="text-gray-400 text-sm mt-1">As cobranças são geradas automaticamente ao provisionar uma licença paga.</p>
                </td></tr>
              ) : faturasFiltradas.map((f) => {
                const vencida = isVencida(f);
                return (
                  <tr key={f.id} className={`hover:bg-gray-50/50 transition-colors ${vencida ? 'bg-red-50/30' : ''}`}>
                    {/* Cliente / Licença */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0 ${f.status === 'pago' ? 'bg-emerald-50 text-[#cc092f]' : f.status === 'atrasado' || vencida ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-[#cc092f]'}`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{f.clienteNome || '—'}</p>
                          {f.tenantId && (
                            <button
                              onClick={() => router.push(`/master/licencas/${f.tenantId}`)}
                              className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {f.tenantId} · Ver licença
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Descrição */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{f.descricao || '—'}</p>
                      {f.mesesLiberacao && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {f.mesesLiberacao} {f.mesesLiberacao === 1 ? 'mês' : 'meses'} de acesso
                        </p>
                      )}
                    </td>
                    {/* Valor */}
                    <td className="px-6 py-4">
                      <span className="font-black text-gray-900 text-lg">{formatarMoeda(f.valor || 0)}</span>
                    </td>
                    {/* Vencimento */}
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${vencida ? 'text-red-600' : 'text-gray-600'}`}>
                        <Calendar className="w-4 h-4" />
                        {f.dataVencimento ? new Date(f.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        {vencida && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-none">VENCIDA</span>}
                      </div>
                      {f.dataPagamento && (
                        <p className="text-[11px] text-[#cc092f] mt-0.5">Pago em {new Date(f.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(f.status)}</td>
                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {f.tenantId && (
                          <button
                            onClick={() => router.push(`/master/licencas/${f.tenantId}`)}
                            className="p-1.5 text-gray-400 hover:text-[#cc092f] hover:bg-indigo-50 rounded-none transition-colors"
                            title="Ver licença"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        {f.status !== 'pago' && f.status !== 'cancelada' && (
                          confirmPagar === f.id ? (
                            <div className="flex gap-1.5 items-center">
                              <span className="text-xs text-gray-500 font-medium">Confirmar?</span>
                              <button
                                onClick={() => handleDarBaixa(f.id)}
                                disabled={!!processando}
                                className="text-xs font-bold bg-[#cc092f] text-white px-3 py-1.5 rounded-none transition-colors hover:bg-[#a00725] flex items-center gap-1"
                              >
                                {processando === f.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                                Sim, Pago
                              </button>
                              <button onClick={() => setConfirmPagar(null)} className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-none hover:bg-gray-200">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmPagar(f.id)}
                              className="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-none transition-colors border border-emerald-200 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Dar Baixa
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA COBRANÇA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#cc092f]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-10 py-6 border-b border-gray-300 bg-[#cc092f]">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                Nova Cobrança Manual
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-200 hover:text-white hover:bg-emerald-500 p-2 rounded-none transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCriarFatura} className="px-10 py-8 space-y-6">
              {/* Licença */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Plano Vinculado *</label>
                <select
                  required
                  value={modalPlanoId}
                  onChange={e => {
                    const pid = e.target.value;
                    setModalPlanoId(pid);
                    const plano = planos.find(p => p.id === pid);
                    if (plano && novosMeses) {
                      setNovoValor((plano.preco * parseInt(novosMeses)).toFixed(2));
                      setNovaDescricao(`Renovação - ${plano.nome} (${novosMeses} meses)`);
                    }
                  }}
                  className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                >
                  <option value="">Selecione o plano...</option>
                  {planos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - R$ {Number(p.preco || 0).toFixed(2)}/mês</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Licença / Cliente *</label>
                <select
                  value={modalTenantId}
                  onChange={e => {
                    const id = e.target.value;
                    setModalTenantId(id);
                    const lic = licencas.find(l => l.id === id);
                    setModalClienteNome(lic?.nomeFantasia || id);
                  }}
                  className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                >
                  <option value="">Selecione a licença...</option>
                  {licencas.map(l => (
                    <option key={l.id} value={l.id}>{l.nomeFantasia} ({l.id})</option>
                  ))}
                </select>
              </div>

              {/* Valor + Meses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Valor (R$) *</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={novoValor} onChange={e => setNovoValor(e.target.value)}
                    placeholder="Ex: 97.00"
                    className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Meses de acesso *</label>
                  <select
                    value={novosMeses} onChange={e => {
                      const m = e.target.value;
                      setNovosMeses(m);
                      const plano = planos.find(p => p.id === modalPlanoId);
                      if (plano) {
                        setNovoValor((plano.preco * parseInt(m)).toFixed(2));
                        setNovaDescricao(`Renovação - ${plano.nome} (${m} meses)`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                  >
                    <option value="1">1 mês (Mensal)</option>
                    <option value="3">3 meses (Trimestral)</option>
                    <option value="6">6 meses (Semestral)</option>
                    <option value="12">12 meses (Anual)</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Descrição</label>
                <input
                  type="text"
                  value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)}
                  placeholder="Ex: Renovação mensal – Agosto/2026"
                  className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>

              <div className="bg-[#cc092f]mber-50 border border-amber-100 rounded-none p-3 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">Ao dar baixa nesta fatura, o sistema liberará automaticamente o acesso da licença pelo período informado.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-none transition-colors" disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-[#cc092f] hover:bg-[#a00725] text-white font-bold rounded-none transition-all shadow-md">
                  {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</> : <><Receipt className="w-4 h-4" /> Gerar Cobrança</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
