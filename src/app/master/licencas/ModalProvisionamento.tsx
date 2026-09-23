'use client';
import React, { useState, useEffect } from 'react';
import { LicencaMaster, PlanoSaaS } from '@/lib/saas/tenantManager';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { 
  X, Server, Building2, UserCircle, Globe, ShieldCheck, 
  Mail, Database, Loader2, ArrowRight, Phone, MapPin, 
  CheckCircle2, KeyRound, Palette, Link as LinkIcon, RefreshCw, Copy, Check
} from 'lucide-react';

interface ModalProvisionamentoProps {
  onClose: () => void;
  onSucesso: (novaLicenca: LicencaMaster) => void;
}

export default function ModalProvisionamento({ onClose, onSucesso }: ModalProvisionamentoProps) {
  const [loading, setLoading] = useState(false);
  const [progressoTexto, setProgressoTexto] = useState('');
  const [erro, setErro] = useState('');
  const [sucessoData, setSucessoData] = useState<{username: string, password: string, licencaFull: LicencaMaster} | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nomeFantasia: '',
    razaoSocial: '',
    documento: '',
    telefone: '',
    whatsapp: '',
    emailEmpresa: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    dominio: '',
    plano: 'starter',
    emailAdmin: '', // E-mail de recuperação
    usernameAdmin: '', // Login isolado
    senhaAdmin: '', // Senha provisória
    temaClaro: true,
    modulos: {
      'Dashboard': true,
      'Lancamentos': true,
      'Cartoes': true,
      'Contas Bancarias': true,
      'Relatorios': true,
      'DRE': true,
      'Conciliacao': true,
      'Centro de Custos': true,
      'Metas': true,
      'Inteligencia Artificial (CFO)': true,
      'White Label': true,
      'Cadastros': true
    }
  });

  const dominiosPermitidos = ['financeiro.vercel.app', 'app.financeiro.com', 'localhost:3000'];
  // Obtém o domínio host de forma dinâmica
  const [hostDomain, setHostDomain] = useState('financeiro.vercel.app');

  const [planosDb, setPlanosDb] = useState<PlanoSaaS[]>([]);
  
  useEffect(() => {
    async function carregarPlanos() {
      try {
        const snap = await getDocs(collection(getDb(), 'admin_master_planos'));
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PlanoSaaS[];
        setPlanosDb(lista.filter(p => p.ativo));
        if (lista.length > 0 && formData.plano === 'starter') {
          setFormData(prev => ({ ...prev, plano: lista[0].id }));
        }
      } catch (err) {
        console.error('Erro ao buscar planos', err);
      }
    }
    carregarPlanos();
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost')) setHostDomain(host);
      else setHostDomain(host); // Usa o host real da Vercel em prod
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-gerar Slug baseado no Nome Fantasia se estiver alterando o Nome Fantasia e o domínio estiver vazio ou tocado
    if (name === 'nomeFantasia') {
      const gerado = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // remove especiais
        .trim()
        .replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, dominio: gerado }));
    }
    
    // Normalizar Username em tempo real
    if (name === 'usernameAdmin') {
      const normalizedUser = value
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .trim();
      setFormData(prev => ({ ...prev, usernameAdmin: normalizedUser }));
    }
  };

  const gerarSenhaAleatoria = () => {
    const s = Math.floor(10000000 + Math.random() * 90000000).toString();
    setFormData(prev => ({ ...prev, senhaAdmin: s }));
  };

  const copiarTexto = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  };

  const validarCnpjCpf = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 11 || clean.length === 14;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    
    if (!formData.nomeFantasia || !formData.documento || !formData.dominio || !formData.emailAdmin || !formData.usernameAdmin || !formData.senhaAdmin) {
      setErro('Preencha os campos obrigatórios (*).');
      return;
    }

    if (!validarCnpjCpf(formData.documento)) {
      setErro('CNPJ / CPF com formato inválido. Preencha apenas números corretamente.');
      return;
    }

    if (formData.senhaAdmin.length < 6) {
      setErro('A Senha Provisória deve ter no mínimo 6 caracteres.');
      return;
    }

    // Nomes reservados
    const reservedUsers = ['master', 'root', 'system', 'admin', 'superadmin'];
    if (reservedUsers.includes(formData.usernameAdmin)) {
      setErro('Este Usuário de Login (username) é reservado pelo sistema. Escolha outro.');
      return;
    }

    if (formData.usernameAdmin === formData.emailAdmin) {
      setErro('O Usuário de Login não pode ser igual ao E-mail. Crie um identificador curto (ex: joao).');
      return;
    }

    try {
      setLoading(true);
      
      setProgressoTexto('Validando disponibilidade (Slug e Login)...');

      const idStr = formData.dominio.toLowerCase().trim();
      
      const { setDoc, doc, getDoc } = await import('firebase/firestore');
      const { getDb } = await import('@/lib/firebase');
      const db = getDb();
      
      // Validar se Tenant já existe no banco master
      const checkDoc = await getDoc(doc(db, 'admin_master_licencas', idStr));
      if (checkDoc.exists()) {
        throw new Error('O Link (Domínio/Slug) já está em uso por outra empresa. Altere o domínio personalizado.');
      }

      setProgressoTexto('Provisionando autenticação (Auth)...');
      
      const res = await fetch('/api/master/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.usernameAdmin,
          nome: formData.nomeFantasia,
          emailDeComunicacao: formData.emailAdmin,
          password: formData.senhaAdmin,
          tenantId: idStr
        })
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error('Erro Auth: ' + (errData.error || 'Erro desconhecido.'));
      }
      
      const apiData = await res.json();
      
      setProgressoTexto('Criando estrutura do banco (Firestore)...');

      // 3. Salvar os dados do usuário e Tenant
      try {
        const uid = apiData.uid;

        const profileData = {
          uid,
          tenantId: idStr,
          role: 'admin',
          status: 'aprovado',
          nome: formData.nomeFantasia,
          email: formData.emailAdmin, // email de recuperação
          username: formData.usernameAdmin, // login real
          requirePasswordChange: true, // Forçar troca
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid), profileData);
        await setDoc(doc(db, `tenants/${idStr}/users`, uid), profileData); // Injecao isolada
        
        setProgressoTexto('Finalizando configurações da licença...');

        // Criar licença master global
        
        const planoEscolhido = planosDb.find(p => p.id === formData.plano);
        const isGratuito = !planoEscolhido || planoEscolhido.preco === 0;
        let mesesValidade = 1;
        if (planoEscolhido) {
           if (planoEscolhido.periodicidade === 'anual') mesesValidade = 12;
           if (planoEscolhido.periodicidade === 'semestral') mesesValidade = 6;
           if (planoEscolhido.periodicidade === 'trimestral') mesesValidade = 3;
        }
        
        const vencimento = new Date();
        if (isGratuito) {
          vencimento.setFullYear(vencimento.getFullYear() + 100);
        } else {
          vencimento.setMonth(vencimento.getMonth() + mesesValidade);
        }

        // Criar licença master global
        const novaLicencaFull: LicencaMaster = {
          id: idStr,
          dominio: idStr,
          nomeFantasia: formData.nomeFantasia,
          razaoSocial: formData.razaoSocial || formData.nomeFantasia,
          documento: formData.documento,
          telefone: formData.telefone,
          whatsapp: formData.whatsapp,
          emailEmpresa: formData.emailEmpresa,
          cep: formData.cep,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
          plano: formData.plano,
          status: isGratuito ? 'ativa' : 'pendente',
          dataCriacao: new Date(),
          dataVencimento: vencimento,
          usernameAdmin: formData.usernameAdmin,
          senhaProvisoria: formData.senhaAdmin,
          modulosLiberados: Object.keys(formData.modulos).filter(k => (formData.modulos as any)[k]),
          configuracoes: {
            corPrincipal: '#1E3A8A',
            temaClaro: formData.temaClaro
          }
        };
        await setDoc(doc(db, 'admin_master_licencas', idStr), novaLicencaFull);

        if (!isGratuito) {
          const valorAssinatura = planoEscolhido?.preco || 0;
          const faturaId = 'fat_' + Date.now();
          await setDoc(doc(db, 'admin_master_faturas', faturaId), {
             tenantId: idStr,
             clienteNome: formData.nomeFantasia,
             dominio: idStr,
             valor: valorAssinatura,
             dataVencimento: new Date().toISOString().split('T')[0],
             status: 'pendente',
             descricao: 'Cobrança Inicial - Plano ' + (planoEscolhido?.nome || 'Personalizado'),
             mesesLiberacao: mesesValidade,
             planoPeriodicidade: planoEscolhido?.periodicidade || 'mensal',
             dataCriacao: new Date().toISOString()
          });
        }


        // LOG AUDITORIA (FASE 2)
        const logRef = doc(collection(db, 'saas_audit_logs'));
        await setDoc(logRef, {
           acao: 'PROVISIONAMENTO_LICENCA',
           entidade: 'licenca',
           entidadeId: idStr,
           descricao: `Nova licença provisionada: ${formData.nomeFantasia} (Plano: ${planoEscolhido?.nome || formData.plano})`,
           autor: 'Sistema Master',
           dataHora: new Date().toISOString()
        });


        setLoading(false);
        setSucessoData({
          username: formData.usernameAdmin,
          password: formData.senhaAdmin,
          licencaFull: novaLicencaFull
        });

      } catch (e) {
        console.error("DB Error", e);
        throw new Error("Falha ao salvar no banco de dados. Tente novamente.");
      }

    } catch (error: any) {
      setErro(error.message || 'Erro crítico ao provisionar.');
      setLoading(false);
    }
  };

  if (sucessoData) {
    const linkTenant = hostDomain.includes('localhost') ? `http://localhost:3000/?tenant=${sucessoData.licencaFull.dominio}` : `https://${hostDomain.replace('www.', '')}/?tenant=${sucessoData.licencaFull.dominio}`;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#cc092f]/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white rounded-none shadow-2xl p-8 lg:p-10 border border-slate-100 my-8 animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#cc092f] rounded-none-[24px]"></div>
          
          <div className="w-20 h-20 bg-blue-50 border-4 border-white shadow-sm rounded-none flex items-center justify-center text-[#cc092f] mx-auto mb-6 -mt-12 relative z-10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">LICENÇA CRIADA COM SUCESSO</h2>
            <p className="text-slate-500 font-medium">
              {sucessoData.licencaFull.status === 'ativa'
                ? 'Licença Gratuita ativada! O cliente já pode acessar o sistema.'
                : 'Licença criada e aguardando primeiro pagamento para liberação.'}
            </p>
            {sucessoData.licencaFull.status !== 'ativa' && (
              <div className="mt-2 inline-flex items-center gap-2 bg-[#cc092f]mber-50 border border-amber-200 text-amber-700 text-xs font-bold px-4 py-2 rounded-none">
                <span>⚠</span> Cobrança gerada – acesso liberado após pagamento
              </div>
            )}
            {sucessoData.licencaFull.status === 'ativa' && (
              <div className="mt-2 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-4 py-2 rounded-none">
                <span>✓</span> Plano Gratuito – Acesso imediato
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 border border-gray-300 rounded-none overflow-hidden mb-8">
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200">
              <div className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                <p className="font-semibold text-slate-900 truncate">{sucessoData.licencaFull.nomeFantasia}</p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Plano Base</p>
                <p className="font-semibold text-blue-700 uppercase">{sucessoData.licencaFull.plano}</p>
              </div>
              
              <div className="p-4 col-span-2 bg-white">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link do Cliente</p>
                  <button onClick={() => copiarTexto(linkTenant, 'link')} className="text-[#cc092f] hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                    {copiado === 'link' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copiado === 'link' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
                <a href={linkTenant} target="_blank" className="font-medium text-[#cc092f] hover:underline break-all">{linkTenant}</a>
              </div>

              <div className="p-4 bg-white">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário de Login</p>
                  <button onClick={() => copiarTexto(sucessoData.username, 'user')} className="text-[#cc092f] hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                    {copiado === 'user' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copiado === 'user' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded inline-block">{sucessoData.username}</p>
              </div>

              <div className="p-4 bg-white">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Senha Provisória</p>
                  <button onClick={() => copiarTexto(sucessoData.password, 'pass')} className="text-[#cc092f] hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                    {copiado === 'pass' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copiado === 'pass' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="font-bold font-mono text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded inline-block">{sucessoData.password}</p>
              </div>
            </div>
            <div className="bg-blue-50 p-3 border-t border-blue-100 flex items-center justify-center gap-2 text-blue-700 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" /> O sistema exigirá a troca desta senha no primeiro acesso.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                const creds = `*DADOS DE ACESSO*\n\nLink: ${linkTenant}\nUsuário: ${sucessoData.username}\nSenha Provisória: ${sucessoData.password}\n\nPor segurança, altere sua senha no primeiro acesso.`;
                copiarTexto(creds, 'full');
              }}
              className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-none transition-all shadow-sm text-sm flex items-center justify-center gap-2"
            >
              {copiado === 'full' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiado === 'full' ? 'Copiado!' : 'Copiar Acesso Completo'}
            </button>
            <button 
              onClick={() => onSucesso(sucessoData.licencaFull)}
              className="py-3.5 bg-[#cc092f] hover:bg-[#a00725] text-white font-bold rounded-none transition-all shadow-md text-sm"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#cc092f]/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto custom-scrollbar py-12">
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl overflow-hidden flex flex-col border border-gray-300 animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header Premium Autocred */}
        <div className="relative overflow-hidden bg-[#cc092f] p-8 flex justify-between items-start text-white">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
             <Server className="w-64 h-64" />
          </div>
          <div className="relative z-10 flex gap-5 items-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-none flex items-center justify-center border border-white/20 shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">PROVISIONAR NOVA LICENÇA</h2>
              <p className="text-blue-100 mt-1 font-medium text-sm max-w-md">
                Crie um novo ambiente SaaS totalmente independente, seguro e isolado para o seu cliente.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-none bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="form-provision" onSubmit={handleSubmit} className="p-8 space-y-10 bg-slate-50/50 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-none flex items-center gap-3 shadow-sm">
              <ShieldCheck className="w-6 h-6 flex-shrink-0 text-red-500" />
              <p className="text-sm font-semibold">{erro}</p>
            </div>
          )}

          {/* 1. DADOS DA EMPRESA */}
          <section className="bg-white p-6 rounded-none border border-gray-300 shadow-sm">
            <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-blue-50 text-[#cc092f] flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
              1. DADOS DA EMPRESA
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Nome Fantasia <span className="text-red-500">*</span></label>
                <input 
                  type="text" name="nomeFantasia" required value={formData.nomeFantasia} onChange={handleChange}
                  className="w-full bg-slate-50 border border-gray-300 text-slate-900 placeholder-slate-400 rounded-none px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Ex: Minha Empresa"
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">CNPJ / CPF <span className="text-red-500">*</span></label>
                <input 
                  type="text" name="documento" required value={formData.documento} onChange={handleChange}
                  className="w-full bg-slate-50 border border-gray-300 text-slate-900 placeholder-slate-400 rounded-none px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Apenas números (Ex: 00000000000100)"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Razão Social (Opcional)</label>
                <input 
                  type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange}
                  className="w-full bg-slate-50 border border-gray-300 text-slate-900 placeholder-slate-400 rounded-none px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Razão Social LTDA"
                />
              </div>

              {/* Informações de Contato Extras */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange}
                    className="w-full bg-slate-50 border border-gray-300 text-slate-900 placeholder-slate-400 rounded-none pl-10 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">E-mail Comercial da Empresa</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" name="emailEmpresa" value={formData.emailEmpresa} onChange={handleChange}
                    className="w-full bg-slate-50 border border-gray-300 text-slate-900 placeholder-slate-400 rounded-none pl-10 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. ACESSO DO CLIENTE */}
          <section className="bg-white p-6 rounded-none border-2 border-blue-100 shadow-[0_4px_20px_rgb(37,99,235,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-none-full -mr-10 -mt-10 opacity-50"></div>
            <h3 className="text-blue-900 font-black text-lg mb-6 flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-none bg-[#cc092f] text-white flex items-center justify-center shadow-md"><KeyRound className="w-4 h-4" /></div>
              2. DADOS DE ACESSO (MASTER)
            </h3>
            
            <div className="bg-blue-50/50 rounded-none p-5 border border-blue-100 mb-6 relative z-10">
              <p className="text-sm text-blue-800 font-semibold mb-2">Atenção: O Usuário de Login é independente do E-mail.</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                <li>O login é feito exclusivamente através do <strong>Usuário</strong> e <strong>Senha</strong>.</li>
                <li>O E-mail serve apenas para envio de avisos e recuperação de senha.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 relative z-10">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Usuário de Login <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input 
                    type="text" name="usernameAdmin" required value={formData.usernameAdmin} onChange={handleChange}
                    className="w-full bg-white border-2 border-gray-300 text-slate-900 placeholder-slate-400 rounded-none pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all font-semibold"
                    placeholder="ex: joao (Sem espaços)"
                    pattern="^[a-zA-Z0-9_-]+$"
                    title="Apenas letras, números, hífen ou underline. Sem espaços."
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500 ml-1 mt-1">Identificador único para entrar no sistema.</p>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-bold text-slate-700 ml-1">E-mail para Recuperação <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input 
                    type="email" name="emailAdmin" required value={formData.emailAdmin} onChange={handleChange}
                    className="w-full bg-white border-2 border-gray-300 text-slate-900 placeholder-slate-400 rounded-none pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    placeholder="joao@gmail.com"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500 ml-1 mt-1">Utilizado para resgate de senha.</p>
              </div>

              <div className="space-y-1.5 md:col-span-2 bg-slate-50 p-5 rounded-none border border-gray-300 mt-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Senha Provisória <span className="text-red-500">*</span></label>
                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#cc092f]" />
                    <input 
                      type="text" name="senhaAdmin" required value={formData.senhaAdmin} onChange={handleChange}
                      className="w-full bg-white border-2 border-blue-200 text-blue-700 font-mono font-bold placeholder-slate-400 rounded-none pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                      placeholder="● ● ● ● ● ● ● ●"
                      minLength={6}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={gerarSenhaAleatoria}
                    className="whitespace-nowrap px-6 py-3.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-none transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Gerar Senha
                  </button>
                </div>
                <p className="text-xs font-semibold text-amber-600 ml-1 mt-3 flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-none bg-[#cc092f]mber-100 text-amber-600 flex items-center justify-center text-[10px]">!</div>
                  O cliente deverá obrigatoriamente criar uma nova senha pessoal no 1º acesso.
                </p>
              </div>
            </div>
          </section>

          {/* 3. DOMÍNIO / LINK DA LICENÇA */}
          <section className="bg-white p-6 rounded-none border border-gray-300 shadow-sm">
            <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-indigo-50 text-[#cc092f] flex items-center justify-center"><LinkIcon className="w-4 h-4" /></div>
              3. LINK EXCLUSIVO DO CLIENTE
            </h3>
            
            <div className="px-10 py-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Slug do Ambiente (Auto-gerado) <span className="text-red-500">*</span></label>
                <div className="flex rounded-none overflow-hidden border-2 border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white shadow-sm">
                  <div className="pl-4 pr-3 flex items-center justify-center text-slate-400 bg-slate-50 border-r border-gray-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" name="dominio" required value={formData.dominio} onChange={handleChange}
                    className="flex-1 bg-transparent text-slate-900 font-semibold placeholder-slate-400 px-4 py-3.5 focus:outline-none"
                    placeholder="minha-empresa"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500 ml-1 mt-1">Este identificador formará a URL final e o nome do Tenant.</p>
              </div>

              {formData.dominio && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-none">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Prévia do Link em Produção</p>
                  <p className="text-indigo-700 font-semibold break-all">
                    https://<span className="font-black text-indigo-900">{formData.dominio}</span>.{hostDomain.replace('www.', '')}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 4. PLANO E ASSINATURA */}
          <section className="bg-white p-6 rounded-none border border-gray-300 shadow-sm">
            <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-emerald-50 text-[#cc092f] flex items-center justify-center"><Server className="w-4 h-4" /></div>
              4. PLANO E ASSINATURA
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Plano Base <span className="text-red-500">*</span></label>
                <select 
                  name="plano" value={formData.plano} onChange={handleChange}
                  className="w-full bg-white border-2 border-gray-300 text-slate-900 font-semibold rounded-none px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer shadow-sm appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  {planosDb.length === 0 ? (
                    <option value="starter">Carregando planos...</option>
                  ) : (
                    planosDb.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco.toFixed(2)}/{p.periodicidade}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* 5. CONFIGURACOES INICIAIS */}
          <section className="bg-white p-6 rounded-none border border-gray-300 shadow-sm">
            <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-purple-50 text-purple-600 flex items-center justify-center"><Palette className="w-4 h-4" /></div>
              5. CONFIGURAÇÕES INICIAIS
            </h3>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-300 rounded-none">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Tema do Painel (Cores Base)</h4>
                  <p className="text-xs text-slate-500 mt-1">Definido como Azul Autocred. O cliente pode alterar em Configurações.</p>
                </div>
                <div className="w-8 h-8 rounded-none bg-[#1E3A8A] border-2 border-white shadow-md"></div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-300 rounded-none">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Modo Claro (Recomendado)</h4>
                  <p className="text-xs text-slate-500 mt-1">Forçar tema claro no primeiro acesso.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="temaClaro" checked={formData.temaClaro} onChange={e => setFormData(p => ({...p, temaClaro: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#cc092f]"></div>
                </label>
              </div>
            </div>
          </section>

          {/* 6. MÓDULOS E PERMISSÕES */}
          <section className="bg-white p-6 rounded-none border border-gray-300 shadow-sm">
            <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-orange-50 text-orange-600 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
              6. MÓDULOS LIBERADOS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(formData.modulos).map(mod => (
                <label key={mod} className="flex items-center gap-2 p-3 bg-slate-50 border border-gray-300 rounded-none cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={(formData.modulos as any)[mod]} 
                    onChange={e => setFormData(p => ({...p, modulos: {...p.modulos, [mod]: e.target.checked}}))} 
                    className="w-4 h-4 text-[#cc092f] rounded border-gray-300 focus:ring-[#cc092f]"
                  />
                  <span className="text-sm font-semibold text-slate-700">{mod}</span>
                </label>
              ))}
            </div>
          </section>

        </form>

        {/* Footer */}
        <div className="border-t border-gray-300 p-6 flex flex-col sm:flex-row items-center justify-between bg-white gap-4 relative z-10 rounded-none-[24px]">
          <div className="flex-1 w-full">
            {loading && (
              <div className="flex items-center gap-3 text-[#cc092f] font-semibold text-sm animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                {progressoTexto}
              </div>
            )}
            {!loading && (
              <p className="text-xs font-semibold text-slate-400">
                A criação do banco isolado e infraestrutura levará poucos instantes.
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-none border border-gray-300 text-slate-700 hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="form-provision"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-none bg-[#cc092f] hover:bg-[#a00725] text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgb(37,99,235,0.23)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'PROCESSANDO...' : 'CRIAR LICENÇA'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
