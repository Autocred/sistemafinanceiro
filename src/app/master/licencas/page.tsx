'use client';
import React, { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { LicencaMaster } from '@/lib/saas/tenantManager';
import ModalProvisionamento from './ModalProvisionamento';
import Link from 'next/link';
import { ExternalLink, Plus, Search, Edit3, Trash2, Shield, Calendar, Users, Building2, MoreHorizontal, Filter, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LicencasMaster() {
  const [licencas, setLicencas] = useState<LicencaMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(getDb(), 'admin_master_licencas'), orderBy('dataCriacao', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => {
        const data = d.data();
        
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

        return {
          id: d.id,
          ...data,
          nomeFantasia: data.nomeFantasia || 'Sem Nome',
          dominio: data.dominio || '',
          documento: data.documento || '',
          dataCriacao,
          dataVencimento,
        };
      }) as LicencaMaster[];
      
      setLicencas(lista);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const licencasFiltradas = licencas.filter(l => {
    const nome = String(l.nomeFantasia || '').toLowerCase();
    const dom = String(l.dominio || '').toLowerCase();
    const docStr = String(l.documento || '');
    const term = String(busca || '').toLowerCase();

    const matchBusca = nome.includes(term) || dom.includes(term) || docStr.includes(term);
      
    if (filtroStatus === 'todas') return matchBusca;
    return matchBusca && l.status === filtroStatus;
  });

  const getStatusBadge = (status: any) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'ativa': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold uppercase tracking-wider">Ativa</span>;
      case 'suspensa': return <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider">Suspensa</span>;
      case 'inadimplente': return <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold uppercase tracking-wider">Inadimplente</span>;
      case 'teste': return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider">Teste</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider">{s || 'Desconhecido'}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Clientes e Licenças
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os clientes SaaS, domínios e assinaturas do sistema.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* TABS E ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-black text-gray-900">{licencas.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Ativos</p>
          <p className="text-2xl font-black text-emerald-600">{licencas.filter(l => l.status === 'ativa').length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Inadimplentes</p>
          <p className="text-2xl font-black text-amber-600">{licencas.filter(l => l.status === 'inadimplente').length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Suspensos</p>
          <p className="text-2xl font-black text-red-600">{licencas.filter(l => l.status === 'suspensa').length}</p>
        </div>
      </div>

      {/* FILTER AREA */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por cliente, domínio ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold bg-gray-50 px-3 py-2.5 border border-gray-200 rounded-xl">
            <Filter className="w-4 h-4" />
            Status:
            <select 
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-gray-900 cursor-pointer"
            >
              <option value="todas">Todas</option>
              <option value="ativa">Ativas</option>
              <option value="inadimplente">Inadimplentes</option>
              <option value="suspensa">Suspensas</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATAGRID / TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Empresa / Domínio</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Responsável</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Plano</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Datas</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-[11px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {licencasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">Nenhuma licença encontrada.</td>
                </tr>
              ) : (
                licencasFiltradas.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                          {l.nomeFantasia.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{l.nomeFantasia}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide">ID: {l.id.substring(0,8)}</span>
                            <a href={`https://${l.dominio}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 text-[11px] flex items-center gap-0.5 font-medium">
                              <ExternalLink className="w-3 h-3" /> {l.dominio}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">{l.usernameAdmin || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{l.documento}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700 uppercase text-xs tracking-wide bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {l.plano}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs">
                        <p className="text-gray-500 mb-1"><span className="font-semibold text-gray-700">Criado:</span> {l.dataCriacao ? new Date(l.dataCriacao).toLocaleDateString('pt-BR') : 'N/A'}</p>
                        <p className="text-gray-500"><span className="font-semibold text-gray-700">Vence:</span> {l.dataVencimento ? new Date(l.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Licença">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Suspender/Excluir"
                          onClick={async () => {
                            if(confirm(`ATENÇÃO: A exclusão do cliente ${l.nomeFantasia} é permanente (Hard Delete) e removerá todos os dados do banco isolado. Confirmar?`)) {
                               const { deleteDoc, doc } = await import('firebase/firestore');
                               const { getDb } = await import('@/lib/firebase');
                               const db = getDb();
                               try {
                                 // Remover master licenca
                                 await deleteDoc(doc(db, 'admin_master_licencas', l.id));
                                 // Registrar log de exclusao
                                 const { collection } = await import('firebase/firestore');
                                 await import('firebase/firestore').then(async (fs) => {
                                   await fs.setDoc(fs.doc(fs.collection(db, 'saas_audit_logs')), {
                                     acao: 'EXCLUSAO_LICENCA',
                                     entidade: 'licenca',
                                     entidadeId: l.id,
                                     descricao: `Licença permanentemente deletada: ${l.nomeFantasia}`,
                                     autor: 'Sistema Master',
                                     dataHora: new Date().toISOString()
                                   });
                                 });
                               } catch (err) {
                                 alert('Erro ao excluir licença.');
                                 console.error(err);
                               }
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Mais Ações">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ModalProvisionamento 
          onClose={() => setIsModalOpen(false)}
          onSucesso={() => {
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
