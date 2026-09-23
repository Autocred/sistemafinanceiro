'use client';
import React, { useState, useEffect } from 'react';
import { Package, Check, Star, Plus, Edit2, Trash2, X, CreditCard, ChevronRight } from 'lucide-react';
import { getPlanosSaaS, salvarPlanoSaaS, deletarPlanoSaaS, PlanoSaaS } from '@/lib/saas/tenantManager';
import { formatarMoeda } from '@/lib/storage';
import { getDb } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

const MODULOS_DISPONIVEIS = [
  'Dashboard', 'Lancamentos', 'Cartoes', 'Contas Bancarias', 
  'Relatorios', 'DRE', 'Conciliacao', 'Centro de Custos', 
  'Metas', 'Inteligencia Artificial (CFO)', 'White Label'
];

export default function PlanosPage() {
  const [planos, setPlanos] = useState<PlanoSaaS[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPlano, setEditPlano] = useState<PlanoSaaS | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [periodicidade, setPeriodicidade] = useState<'mensal' | 'anual' | 'semestral' | 'trimestral'>('mensal');
  const [limiteUsuarios, setLimiteUsuarios] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [stripeProductId, setStripeProductId] = useState('');
  const [asaasPlanId, setAsaasPlanId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getPlanosSaaS();
    setPlanos(data);
    setLoading(false);
  }

  const openNew = () => {
    setEditPlano(null);
    setNome(''); setDescricao(''); setPreco(''); setPeriodicidade('mensal');
    setLimiteUsuarios(''); setFeatures([]); setStripeProductId(''); setAsaasPlanId('');
    setAtivo(true);
    setIsModalOpen(true);
  };

  const openEdit = (p: PlanoSaaS) => {
    setEditPlano(p);
    setNome(p.nome); setDescricao(p.descricao); setPreco(p.preco.toString());
    setPeriodicidade(p.periodicidade); setLimiteUsuarios((p.limiteUsuarios || 0).toString());
    setFeatures(p.features || []); setStripeProductId(p.stripeProductId || '');
    setAsaasPlanId(p.asaasPlanId || ''); setAtivo(p.ativo);
    setIsModalOpen(true);
  };

  const handleToggleFeature = (f: string) => {
    if (features.includes(f)) setFeatures(features.filter(x => x !== f));
    else setFeatures([...features, f]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p: PlanoSaaS = {
        id: editPlano?.id || Date.now().toString(36),
        nome,
        descricao,
        preco: parseFloat(preco),
        periodicidade,
        limiteUsuarios: parseInt(limiteUsuarios) || 0,
        features,
        ativo,
        stripeProductId,
        asaasPlanId
      };
      await salvarPlanoSaaS(p);
      
      const db = getDb();
      await setDoc(doc(collection(db, 'saas_audit_logs')), {
         acao: editPlano ? 'PLANO_EDITADO' : 'PLANO_CRIADO',
         entidade: 'planos',
         entidadeId: p.id,
         descricao: `O plano ${p.nome} foi ${editPlano ? 'editado' : 'criado'} no painel Master.`,
         autor: 'Admin Master',
         dataHora: new Date().toISOString()
      });

      await load();
      setIsModalOpen(false);
    } catch (err) {
      alert('Erro ao salvar o plano');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este plano? Novas assinaturas não poderão ser feitas.')) {
      await deletarPlanoSaaS(id);
      await load();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-gray-200 border-t-[#cc092f]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto bg-[#f5f6fa] min-h-screen font-sans">
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b-2 border-gray-300 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-[#cc092f]"></div>
          <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">
            Planos de Assinatura
          </h1>
        </div>
        <button 
          onClick={openNew}
          className="flex items-center gap-2 px-6 py-3 bg-[#cc092f] hover:bg-[#a00725] text-white font-bold rounded-none transition-colors uppercase text-sm"
        >
          <Plus className="w-5 h-5" /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map(plano => (
          <div key={plano.id} className={`bg-white border ${plano.ativo ? 'border-gray-300' : 'border-gray-200 opacity-75'} rounded-none relative flex flex-col`}>
            {!plano.ativo && (
              <div className="absolute top-0 right-0 bg-gray-600 text-white text-xs font-bold px-3 py-1 uppercase rounded-none">Inativo</div>
            )}
            
            <div className="p-6 flex-1">
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{plano.nome}</h3>
              <p className="text-gray-500 mt-1 text-sm">{plano.descricao}</p>
              
              <div className="mt-6 mb-4">
                <span className="text-3xl font-black text-[#cc092f]">{formatarMoeda(plano.preco)}</span>
                <span className="text-gray-500 font-medium ml-1 uppercase text-sm">/ {plano.periodicidade}</span>
              </div>
              
              <div className="space-y-2 mt-6 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#cc092f]" /> 
                  <span className="font-semibold">{plano.limiteUsuarios === 0 ? 'Usuários Ilimitados' : `Até ${plano.limiteUsuarios} usuários`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#cc092f]" /> 
                  <span className="font-semibold">{plano.features?.length || 0} módulos liberados</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                ID: {plano.id}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(plano)} className="p-2 text-gray-500 hover:text-[#cc092f] hover:bg-red-50 transition-colors border border-transparent hover:border-[#cc092f]">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(plano.id)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 transition-colors border border-transparent hover:border-gray-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {planos.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-gray-300 bg-white">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 uppercase">Nenhum plano cadastrado</h3>
            <p className="text-gray-500 mt-1">Crie o primeiro plano para começar a vender licenças.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center px-8 py-6 bg-[#cc092f] text-white">
              <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
                <Package className="w-5 h-5" />
                {editPlano ? 'Editar Plano' : 'Criar Novo Plano'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-red-200 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white px-12 py-10">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* COLUNA ESQUERDA: INFORMAÇÕES */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b-2 border-gray-100 pb-2 mb-6">Informações Básicas</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase">Nome do Plano *</label>
                    <input 
                      type="text" required
                      value={nome} onChange={e => setNome(e.target.value)}
                      placeholder="Ex: Plano Master Corporate"
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">Preço (R$) *</label>
                      <input 
                        type="number" step="0.01" required
                        value={preco} onChange={e => setPreco(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">Periodicidade</label>
                      <div className="relative">
                        <select 
                          value={periodicidade} onChange={e => setPeriodicidade(e.target.value as any)}
                          className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none transition-colors appearance-none"
                        >
                          <option value="mensal">MENSAL</option>
                          <option value="trimestral">TRIMESTRAL</option>
                          <option value="semestral">SEMESTRAL</option>
                          <option value="anual">ANUAL</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase">Limite de Usuários (0 = Ilimitado)</label>
                    <input 
                      type="number"
                      value={limiteUsuarios} onChange={e => setLimiteUsuarios(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase">Descrição Curta</label>
                    <input 
                      type="text" 
                      value={descricao} onChange={e => setDescricao(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none transition-colors"
                    />
                  </div>

                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b-2 border-gray-100 pb-2 mt-8 mb-6">Integrações de Pagamento</h3>
                  
                  <div className="px-10 py-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">Stripe Product ID</label>
                      <input 
                        type="text" 
                        value={stripeProductId} onChange={e => setStripeProductId(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">Asaas Plan ID</label>
                      <input 
                        type="text" 
                        value={asaasPlanId} onChange={e => setAsaasPlanId(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-none px-4 py-3 focus:ring-1 focus:ring-[#cc092f] focus:border-[#cc092f] outline-none font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ativo}
                        onChange={e => setAtivo(e.target.checked)}
                        className="w-5 h-5 accent-[#cc092f] rounded-none border-gray-300"
                      />
                      <span className="text-sm font-bold text-gray-800 uppercase">Plano Ativo (Disponível)</span>
                    </label>
                  </div>
                </div>

                {/* COLUNA DIREITA: MÓDULOS */}
                <div className="space-y-6 bg-gray-50 p-6 border border-gray-200">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-6">Módulos Inclusos</h3>
                  
                  <div className="space-y-1">
                    {MODULOS_DISPONIVEIS.map(modulo => (
                      <label key={modulo} className="flex items-center gap-3 p-3 bg-white border border-gray-200 cursor-pointer hover:border-[#cc092f] transition-colors">
                        <input 
                          type="checkbox" 
                          checked={features.includes(modulo)}
                          onChange={() => handleToggleFeature(modulo)}
                          className="w-5 h-5 accent-[#cc092f] rounded-none border-gray-300"
                        />
                        <span className="text-sm font-bold text-gray-700 uppercase">{modulo}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-xs font-semibold text-yellow-800 uppercase leading-relaxed">
                      Atenção: Os módulos selecionados acima definem estritamente as permissões do sistema para os clientes deste plano. Telas não marcadas serão ocultadas.
                    </p>
                  </div>
                </div>

              </div>
              
              {/* FIXED FOOTER */}
              <div className="mt-10 pt-6 border-t-2 border-gray-200 px-8 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold uppercase text-sm hover:bg-gray-100 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-10 py-3 bg-[#cc092f] text-white font-bold uppercase text-sm hover:bg-[#a00725] transition-colors flex items-center gap-2"
                >
                  {saving ? 'Processando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
