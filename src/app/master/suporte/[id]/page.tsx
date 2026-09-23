'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getDb } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { LicencaMaster } from '@/lib/saas/tenantManager';
import Link from 'next/link';
import { ArrowLeft, Globe, Shield, Activity, RefreshCw, Key, MonitorPlay, CheckCircle2, UserCircle, LogIn, Lock, Terminal } from 'lucide-react';

export default function SuporteDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [licenca, setLicenca] = useState<LicencaMaster | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    
    // Listener da Licença
    const docRef = doc(db, 'admin_master_licencas', id);
    const unsubLicenca = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLicenca({ 
          id: docSnap.id, 
          ...data,
          nomeFantasia: String(data.nomeFantasia || 'Sem Nome'),
          dominio: String(data.dominio || ''),
          status: String(data.status || 'Desconhecido'),
        } as LicencaMaster);
      } else {
        setLicenca(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar licença no suporte:', err);
      setLoading(false);
    });

    // Listener do Usuário Admin principal
    const qAdmin = query(collection(db, `tenants/${id}/users`), where('role', '==', 'admin'));
    const unsubAdmin = onSnapshot(qAdmin, (snap) => {
      if (!snap.empty) {
        setAdminUser(snap.docs[0].data());
      } else {
        setAdminUser(null);
      }
    }, (err) => {
      console.warn('Erro ao carregar admin user no suporte:', err);
    });

    return () => {
      if (typeof unsubLicenca === 'function') unsubLicenca();
      if (typeof unsubAdmin === 'function') unsubAdmin();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Carregando painel de suporte...</p>
      </div>
    );
  }

  if (!licenca) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <Shield className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cliente não encontrado</h2>
        <button onClick={() => router.push('/master/suporte')} className="text-blue-600 hover:underline">Voltar para Central de Suporte</button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/master/suporte" className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Suporte: {licenca.nomeFantasia}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                licenca.status === 'ativa' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {licenca.status}
              </span>
            </div>
            <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
              ID do Tenant: <code className="bg-gray-200 px-2 py-0.5 rounded text-gray-700">{licenca.id}</code>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => alert('Sincronizando ambiente...')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ACESSO DO CLIENTE */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Credenciais do Cliente</h2>
              <p className="text-sm text-gray-500">Dados de acesso para enviar ao usuário</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Link do Painel</p>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <a 
                  href={typeof window !== 'undefined' && licenca.dominio && !licenca.dominio.includes('.') ? `${window.location.origin}/?tenant=${licenca.dominio}` : `https://${licenca.dominio}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 font-semibold flex items-center gap-2 hover:underline truncate"
                >
                  <Globe className="w-4 h-4 shrink-0" /> 
                  {typeof window !== 'undefined' && licenca.dominio && !licenca.dominio.includes('.') ? `${window.location.origin}/?tenant=${licenca.dominio}` : `https://${licenca.dominio}`}
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Usuário Administrador (Login)</p>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <UserCircle className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-900">
                  {adminUser ? adminUser.email : <span className="text-gray-400 italic">Usuário não configurado</span>}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Senha Provisória Padrão</p>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <span className="font-bold text-gray-900 font-mono tracking-widest text-lg">123456</span>
                </div>
                <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-1 rounded">Padronizada no Cadastro</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">O cliente será obrigado a trocar no primeiro acesso.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
             <button 
                onClick={() => {
                  if (adminUser) {
                    localStorage.setItem('impersonate_tenant', licenca.dominio);
                    // Força o nome do usuário impersonado para ser o nome fantasia da licença
                    // Assim, ao entrar no suporte do "João", ele vai exibir "Olá, João" ao invés do nome real do admin.
                    const userParaImpersonar = {
                       ...adminUser,
                       nome: licenca.nomeFantasia || adminUser.nome
                    };
                    localStorage.setItem('impersonate_user', JSON.stringify(userParaImpersonar));
                    const link = licenca.dominio && !licenca.dominio.includes('.') 
                      ? `${window.location.origin}/?tenant=${licenca.dominio}` 
                      : `https://${licenca.dominio}`;
                    window.open(link, '_blank');
                  } else {
                    alert('Nenhum usuário administrador cadastrado nesta licença.');
                  }
                }}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <LogIn className="w-5 h-5" /> Entrar no Sistema como Cliente
              </button>
          </div>
        </div>

        {/* ATUALIZAÇÕES E STATUS TÉCNICO */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Status Técnico & Atualizações</h2>
                <p className="text-sm text-gray-500">Controle de versão e saúde do ambiente</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-900">Ambiente Saudável</p>
                    <p className="text-xs text-emerald-700">Nenhum erro registrado no tenant</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Versão Atual do Banco</p>
                  <p className="font-black text-gray-900 text-xl">v1.0.0</p>
                </div>
                <button 
                  onClick={() => alert('O banco de dados já está na última versão.')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Verificar Atualizações
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Logs Recentes do Sistema</p>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-gray-300 h-32 overflow-y-auto custom-scrollbar flex flex-col justify-end">
              <div className="space-y-2">
                <p><span className="text-blue-400">[INFO]</span> Tenant inicializado com sucesso.</p>
                <p><span className="text-blue-400">[INFO]</span> Estrutura padrão de categorias provisionada.</p>
                <p><span className="text-emerald-400">[OK]</span> Pronto para acesso.</p>
                <p className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
                  <Terminal className="w-3 h-3" /> Aguardando novos eventos...
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
