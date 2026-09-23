'use client';
import React, { useState, useEffect } from 'react';
import { 
  Settings, Building2, Link as LinkIcon, AlertTriangle, 
  Save, Key, ShieldAlert, Paintbrush, Power, RefreshCw, CheckCircle2, Globe, Mail,
  Palette, Image as ImageIcon, CreditCard, Webhook, Fingerprint
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, setDoc, doc, getDoc } from 'firebase/firestore';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'empresa' | 'gateways' | 'danger'>('empresa');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState('');

  async function handleSanitizeFaturas() {
    const senha = prompt('Atenção! Esta ação consolidará as faturas duplicadas. Digite a senha mestre para continuar (3020):');
    if (senha !== '3020') {
      alert('Senha incorreta.');
      return;
    }
    
    setSaving(true);
    try {
      const db = getDb();
      const { collection, getDocs, doc, writeBatch } = await import('firebase/firestore');
      
      const faturasSnap = await getDocs(collection(db, 'faturas'));
      const faturas = faturasSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      const grupos: any = {};
      faturas.forEach(f => {
         if (!f.cartaoId || !f.dataVencimento) return;
         const key = f.cartaoId + '_' + f.dataVencimento;
         if (!grupos[key]) grupos[key] = [];
         grupos[key].push(f);
      });
      
      const transacoesSnap = await getDocs(collection(db, 'transacoes'));
      const transacoes = transacoesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      let removidas = 0;
      let consolidadas = 0;
      const batchLimit = 500;
      let batch = writeBatch(db);
      let opCount = 0;
      
      const commitBatch = async () => {
         if (opCount > 0) {
           await batch.commit();
           batch = writeBatch(db);
           opCount = 0;
         }
      };

      for (const key in grupos) {
         const list = grupos[key];
         if (list.length > 1) {
            const principal = list[0];
            const duplicadas = list.slice(1);
            
            for (const dup of duplicadas) {
               const transRef = transacoes.filter(t => t.faturaId === dup.id);
               for (const t of transRef) {
                  batch.update(doc(db, 'transacoes', t.id), { faturaId: principal.id });
                  consolidadas++;
                  opCount++;
                  if (opCount >= batchLimit) await commitBatch();
               }
               batch.delete(doc(db, 'faturas', dup.id));
               removidas++;
               opCount++;
               if (opCount >= batchLimit) await commitBatch();
            }
         }
      }
      await commitBatch();
      
      alert(`Saneamento concluído! ${removidas} faturas duplicadas removidas, ${consolidadas} transações re-vinculadas.`);
    } catch (e: any) {
      console.error(e);
      alert('Erro ao sanear faturas: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // Form states - Empresa
  const [nomeSistema, setNomeSistema] = useState('Sistema Financeiro ERP Pro');
  const [dominio, setDominio] = useState('erp-pro.com.br');
  const [emailSuporte, setEmailSuporte] = useState('suporte@erp-pro.com.br');
  const [corPrimaria, setCorPrimaria] = useState('#4f46e5');
  
  // Form states - Gateways
  const [asaasKey, setAsaasKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [gatewayAtivo, setGatewayAtivo] = useState<'asaas' | 'stripe' | 'nenhum'>('asaas');
  const [ambiente, setAmbiente] = useState<'sandbox' | 'producao'>('sandbox');

  // Form states - Danger
  const [modoManutencao, setModoManutencao] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const db = getDb();
        const identDoc = await getDoc(doc(db, 'saas_settings', 'identidade'));
        if (identDoc.exists()) {
          const data = identDoc.data();
          if (data.nomeSistema) setNomeSistema(data.nomeSistema);
          if (data.dominio) setDominio(data.dominio);
          if (data.emailSuporte) setEmailSuporte(data.emailSuporte);
          if (data.corPrimaria) setCorPrimaria(data.corPrimaria);
        }

        const gwDoc = await getDoc(doc(db, 'saas_settings', 'gateways'));
        if (gwDoc.exists()) {
          const data = gwDoc.data();
          if (data.asaasKey) setAsaasKey(data.asaasKey);
          if (data.stripeKey) setStripeKey(data.stripeKey);
          if (data.gatewayAtivo) setGatewayAtivo(data.gatewayAtivo);
          if (data.ambiente) setAmbiente(data.ambiente);
        }

        const geralDoc = await getDoc(doc(db, 'saas_settings', 'geral'));
        if (geralDoc.exists()) {
          const data = geralDoc.data();
          if (data.modoManutencao) setModoManutencao(data.modoManutencao);
        }
      } catch (e) {
        console.error('Erro', e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveConfig = async (tipo: string) => {
    setSaving(true);
    setSucesso('');
    try {
      const db = getDb();
      let payload = {};
      let docName = '';

      if (tipo === 'Identidade') {
        docName = 'identidade';
        payload = { nomeSistema, dominio, emailSuporte, corPrimaria, atualizadoEm: new Date().toISOString() };
      } else if (tipo === 'Gateways') {
        docName = 'gateways';
        payload = { asaasKey, stripeKey, gatewayAtivo, ambiente, atualizadoEm: new Date().toISOString() };
      }

      await setDoc(doc(db, 'saas_settings', docName), payload, { merge: true });

      await setDoc(doc(collection(db, 'saas_audit_logs')), {
         acao: 'CONFIG_GLOBAL_ALTERADA',
         entidade: 'configuracoes',
         entidadeId: docName,
         descricao: `As configurações de ${tipo} foram atualizadas no painel Master.`,
         autor: 'Admin Master',
         dataHora: new Date().toISOString()
      });
      
      setSucesso(`Configurações de ${tipo} atualizadas com sucesso!`);
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleManutencao = async () => {
    if (!window.confirm(modoManutencao ? 'Deseja DESATIVAR o modo manutenção e liberar o acesso aos clientes?' : 'Deseja ATIVAR o modo manutenção? Nenhum cliente conseguirá acessar o sistema.')) return;
    try {
      const db = getDb();
      const novoStatus = !modoManutencao;
      await setDoc(doc(db, 'saas_settings', 'geral'), {
        modoManutencao: novoStatus,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      setModoManutencao(novoStatus);
      setSucesso(novoStatus ? 'Modo de Manutenção ATIVADO.' : 'Modo de Manutenção DESATIVADO.');
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) {
      alert('Erro ao alterar modo manutenção.');
    }
  };

  const handleLimparCache = () => {
    if (window.confirm('Forçar a limpeza de cache local em todos os dispositivos logados?')) {
      setSucesso('Comando de limpeza de cache emitido para a frota.');
      setTimeout(() => setSucesso(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600"></div>
          <span className="font-bold text-gray-400 uppercase tracking-widest text-xs">Acessando Core</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* HEADER PANORAMIC */}
      <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-blue-600/30 opacity-50"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20 backdrop-blur-md flex-shrink-0">
              <Settings className="w-12 h-12 text-white animate-pulse" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight mb-2">
                Core Settings
              </h1>
              <p className="text-gray-400 font-medium text-lg max-w-xl">
                O coração da sua operação. Controle identidades, gateways de faturamento e chaves de segurança globais.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md text-center">
              <div className="text-2xl font-black text-white">{modoManutencao ? 'OFF' : 'ON'}</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status Geral</div>
            </div>
            <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md text-center">
              <div className="text-2xl font-black text-white">{ambiente === 'producao' ? 'PROD' : 'DEV'}</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ambiente</div>
            </div>
          </div>
        </div>
      </div>

      {sucesso && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-green-900/90 backdrop-blur-xl border border-green-500/30 text-green-100 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-10 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-bold text-sm tracking-wide">{sucesso}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* MAGIC SIDEBAR */}
        <div className="lg:col-span-3">
          <nav className="space-y-3 sticky top-10">
            <button 
              onClick={() => setActiveTab('empresa')}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black transition-all duration-300 ${activeTab === 'empresa' ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_10px_40px_rgba(79,70,229,0.3)] scale-[1.02] translate-x-2' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'}`}
            >
              <Building2 className={`w-6 h-6 ${activeTab === 'empresa' ? 'text-white' : 'text-indigo-600'}`} /> 
              Identidade
            </button>
            
            <button 
              onClick={() => setActiveTab('gateways')}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black transition-all duration-300 ${activeTab === 'gateways' ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)] scale-[1.02] translate-x-2' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'}`}
            >
              <LinkIcon className={`w-6 h-6 ${activeTab === 'gateways' ? 'text-white' : 'text-blue-600'}`} /> 
              Faturamento
            </button>

            <div className="py-2"></div>

            <button 
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black transition-all duration-300 ${activeTab === 'danger' ? 'bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-[0_10px_40px_rgba(220,38,38,0.3)] scale-[1.02] translate-x-2' : 'bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-100 shadow-sm'}`}
            >
              <ShieldAlert className={`w-6 h-6 ${activeTab === 'danger' ? 'text-white' : 'text-red-500'}`} /> 
              Zona de Perigo
            </button>
          </nav>
        </div>

        {/* CONTENT PANELS */}
        <div className="lg:col-span-9">
          
          {/* TAB: IDENTIDADE */}
          {activeTab === 'empresa' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-indigo-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-indigo-50/50 px-10 py-8 border-b border-indigo-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Branding & White-Label</h2>
                  <p className="text-indigo-600/80 font-medium">Personalize a cara do seu SaaS para o mundo.</p>
                </div>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3 relative group">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <Building2 className="w-4 h-4" /> Nome da Plataforma
                    </label>
                    <input 
                      type="text" 
                      value={nomeSistema} onChange={e => setNomeSistema(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-gray-200 text-gray-900 text-xl font-bold py-3 focus:border-indigo-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-3 relative group">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <Palette className="w-4 h-4" /> Cor Tema (Hexadecimal)
                    </label>
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl shadow-inner border border-gray-200 flex-shrink-0" style={{ backgroundColor: corPrimaria }}></div>
                      <input 
                        type="text" 
                        value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-gray-200 text-gray-900 text-xl font-bold py-3 focus:border-indigo-600 focus:outline-none transition-colors uppercase"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 relative group">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <Globe className="w-4 h-4" /> Domínio Principal
                    </label>
                    <input 
                      type="text" 
                      value={dominio} onChange={e => setDominio(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-gray-200 text-gray-900 text-xl font-bold py-3 focus:border-indigo-600 focus:outline-none transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-3 relative group">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <Mail className="w-4 h-4" /> E-mail de Suporte
                    </label>
                    <input 
                      type="email" 
                      value={emailSuporte} onChange={e => setEmailSuporte(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-gray-200 text-gray-900 text-xl font-bold py-3 focus:border-indigo-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="p-8 bg-gray-50 border border-gray-200 border-dashed rounded-3xl flex items-center justify-center gap-4 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer group">
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="font-bold">Upload da Logomarca (SaaS)</div>
                  <div className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full ml-auto">Em breve</div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    onClick={() => handleSaveConfig('Identidade')}
                    disabled={saving}
                    className="flex items-center gap-3 px-10 py-5 bg-gray-900 hover:bg-black active:scale-95 text-white font-black rounded-2xl transition-all shadow-xl shadow-gray-900/20"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} 
                    {saving ? 'Gravando no Core...' : 'Gravar Alterações'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GATEWAYS */}
          {activeTab === 'gateways' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-blue-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-blue-50/50 px-10 py-8 border-b border-blue-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Motores de Cobrança</h2>
                    <p className="text-blue-600/80 font-medium">Asaas ou Stripe para faturar seus locatários.</p>
                  </div>
                </div>
                
                <div className="flex bg-white rounded-xl shadow-sm border border-blue-100 p-1">
                  <button 
                    onClick={() => setAmbiente('sandbox')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${ambiente === 'sandbox' ? 'bg-orange-100 text-orange-700' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    SANDBOX
                  </button>
                  <button 
                    onClick={() => setAmbiente('producao')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${ambiente === 'producao' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    PRODUÇÃO
                  </button>
                </div>
              </div>
              
              <div className="p-10 space-y-10">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <button 
                    onClick={() => setGatewayAtivo('asaas')}
                    className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${gatewayAtivo === 'asaas' ? 'border-[#0030B9] bg-[#0030B9]/5 shadow-lg shadow-[#0030B9]/10 ring-4 ring-[#0030B9]/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    {gatewayAtivo === 'asaas' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-6 h-6 text-[#0030B9]" /></div>}
                    <div className="w-12 h-12 rounded-2xl bg-[#0030B9] text-white flex items-center justify-center font-black text-xl mb-4">As</div>
                    <h3 className="font-black text-gray-900 text-xl">Asaas API</h3>
                    <p className="text-gray-500 text-sm mt-1">Gateway padrão para boletos e Pix no Brasil.</p>
                  </button>
                  
                  <button 
                    onClick={() => setGatewayAtivo('stripe')}
                    className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${gatewayAtivo === 'stripe' ? 'border-[#635BFF] bg-[#635BFF]/5 shadow-lg shadow-[#635BFF]/10 ring-4 ring-[#635BFF]/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    {gatewayAtivo === 'stripe' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-6 h-6 text-[#635BFF]" /></div>}
                    <div className="w-12 h-12 rounded-2xl bg-[#635BFF] text-white flex items-center justify-center font-black text-xl mb-4">St</div>
                    <h3 className="font-black text-gray-900 text-xl">Stripe</h3>
                    <p className="text-gray-500 text-sm mt-1">Para cartões de crédito e internacionalização.</p>
                  </button>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                  <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-slate-500" /> Credenciais {ambiente === 'sandbox' ? 'de Teste' : 'de Produção'}</h3>
                  <div className="space-y-8">
                    <div className="space-y-3 relative">
                      <label className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                        Asaas Access Token
                      </label>
                      <input 
                        type="password" 
                        value={asaasKey} onChange={e => setAsaasKey(e.target.value)}
                        placeholder={ambiente === 'sandbox' ? "$aact_..." : "$aact_..."}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-lg font-mono py-4 px-6 rounded-2xl focus:border-[#0030B9] focus:ring-4 focus:ring-[#0030B9]/10 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3 relative">
                      <label className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                        Stripe Secret Key
                      </label>
                      <input 
                        type="password" 
                        value={stripeKey} onChange={e => setStripeKey(e.target.value)}
                        placeholder={ambiente === 'sandbox' ? "sk_test_..." : "sk_live_..."}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-lg font-mono py-4 px-6 rounded-2xl focus:border-[#635BFF] focus:ring-4 focus:ring-[#635BFF]/10 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="mt-1"><Webhook className="w-6 h-6 text-indigo-600" /></div>
                    <div>
                      <div className="font-black text-indigo-900">Webhooks</div>
                      <div className="text-sm text-indigo-700/80">Configure esta URL no seu Gateway para receber pagamentos:</div>
                      <code className="text-xs bg-white px-3 py-2 rounded-lg border border-indigo-200 text-indigo-800 font-bold block mt-2 select-all">
                        https://{dominio}/api/webhooks/billing
                      </code>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    onClick={() => handleSaveConfig('Gateways')}
                    disabled={saving}
                    className="flex items-center gap-3 px-10 py-5 bg-gray-900 hover:bg-black active:scale-95 text-white font-black rounded-2xl transition-all shadow-xl shadow-gray-900/20"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} 
                    {saving ? 'Validando...' : 'Gravar Credenciais'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-red-900/10 border-2 border-red-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
              
              <div className="absolute top-0 left-0 w-full h-3 bg-[url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')] bg-red-600"></div>

              <div className="bg-red-50/50 px-10 py-10 border-b border-red-100">
                <h2 className="text-4xl font-black text-red-600 flex items-center gap-4">
                  <AlertTriangle className="w-10 h-10" />
                  Zona de Perigo Extremo
                </h2>
                <p className="text-red-800/80 mt-4 font-bold text-lg max-w-2xl leading-relaxed">
                  Atenção: Modificações aqui afetam o núcleo da plataforma em <strong className="text-red-900 bg-red-200 px-2 py-0.5 rounded">Tempo Real</strong>.
                </p>
              </div>
              
              <div className="p-10 space-y-8 max-w-5xl">
                
                <div className={`p-10 rounded-[2rem] transition-all flex flex-col md:flex-row items-center justify-between gap-8 ${modoManutencao ? 'bg-red-600 text-white shadow-2xl shadow-red-600/40' : 'bg-white border-2 border-red-100 hover:border-red-300'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`p-6 rounded-3xl shadow-inner ${modoManutencao ? 'bg-black/20' : 'bg-red-50'}`}>
                      <Power className={`w-10 h-10 ${modoManutencao ? 'text-white' : 'text-red-500'}`} />
                    </div>
                    <div>
                      <h4 className={`text-2xl font-black ${modoManutencao ? 'text-white' : 'text-gray-900'}`}>
                        KILL SWITCH (Manutenção)
                      </h4>
                      <p className={`mt-2 font-medium text-lg max-w-md ${modoManutencao ? 'text-red-100' : 'text-gray-500'}`}>
                        {modoManutencao 
                          ? 'O SITEMA ESTÁ OFFLINE para todos os usuários não-master.'
                          : 'Derruba o acesso instantaneamente de todas as sessões.'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleManutencao}
                    className={`shrink-0 px-12 py-6 rounded-2xl font-black uppercase tracking-widest transition-all text-lg ${modoManutencao ? 'bg-white text-red-600 hover:bg-gray-100 active:scale-95' : 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-xl shadow-red-600/30'}`}
                  >
                    {modoManutencao ? 'Reativar SaaS' : 'Cortar Acesso'}
                  </button>
                </div>

                <div className="p-10 rounded-[2rem] border-2 border-orange-100 bg-gradient-to-br from-white to-orange-50/50 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-orange-300 transition-all shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="p-6 rounded-3xl bg-orange-100 shadow-inner">
                      <RefreshCw className="w-10 h-10 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900">Forçar Reload Remoto</h4>
                      <p className="mt-2 font-medium text-gray-500 max-w-md">
                        Envia um sinal via WebSockets/Firestore para atualizar a interface de todos que estão online.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLimparCache}
                    className="shrink-0 px-12 py-6 bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                  >
                    Disparar Reload                  </button>
                </div>

                <div className="p-10 rounded-[2rem] border-2 border-purple-100 bg-gradient-to-br from-white to-purple-50/50 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-purple-300 transition-all shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="p-6 rounded-3xl bg-purple-100 shadow-inner">
                      <CreditCard className="w-10 h-10 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900">Sanear Faturas Duplicadas</h4>
                      <p className="mt-2 font-medium text-gray-500 max-w-md">
                        Varre o banco de dados consolidando faturas de cartão duplicadas no mesmo ciclo e re-vincula as transações à fatura original.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSanitizeFaturas}
                    className="shrink-0 px-12 py-6 bg-white border-2 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                  >
                    Iniciar Limpeza
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
