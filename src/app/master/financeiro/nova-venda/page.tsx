'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { getPlanosSaaS, PlanoSaaS, LicencaMaster } from '@/lib/saas/tenantManager';
import { criarFaturaSaaS } from '@/lib/saas/billingManager';
import { formatarMoeda } from '@/lib/storage';
import { ArrowLeft, Search, Package, Calendar, CheckCircle2, Building2, CreditCard, Receipt, Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function NovaVendaPage() {
  const router = useRouter();
  
  // Step control
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Data
  const [clientes, setClientes] = useState<LicencaMaster[]>([]);
  const [planos, setPlanos] = useState<PlanoSaaS[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);
  
  // Selections
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<LicencaMaster | null>(null);
  
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoSaaS | null>(null);
  
  // Billing details
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    async function carregar() {
      setLoadingDados(true);
      try {
        // Load Plans
        const planosDb = await getPlanosSaaS();
        setPlanos(planosDb.filter(p => p.ativo));
        
        // Load Clients
        const snap = await getDocs(query(collection(getDb(), 'admin_master_licencas'), orderBy('dataCriacao', 'desc')));
        const clientesDb = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LicencaMaster[];
        setClientes(clientesDb);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDados(false);
      }
    }
    carregar();
  }, []);

  // Update billing details automatically when a plan is selected
  useEffect(() => {
    if (planoSelecionado) {
      setValor(planoSelecionado.preco.toString());
      setDescricao(`Assinatura - ${planoSelecionado.nome}`);
      
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + 5); // Default 5 days from now
      setDataVencimento(hoje.toISOString().split('T')[0]);
    }
  }, [planoSelecionado]);

  const clientesFiltrados = clientes.filter(c => 
    c.nomeFantasia?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.razaoSocial?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.documento?.includes(buscaCliente)
  );

  const handleGerarCobranca = async () => {
    if (!clienteSelecionado || !planoSelecionado || !valor || !dataVencimento) return;
    
    setGerando(true);
    try {
      await criarFaturaSaaS({
        tenantId: clienteSelecionado.id,
        clienteNome: clienteSelecionado.nomeFantasia,
        dominio: clienteSelecionado.dominio,
        valor: parseFloat(valor),
        dataVencimento,
        status: 'pendente',
        descricao
      });
      
      setStep(4); // Success step
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar cobrança.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-4">
        <Link href="/master/financeiro" className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Nova Cobrança / Venda</h1>
          <p className="text-gray-500 mt-1">Siga o fluxo para gerar uma nova licença ou fatura avulsa.</p>
        </div>
      </div>

      {/* STEPPER */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 z-0 rounded-full"></div>
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          
          {[
            { num: 1, title: 'Cliente' },
            { num: 2, title: 'Plano' },
            { num: 3, title: 'Cobrança' },
            { num: 4, title: 'Concluído' }
          ].map((s) => (
            <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
                step >= s.num ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className={`text-xs font-bold ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT FOR STEPS */}
      {loadingDados ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Carregando dados...
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
          
          {/* STEP 1: CLIENTE */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Selecione o Cliente
                </h2>
                <Link href="/master/licencas" className="text-blue-600 text-sm font-semibold hover:underline">
                  + Novo Cliente
                </Link>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, razão social ou CPF/CNPJ..."
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {clientesFiltrados.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      setClienteSelecionado(c);
                      setStep(2);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${clienteSelecionado?.id === c.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.nomeFantasia}</h3>
                      <p className="text-xs text-gray-500 mt-1">{c.documento}</p>
                      <div className="mt-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded inline-block">
                        {c.dominio}
                      </div>
                    </div>
                  </div>
                ))}
                {clientesFiltrados.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 font-medium">
                    Nenhum cliente encontrado.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PLANO */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Selecione o Plano
              </h2>
              
              {planos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">Nenhum plano cadastrado no sistema.</p>
                  <Link href="/master/planos" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Cadastrar Plano</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {planos.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setPlanoSelecionado(p);
                        setStep(3);
                      }}
                      className={`relative rounded-2xl border-2 cursor-pointer transition-all p-6 flex flex-col ${planoSelecionado?.id === p.id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 shadow-sm'}`}
                    >
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{p.nome}</h3>
                      <p className="text-sm text-gray-500 mb-4 h-10">{p.descricao}</p>
                      
                      <div className="mb-4">
                        <span className="text-2xl font-black text-gray-900">{formatarMoeda(p.preco)}</span>
                        <span className="text-xs text-gray-500">/{p.periodicidade}</span>
                      </div>
                      
                      <ul className="space-y-2 mt-auto text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          {p.limiteUsuarios === 0 ? 'Ilimitado' : p.limiteUsuarios} usuários
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-6 border-t border-gray-100 flex justify-start">
                <button onClick={() => setStep(1)} className="text-gray-600 font-bold hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COBRANÇA */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" /> Detalhes da Cobrança
              </h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                
                <div className="flex-1 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Valor a cobrar (R$)</label>
                    <input 
                      type="number" step="0.01" 
                      value={valor} onChange={e => setValor(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Data de Vencimento</label>
                    <input 
                      type="date" 
                      value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Descrição na Fatura</label>
                    <input 
                      type="text" 
                      value={descricao} onChange={e => setDescricao(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Método Sugerido</label>
                    <select 
                      value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="CARTAO">Cartão de Crédito</option>
                    </select>
                  </div>
                </div>

                {/* RESUMO LATERAL */}
                <div className="w-full md:w-80 bg-gray-50 rounded-2xl border border-gray-200 p-6 flex flex-col h-max">
                  <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Resumo da Venda</h3>
                  
                  <div className="space-y-3 flex-1 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">CLIENTE</p>
                      <p className="text-sm font-bold text-gray-900">{clienteSelecionado?.nomeFantasia}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">PLANO</p>
                      <p className="text-sm font-bold text-blue-600">{planoSelecionado?.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">VENCIMENTO</p>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> 
                        {dataVencimento ? new Date(dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <p className="text-xs text-gray-500 font-medium mb-1">TOTAL A COBRAR</p>
                    <p className="text-3xl font-black text-gray-900">{formatarMoeda(parseFloat(valor || '0'))}</p>
                  </div>

                  <button 
                    onClick={handleGerarCobranca}
                    disabled={gerando || !valor || !dataVencimento}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {gerando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle2 className="w-5 h-5" />}
                    {gerando ? 'Processando...' : 'GERAR COBRANÇA'}
                  </button>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100 flex justify-start">
                <button onClick={() => setStep(2)} className="text-gray-600 font-bold hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCESSO */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Cobrança Gerada!</h2>
              <p className="text-gray-500 mb-8 max-w-md">
                A fatura no valor de <strong>{formatarMoeda(parseFloat(valor))}</strong> foi gerada com sucesso para <strong>{clienteSelecionado?.nomeFantasia}</strong>. O sistema já registrou o vínculo.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => router.push('/master/financeiro')}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  Ver Faturas
                </button>
                <button 
                  onClick={() => {
                    setStep(1);
                    setClienteSelecionado(null);
                    setPlanoSelecionado(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
                >
                  Nova Venda
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
