'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getDb } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getPlanosSaaS, PlanoSaaS, LicencaMaster } from '@/lib/saas/tenantManager';
import { Shield, ArrowLeft, Building2, Globe, Server, CheckCircle2, XCircle, Database, LayoutDashboard, Key, DownloadCloud, FileText, Activity, Receipt, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatarMoeda } from '@/lib/storage';

export default function LicencaDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [licenca, setLicenca] = useState<LicencaMaster | null>(null);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [showEditModal, setShowEditModal] = useState(false);
  const [planos, setPlanos] = useState<PlanoSaaS[]>([]);
  const [editForm, setEditForm] = useState({ razaoSocial: '', nomeFantasia: '', documento: '', plano: '' });
  
  // Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmNome, setDeleteConfirmNome] = useState('');
  const [deleteConfirmSenha, setDeleteConfirmSenha] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const db = getDb();
    
    getPlanosSaaS().then(p => setPlanos(p.filter(x => x.ativo)));
    
    // Listener da Licença
    const docRef = doc(db, 'admin_master_licencas', id);
    const unsubLicenca = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let dataCriacao = new Date();
        if (data.dataCriacao) {
          if (typeof data.dataCriacao.toDate === 'function') dataCriacao = data.dataCriacao.toDate();
          else dataCriacao = new Date(data.dataCriacao);
        }
        
        let dataVencimento = null;
        if (data.dataVencimento) {
          if (typeof data.dataVencimento.toDate === 'function') dataVencimento = data.dataVencimento.toDate();
          else dataVencimento = new Date(data.dataVencimento);
        }

        setLicenca({ 
          id: docSnap.id, 
          ...data,
          nomeFantasia: String(data.nomeFantasia || 'Sem Nome'),
          dominio: String(data.dominio || ''),
          documento: String(data.documento || ''),
          razaoSocial: String(data.razaoSocial || ''),
          plano: String(data.plano || 'Sem Plano'),
          status: String(data.status || 'Desconhecido'),
          dataCriacao,
          dataVencimento,
        } as LicencaMaster);
      } else {
        setLicenca(null);
      }
      setLoading(false);
    });

    // Listener das Faturas deste cliente
    const qFaturas = query(collection(db, 'admin_master_faturas'), where('tenantId', '==', id));
    const unsubFaturas = onSnapshot(qFaturas, (snap) => {
      setFaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listener do Usuário Admin principal
    const qAdmin = query(collection(db, `tenants/${id}/users`), where('role', '==', 'admin'));
    const unsubAdmin = onSnapshot(qAdmin, (snap) => {
      if (!snap.empty) {
        setAdminUser({ uid: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setAdminUser(null);
      }
    });

    return () => {
      unsubLicenca();
      unsubFaturas();
      unsubAdmin();
    };
  }, [id]);

  const handleAlterarStatus = async (novoStatus: 'ativa' | 'suspensa') => {
    if (!confirm(`Tem certeza que deseja mudar o status para ${novoStatus.toUpperCase()}?`)) return;
    try {
      const docRef = doc(getDb(), 'admin_master_licencas', id);
      await updateDoc(docRef, { status: novoStatus });
    } catch (error) {
      alert('Erro ao atualizar status');
    }
  };

  const handleDeleteTenant = async () => {
    setDeleteError('');
    if (deleteConfirmSenha !== '3020') {
      setDeleteError('Senha Master incorreta.');
      return;
    }
    if (deleteConfirmNome.trim().toLowerCase() !== licenca?.nomeFantasia?.toLowerCase()) {
      setDeleteError('O nome da empresa não confere.');
      return;
    }

    try {
      setUpdating(true);
      const db = getDb();
      const { writeBatch, deleteDoc } = await import('firebase/firestore');

      // 1. Deletar subcoleções base pelo Frontend
      const collectionsToClean = [
        'contas', 'cartoes', 'categorias', 'centros_custo', 'faturas', 
        'transacoes', 'alertas', 'configuracoes_app', 'financial_movements',
        'historico_ia', 'metas', 'orcamentos', 'users'
      ];

      for (const col of collectionsToClean) {
        try {
          const colRef = collection(db, `tenants/${licenca!.id}/${col}`);
          const snapshot = await getDocs(colRef);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        } catch(e) {}
      }

      // 2. Deletar Faturas Master
      try {
        const q = query(collection(db, 'admin_master_faturas'), where('tenantId', '==', licenca!.id));
        const mFaturas = await getDocs(q);
        if (!mFaturas.empty) {
          const batch = writeBatch(db);
          mFaturas.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch(e){}

      // 3. Deletar licença master e root tenant
      try { await deleteDoc(doc(db, 'admin_master_licencas', licenca!.id)); } catch(e){}
      try { await deleteDoc(doc(db, 'tenants', licenca!.id)); } catch(e){}

      // 4. API para finalizar Exclusão e Log
      await fetch('/api/licencas/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: licenca!.id })
      });

      alert('Licença e contas excluídas com sucesso. E-mail, CPF/CNPJ e URL estão liberados.');
      router.push('/master/licencas');
    } catch (e: any) {
      setDeleteError('Erro crítico ao excluir: ' + e.message);
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Carregando tenant...</p>
      </div>
    );
  }

  if (!licenca) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <Shield className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Registro não encontrado</h2>
        <button onClick={() => router.push('/master/licencas')} className="text-blue-600 hover:underline">Voltar para Licenças</button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/master/licencas" className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-gray-900">{licenca.nomeFantasia || 'Sem Nome'}</h1>
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                String(licenca.status).toLowerCase() === 'ativa' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                String(licenca.status).toLowerCase() === 'suspensa' ? 'bg-red-50 text-red-600 border border-red-200' : 
                'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {licenca.status || 'Desconhecido'}
              </div>
            </div>
            <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
              <Globe className="w-4 h-4" /> 
              {licenca.dominio}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleAlterarStatus(licenca.status === 'suspensa' ? 'ativa' : 'suspensa')}
            className={`px-4 py-2 rounded-xl border font-medium flex items-center gap-2 transition-all shadow-sm ${
              licenca.status === 'suspensa' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            {licenca.status === 'suspensa' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {licenca.status === 'suspensa' ? 'Reativar Licença' : 'Suspender Licença'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('faturas')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'faturas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          Faturas e Pagamentos
        </button>
        <button 
          onClick={() => setActiveTab('configuracoes')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'configuracoes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          Configurações
        </button>
      </div>

      {/* TAB CONTENT: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Dados da Empresa
                </h2>
                <button 
                  onClick={() => {
                    setEditForm({ razaoSocial: licenca.razaoSocial, nomeFantasia: licenca.nomeFantasia, documento: licenca.documento, plano: licenca.plano });
                    setShowEditModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-bold"
                >
                  Editar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Razão Social</p>
                  <p className="font-semibold text-gray-900">{licenca.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">CNPJ/CPF</p>
                  <p className="font-semibold text-gray-900">{licenca.documento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Criado em</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {licenca.dataCriacao ? String(licenca.dataCriacao.toLocaleDateString('pt-BR')) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Status Atual</p>
                  <p className="font-semibold text-gray-900">{licenca.status || 'Desconhecido'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" /> Infraestrutura do Tenant
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">Instância Isolada (Schema/Collection)</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Key className="w-4 h-4" /> ID: {licenca.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={updating}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <DownloadCloud className="w-4 h-4" /> Exportar Dados
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" /> Plano e Assinatura
              </h2>
              
              <div className="mb-6">
                <span className="text-purple-700 font-bold uppercase text-xs bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                  {licenca.plano || 'Sem Plano'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm font-medium">Próx. Vencimento</span>
                  <span className="font-bold text-gray-900">
                    {licenca.dataVencimento ? String(licenca.dataVencimento.toLocaleDateString('pt-BR')) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-medium">Ciclo de Faturamento</span>
                  <span className="font-bold text-gray-900">Mensal</span>
                </div>
              </div>

              <button onClick={() => router.push('/master/financeiro/nova-venda')} className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                Alterar Plano
              </button>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Acesso e Suporte
              </h2>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1 pb-3 border-b border-gray-100">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Link do Cliente</span>
                  <a 
                    href={licenca.dominio && !licenca.dominio.includes('.') ? `${window.location.origin}/?tenant=${licenca.dominio}` : `https://${licenca.dominio}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1.5 w-max break-all"
                  >
                    {licenca.dominio && !licenca.dominio.includes('.') ? `${window.location.origin}/?tenant=${licenca.dominio}` : `https://${licenca.dominio}`} <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                </div>

                <div className="flex flex-col gap-1 pb-3 border-b border-gray-100">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Usuário Administrador (Login)</span>
                  <span className="font-semibold text-gray-900">
                    {licenca.usernameAdmin ? licenca.usernameAdmin : (adminUser ? adminUser.email : <span className="text-gray-400 italic">Não configurado</span>)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 pb-3 border-b border-gray-100">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Senha Inicial Gerada</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-max text-sm">
                    {licenca.senhaProvisoria ? licenca.senhaProvisoria : (adminUser ? 'Não registrada' : '-')}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <button 
                  onClick={() => {
                    if (adminUser) {
                      localStorage.setItem('impersonate_tenant', licenca.dominio);
                      const userParaImpersonar = {
                         ...adminUser,
                         nome: licenca.nomeFantasia || adminUser.nome
                      };
                      localStorage.setItem('impersonate_user', JSON.stringify(userParaImpersonar));
                      const link = licenca.dominio && !licenca.dominio.includes('.') 
                        ? `${window.location.origin}/?tenant=${licenca.dominio}` 
                        : `https://${licenca.dominio}`;
                      window.location.href = link;
                    } else {
                      alert('Nenhum usuário administrador cadastrado nesta licença.');
                    }
                  }}
                  className="w-full py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-100 shadow-sm"
                >
                  <Activity className="w-4 h-4" /> Acessar como Cliente
                </button>
                <button 
                  onClick={() => alert('Acesso à recuperação de senha ou envio de link de reset para o cliente.')}
                  className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Resetar Senha do Admin
                </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  disabled={updating}
                  className="w-full py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-colors flex justify-center items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {updating ? 'Processando...' : 'Excluir Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FATURAS */}
      {activeTab === 'faturas' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Histórico Financeiro
            </h3>
            <button onClick={() => router.push('/master/financeiro/nova-venda')} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              Gerar Fatura Avulsa
            </button>
          </div>
          
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Vencimento</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Descrição</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Valor</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {faturas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma fatura encontrada para este cliente.
                    </td>
                  </tr>
                ) : (
                  faturas.sort((a,b) => (b.dataVencimento > a.dataVencimento ? 1 : -1)).map((f: any) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {f.dataVencimento ? String(new Date(f.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {String(f.descricao || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">
                        {formatarMoeda(Number(f.valor) || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          f.status === 'pago' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          f.status === 'pendente' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {String(f.status || '')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONFIGURACOES */}
      {activeTab === 'configuracoes' && (
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" /> Configurações de Módulos (Feature Flags)
          </h2>
          <p className="text-gray-500 text-sm mb-6">Ative ou desative módulos específicos no painel deste cliente. Isso sobrescreve as permissões do plano.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'modulo_vendas', label: 'Módulo de Vendas', desc: 'Acesso completo a PDV e Vendas' },
              { key: 'modulo_financeiro', label: 'Gestão Financeira', desc: 'Contas a Pagar/Receber e Fluxo de Caixa' },
              { key: 'modulo_nfe', label: 'Emissão de Notas', desc: 'Integração com SEFAZ para NF-e/NFC-e' },
              { key: 'modulo_relatorios', label: 'Relatórios Avançados', desc: 'BI e Exportações em Lote' },
            ].map(mod => {
              const isActive = licenca.configuracoes?.modulos?.[mod.key] ?? false;
              return (
                <div key={mod.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-900">{mod.label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{mod.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isActive}
                      readOnly // Needs function to handle, leaving static for view
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Editar Licença */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Editar Licença</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia</label>
                <input 
                  type="text" 
                  value={editForm.nomeFantasia} 
                  onChange={e => setEditForm({...editForm, nomeFantasia: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Razão Social</label>
                <input 
                  type="text" 
                  value={editForm.razaoSocial} 
                  onChange={e => setEditForm({...editForm, razaoSocial: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ/CPF</label>
                <input 
                  type="text" 
                  value={editForm.documento} 
                  onChange={e => setEditForm({...editForm, documento: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Plano Atual</label>
                <select 
                  value={editForm.plano} 
                  onChange={e => setEditForm({...editForm, plano: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Selecionar Plano</option>
                  <option value="Free">Free (Gratuito)</option>
                  {planos.map(p => (
                    <option key={p.id} value={p.nome}>{p.nome} - R$ {p.preco}/mês</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  setUpdating(true);
                  try {
                    await updateDoc(doc(getDb(), 'admin_master_licencas', licenca.id), editForm);
                    setShowEditModal(false);
                  } catch (e) {
                    alert('Erro ao atualizar licença');
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {updating ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deletar Licença */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-black text-red-700 text-xl flex items-center gap-2">
                <Shield className="w-6 h-6" /> EXCLUSÃO DEFINITIVA
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-red-400 hover:text-red-700 bg-white rounded-full p-1"><XCircle size={24} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-sm">
                <p className="font-bold mb-2">⚠ Esta ação excluirá permanentemente:</p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-xs">
                  <li>Licença e banco de dados do Tenant ({licenca?.dominio})</li>
                  <li>Todos os Usuários, Clientes, Fornecedores e Lançamentos</li>
                  <li>Todos os Uploads, Contas e Cartões</li>
                  <li>Liberação automática do E-mail e CPF/CNPJ para novos cadastros</li>
                </ul>
                <p className="font-bold mt-3 underline">A operação não poderá ser desfeita.</p>
              </div>

              {deleteError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-bold border border-red-200">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Digite <span className="text-red-600 bg-red-50 px-1 rounded">{licenca?.nomeFantasia?.toUpperCase()}</span> para confirmar:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmNome} 
                  onChange={e => setDeleteConfirmNome(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition-colors uppercase font-bold"
                  placeholder="NOME DA EMPRESA"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha Master</label>
                <input 
                  type="password" 
                  value={deleteConfirmSenha} 
                  onChange={e => setDeleteConfirmSenha(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition-colors"
                  placeholder="Sua senha master"
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={updating}
                className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteTenant}
                disabled={updating || !deleteConfirmNome || !deleteConfirmSenha}
                className="px-6 py-3 rounded-xl font-black bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {updating ? 'PROCESSANDO...' : 'EXCLUIR DEFINITIVAMENTE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
