'use client';
import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Clock, Plus, X, Rocket, Bug, Shield,
  GitCommit, Trash2, Edit3, Eye, EyeOff, Send,
  ChevronDown, ChevronUp, Zap, Star, CheckCircle2,
  Wrench, Lock, TrendingUp, Bell, AlertCircle
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface ChangeItem {
  tipo: 'novo' | 'melhoria' | 'correcao' | 'seguranca' | 'breaking';
  texto: string;
}

interface BacklogItem {
  id: string;
  titulo: string;
  tipo: 'novo' | 'melhoria' | 'correcao' | 'seguranca' | 'breaking';
  status: 'pendente' | 'publicado';
  data: string;
}

interface Release {
  id: string;
  versao: string;
  titulo: string;
  descricao: string;
  changes: ChangeItem[];
  dataLancamento: string;
  status: 'publicado' | 'rascunho';
  notificarTenants: boolean;
  destaque: boolean;
  alvos?: string | string[];
}

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; cor: string; bg: string; border: string }> = {
  novo:      { label: 'Novo', icon: <Rocket className="w-3.5 h-3.5" />, cor: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  melhoria:  { label: 'Melhoria', icon: <TrendingUp className="w-3.5 h-3.5" />, cor: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  correcao:  { label: 'Correção', icon: <Bug className="w-3.5 h-3.5" />, cor: 'text-amber-700', bg: 'bg-[#cc092f]mber-50', border: 'border-amber-200' },
  seguranca: { label: 'Segurança', icon: <Shield className="w-3.5 h-3.5" />, cor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  breaking:  { label: 'Breaking', icon: <AlertCircle className="w-3.5 h-3.5" />, cor: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const RELEASES_INICIAIS: Omit<Release, 'id'>[] = [
  {
    versao: 'v3.5.0',
    titulo: 'Dashboard Interativo com Links Inteligentes',
    descricao: 'Todos os indicadores do Dashboard agora são clicáveis e direcionam para os lançamentos exatos do filtro selecionado.',
    changes: [
      { tipo: 'novo', texto: 'Todos os KPIs do Dashboard agora navegam diretamente para os lançamentos filtrados' },
      { tipo: 'correcao', texto: 'Filtro "Vencidas a Pagar" corrigido — cartões de crédito não eram exibidos incorretamente como vencidos' },
      { tipo: 'melhoria', texto: 'Performance de carregamento do Dashboard otimizada' },
    ],
    dataLancamento: new Date('2026-08-25').toISOString(),
    status: 'publicado',
    notificarTenants: true,
    destaque: false,
  },
  {
    versao: 'v3.6.0',
    titulo: 'Sistema de Licenciamento SaaS Completo',
    descricao: 'Novo motor de provisionamento de licenças com controle de acesso, cobranças automáticas e painel de gestão de assinaturas.',
    changes: [
      { tipo: 'novo', texto: 'Provisionamento de licenças zeradas e cruas com todos os módulos liberados' },
      { tipo: 'novo', texto: 'Força troca de senha no primeiro acesso do cliente' },
      { tipo: 'novo', texto: 'Link de acesso sempre contém o identificador do cliente (?tenant=nome)' },
      { tipo: 'novo', texto: 'Plano Free: ativação imediata sem cobrança, validade indefinida' },
      { tipo: 'novo', texto: 'Planos pagos: fatura gerada automaticamente ao provisionar, sistema bloqueado até pagamento' },
      { tipo: 'novo', texto: 'Ao marcar fatura como pago, licença é ativada automaticamente com data de vencimento calculada' },
      { tipo: 'novo', texto: 'Tela de cobrança com QR Code PIX real e chave copiável para o cliente' },
      { tipo: 'melhoria', texto: 'Módulos do sistema liberados por padrão ao criar nova licença independente do plano' },
      { tipo: 'seguranca', texto: 'Flag requirePasswordChange=true garantida no perfil do admin do tenant' },
    ],
    dataLancamento: new Date('2026-08-26').toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
  },
];

export default function AtualizacoesPage() {
  const [updates, setUpdates] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [seeded, setSeeded] = useState(false);
  const [seededBacklog, setSeededBacklog] = useState(false);

  // Form
  const [versao, setVersao] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'publicado' | 'rascunho'>('publicado');
  const [destaque, setDestaque] = useState(false);
  const [notificarTenants, setNotificarTenants] = useState(true);
  const [changes, setChanges] = useState<ChangeItem[]>([{ tipo: 'novo', texto: '' }]);
  const [alvos, setAlvos] = useState<string | string[]>('todos');
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [backlogSelecionados, setBacklogSelecionados] = useState<string[]>([]);
  const [listaTenants, setListaTenants] = useState<any[]>([]);

  useEffect(() => {
    import('firebase/firestore').then(({ getDocs }) => {
      getDocs(query(collection(getDb(), 'admin_master_tenants'))).then(snap => {
        setListaTenants(snap.docs.map(d => ({ id: d.id, nome: d.data().empresa || d.data().responsavel || d.id })));
      }).catch(console.error);
    });
    const db = getDb();
    const qBacklog = query(collection(db, 'saas_backlog'), orderBy('data', 'asc'));
    onSnapshot(qBacklog, (snap) => {
      setBacklog(snap.docs.map(d => ({ id: d.id, ...d.data() } as BacklogItem)).filter(b => b.status === 'pendente'));
    });

    const q = query(collection(db, 'saas_releases'), orderBy('dataLancamento', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const lista: Release[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Release));
      setUpdates(lista);
      setLoading(false);

      
      if (backlog.length === 0 && !seededBacklog) {
        setSeededBacklog(true);
        const bd = getDb();
        setDoc(doc(bd, 'saas_backlog', 'bk1'), { titulo: 'Novo menu Formas de Pagamento (Personalizado)', tipo: 'novo', status: 'pendente', data: new Date().toISOString() });
        setDoc(doc(bd, 'saas_backlog', 'bk2'), { titulo: 'Correção: Menu Atualizações redirecionando para Dashboard', tipo: 'correcao', status: 'pendente', data: new Date().toISOString() });
        setDoc(doc(bd, 'saas_backlog', 'bk3'), { titulo: 'Visual Bradesco Premium nas Telas de Cadastro (Bordas arredondadas)', tipo: 'melhoria', status: 'pendente', data: new Date().toISOString() });
      }

      // Seed inicial se vazio
      if (lista.length === 0 && !seeded) {
        setSeeded(true);
        for (const rel of RELEASES_INICIAIS) {
          const id = `rel_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
          await setDoc(doc(db, 'saas_releases', id), { ...rel, id });
        }
      }
    }, (err) => {
      console.warn('Erro ao carregar:', err);
      setLoading(false);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [seeded]);

  const resetForm = () => {
    setVersao('');
    setTitulo('');
    setDescricao('');
    setStatus('publicado');
    setDestaque(false);
    setNotificarTenants(true);
    setChanges([{ tipo: 'novo', texto: '' }]);
    setAlvos('todos');
    setBacklogSelecionados([]);
    setEditingRelease(null);
  };

  const handleOpenNew = () => {
    resetForm();
    if (updates.length > 0) {
      const lastVer = updates[0].versao || 'v1.0.0';
      const match = lastVer.match(/v(\d+)\.(\d+)\.(\d+)/);
      if (match) {
        setVersao(`v${match[1]}.${parseInt(match[2]) + 1}.0`);
      } else {
        setVersao(lastVer + ' (nova)');
      }
    } else {
      setVersao('v1.0.0');
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Release) => {
    setEditingRelease(r);
    setVersao(r.versao);
    setTitulo(r.titulo);
    setDescricao(r.descricao || '');
    setStatus(r.status);
    setDestaque(r.destaque || false);
    setNotificarTenants(r.notificarTenants || false);
    setChanges(r.changes?.length ? r.changes : [{ tipo: 'novo', texto: '' }]);
    setAlvos(r.alvos || 'todos');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validChanges = changes.filter(c => c.texto.trim());
    if (!versao || !titulo || validChanges.length === 0) {
      alert('Preencha versão, título e pelo menos uma mudança.');
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      const id = editingRelease?.id || `rel_${Date.now()}`;
      const data: Release = {
        id, versao, titulo, descricao,
        changes: validChanges,
        dataLancamento: editingRelease?.dataLancamento || new Date().toISOString(),
        status, destaque, notificarTenants, alvos
      };
      import('firebase/firestore').then(async ({ writeBatch }) => {
        const batch = writeBatch(db);
        batch.set(doc(db, 'saas_releases', id), data);
        backlogSelecionados.forEach(bId => {
          batch.update(doc(db, 'saas_backlog', bId), { status: 'publicado' });
        });
        await batch.commit();
      });
      await setDoc(doc(collection(db, 'saas_audit_logs')), {
        acao: editingRelease ? 'VERSAO_EDITADA' : 'NOVA_VERSAO_LANCADA',
        entidade: 'sistema', entidadeId: versao,
        descricao: `Versão ${versao} — "${titulo}" ${editingRelease ? 'atualizada' : 'publicada'}.`,
        autor: 'Sistema Master', dataHora: new Date().toISOString()
      });
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar versão.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, versao: string) => {
    if (!confirm(`Excluir a versão ${versao}? Esta ação não pode ser desfeita.`)) return;
    const db = getDb();
    await deleteDoc(doc(db, 'saas_releases', id));
  };

  const handleToggleStatus = async (r: Release) => {
    const db = getDb();
    await updateDoc(doc(db, 'saas_releases', r.id), {
      status: r.status === 'publicado' ? 'rascunho' : 'publicado'
    });
  };

  const addChange = () => setChanges(prev => [...prev, { tipo: 'novo', texto: '' }]);
  const removeChange = (i: number) => setChanges(prev => prev.filter((_, idx) => idx !== i));
  const updateChange = (i: number, field: keyof ChangeItem, value: string) =>
    setChanges(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const publicados = updates.filter(u => u.status === 'publicado');
  const rascunhos = updates.filter(u => u.status === 'rascunho');

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <GitCommit className="w-8 h-8 text-[#cc092f]" />
            Changelog & Atualizações
          </h1>
          <p className="text-gray-500 mt-1">Publique e documente todas as melhorias da plataforma para os clientes.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#cc092f] hover:bg-[#a00725] text-white rounded-none font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Nova Versão
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Versões Publicadas', value: publicados.length, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Rascunhos', value: rascunhos.length, icon: <Edit3 className="w-5 h-5 text-amber-500" />, bg: 'bg-[#cc092f]mber-50' },
          { label: 'Total de Mudanças', value: updates.reduce((acc, u) => acc + (u.changes?.length || 0), 0), icon: <Wrench className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Com Destaque', value: updates.filter(u => u.destaque).length, icon: <Star className="w-5 h-5 text-violet-500" />, bg: 'bg-violet-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-none p-4 border border-gray-300 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.bg} rounded-none flex items-center justify-center flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* RASCUNHOS */}
      {rascunhos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <EyeOff className="w-4 h-4" /> Rascunhos ({rascunhos.length})
          </h2>
          <div className="space-y-3">
            {rascunhos.map(r => <ReleaseCard key={r.id} release={r} expanded={expanded[r.id]} onToggle={() => toggleExpand(r.id)} onEdit={() => handleOpenEdit(r)} onDelete={() => handleDelete(r.id, r.versao)} onToggleStatus={() => handleToggleStatus(r)} />)}
          </div>
        </div>
      )}

      {/* TIMELINE PUBLICADOS */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Changelog Publicado
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : publicados.length === 0 ? (
          <div className="bg-white rounded-none border border-gray-300 shadow-sm text-center py-16">
            <GitCommit className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700">Nenhuma versão publicada ainda</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Publique a primeira versão para iniciar o histórico de evolução da plataforma.</p>
            <button onClick={handleOpenNew} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#cc092f] text-white font-bold rounded-none hover:bg-[#a00725] transition-colors">
              <Plus className="w-4 h-4" /> Publicar Primeira Versão
            </button>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-300 ml-5 space-y-8 pb-8">
            {publicados.map(r => (
              <ReleaseCard
                key={r.id}
                release={r}
                timeline
                expanded={expanded[r.id]}
                onToggle={() => toggleExpand(r.id)}
                onEdit={() => handleOpenEdit(r)}
                onDelete={() => handleDelete(r.id, r.versao)}
                onToggleStatus={() => handleToggleStatus(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#cc092f]/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-10 py-6 border-b border-gray-300 bg-[#cc092f]">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <GitCommit className="w-6 h-6" />
                {editingRelease ? 'Editar Versão' : 'Publicar Nova Versão'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-blue-200 hover:text-white hover:bg-blue-500 p-2 rounded-none transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* BACKLOG INTELIGENTE */}
              {backlog.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-none space-y-3 mb-4">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Sugestões Pendentes (Feitas pela IA/Equipe)
                  </p>
                  <div className="space-y-2">
                    {backlog.map(b => (
                      <label key={b.id} className="flex items-start gap-2 cursor-pointer bg-white p-2 border border-blue-100 hover:border-blue-300 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={backlogSelecionados.includes(b.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setBacklogSelecionados([...backlogSelecionados, b.id]);
                              // Auto-fill changes
                              const existingEmpty = changes.findIndex(c => c.texto === '');
                              if (existingEmpty >= 0) {
                                const newChanges = [...changes];
                                newChanges[existingEmpty] = { tipo: b.tipo as any, texto: b.titulo };
                                setChanges(newChanges);
                              } else {
                                setChanges([...changes, { tipo: b.tipo as any, texto: b.titulo }]);
                              }
                              // Auto-fill title if empty
                              if (!titulo) setTitulo('Atualização de Sistema');
                            } else {
                              setBacklogSelecionados(backlogSelecionados.filter(id => id !== b.id));
                              setChanges(changes.filter(c => c.texto !== b.titulo));
                            }
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-800">{b.titulo}</p>
                          <p className="text-xs text-gray-500 capitalize">{b.tipo}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600">Selecione as melhorias acima para preencher automaticamente as mudanças abaixo.</p>
                </div>
              )}

              {/* Versão + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Versão *</label>
                  <input
                    type="text" required
                    value={versao} onChange={e => setVersao(e.target.value)}
                    placeholder="Ex: v3.7.0"
                    className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                  >
                    <option value="publicado">✅ Publicado</option>
                    <option value="rascunho">📝 Rascunho</option>
                  </select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Título *</label>
                <input
                  type="text" required
                  value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Painel de Relatórios Avançado"
                  className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Resumo (opcional)</label>
                <textarea
                  rows={2}
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Breve descrição desta versão..."
                  className="w-full bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-2 focus:ring-[#cc092f] outline-none resize-none"
                />
              </div>

              {/* Mudanças */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700">Mudanças da Versão *</label>
                  <button type="button" onClick={addChange} className="text-xs text-[#cc092f] hover:text-blue-800 font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {changes.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={c.tipo}
                        onChange={e => updateChange(i, 'tipo', e.target.value)}
                        className="bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#cc092f] flex-shrink-0"
                      >
                        <option value="novo">✨ Novo</option>
                        <option value="melhoria">📈 Melhoria</option>
                        <option value="correcao">🐛 Correção</option>
                        <option value="seguranca">🛡 Segurança</option>
                        <option value="breaking">⚠️ Breaking</option>
                      </select>
                      <input
                        type="text"
                        value={c.texto}
                        onChange={e => updateChange(i, 'texto', e.target.value)}
                        placeholder="Descreva a mudança..."
                        className="flex-1 bg-slate-50 border border-gray-300 text-gray-900 rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-[#cc092f] outline-none"
                      />
                      {changes.length > 1 && (
                        <button type="button" onClick={() => removeChange(i)} className="text-gray-400 hover:text-red-500 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opções */}
              <div className="bg-slate-50 border border-gray-300 rounded-none p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opções</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={destaque} onChange={e => setDestaque(e.target.checked)} className="w-4 h-4 text-[#cc092f] rounded" />
                  <span className="text-sm font-medium text-gray-700"><Star className="w-4 h-4 inline text-yellow-500 mr-1" />Marcar como destaque</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={notificarTenants} onChange={e => setNotificarTenants(e.target.checked)} className="w-4 h-4 text-[#cc092f] rounded" />
                  <span className="text-sm font-medium text-gray-700"><Bell className="w-4 h-4 inline text-blue-500 mr-1" />Notificar tenants sobre esta versão</span>
                </label>
              </div>

              
              {/* Alvos */}
              <div className="bg-slate-50 border border-gray-300 rounded-none p-4 space-y-3 mt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Público Alvo (Licenças)</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={alvos === 'todos'} onChange={() => setAlvos('todos')} className="w-4 h-4 text-[#cc092f]" />
                  <span className="text-sm font-medium text-gray-700">Todas as Licenças (Global)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={Array.isArray(alvos)} onChange={() => setAlvos([])} className="w-4 h-4 text-[#cc092f]" />
                  <span className="text-sm font-medium text-gray-700">Licenças Específicas</span>
                </label>
                
                {Array.isArray(alvos) && (
                  <div className="mt-2 pl-7 space-y-2 max-h-40 overflow-y-auto border border-gray-200 p-2 bg-white">
                    {listaTenants.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                         <input type="checkbox" checked={alvos.includes(t.id)} onChange={e => {
                           if (e.target.checked) setAlvos([...alvos, t.id]);
                           else setAlvos(alvos.filter(a => a !== t.id));
                         }} className="text-[#cc092f] focus:ring-[#cc092f]" />
                         <span className="text-sm text-gray-800">{t.nome}</span>
                      </label>
                    ))}
                    {listaTenants.length === 0 && <span className="text-xs text-gray-400">Nenhuma licença encontrada.</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-none transition-colors" disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-[#cc092f] hover:bg-[#a00725] text-white font-bold rounded-none transition-all shadow-md">
                  {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : <><Send className="w-4 h-4" /> {editingRelease ? 'Salvar Alterações' : 'Publicar Versão'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CARD DE RELEASE ──────────────────────────────────────────────────────────
function ReleaseCard({
  release, timeline = false, expanded, onToggle, onEdit, onDelete, onToggleStatus
}: {
  release: Release;
  timeline?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const allChanges = release.changes || [];
  const preview = allChanges.slice(0, 3);
  const hasMore = allChanges.length > 3;

  const CardContent = (
    <div className={`bg-white border ${release.destaque ? 'border-blue-200 shadow-blue-50' : 'border-gray-300'} rounded-none shadow-sm overflow-hidden group ${release.destaque ? 'ring-2 ring-[#cc092f]/20' : ''}`}>
      {/* Header do Card */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono font-black text-lg text-gray-900">{release.versao}</span>
            {release.destaque && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-none uppercase tracking-wider">
                <Star className="w-2.5 h-2.5" /> Destaque
              </span>
            )}
            {release.status === 'rascunho' && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-none uppercase tracking-wider">Rascunho</span>
            )}
            {release.notificarTenants && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-[#cc092f] rounded-none uppercase tracking-wider">
                <Bell className="w-2.5 h-2.5" /> Notificado
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-sm">{release.titulo}</h3>
          {release.descricao && <p className="text-gray-500 text-xs mt-0.5">{release.descricao}</p>}
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
            <Clock className="w-3 h-3" />
            {new Date(release.dataLancamento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onToggleStatus} title={release.status === 'publicado' ? 'Despublicar' : 'Publicar'} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-[#cc092f]mber-50 rounded-none transition-colors">
            {release.status === 'publicado' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-[#cc092f] hover:bg-blue-50 rounded-none transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-none transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Changes */}
      <div className="px-5 pb-4 space-y-1.5">
        {(expanded ? allChanges : preview).map((c, i) => {
          const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.novo;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.border} ${cfg.cor} border flex-shrink-0 mt-0.5`}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="text-sm text-gray-700">{c.texto}</span>
            </div>
          );
        })}

        {hasMore && (
          <button onClick={onToggle} className="flex items-center gap-1 text-xs font-bold text-[#cc092f] hover:text-blue-800 mt-2 transition-colors">
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas as {allChanges.length} mudanças</>}
          </button>
        )}
      </div>
    </div>
  );

  if (!timeline) return CardContent;

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={`absolute -left-[13px] top-5 w-6 h-6 rounded-none border-4 border-gray-50 flex items-center justify-center ${release.destaque ? 'bg-[#cc092f]' : 'bg-white border-2 border-gray-300'} shadow-sm`}>
        {release.destaque ? <Star className="w-3 h-3 text-white" /> : <GitCommit className="w-3 h-3 text-gray-400" />}
      </div>
      {CardContent}
    </div>
  );
}
