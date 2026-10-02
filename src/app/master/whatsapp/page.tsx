'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare, Save } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export default function MasterWhatsappConfig() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [numeroMaster, setNumeroMaster] = useState('');
  const [horarioFechamento, setHorarioFechamento] = useState('17:00');
  const [horarioLembretes, setHorarioLembretes] = useState('08:00');
  const [horarioMetas1, setHorarioMetas1] = useState('12:00');
  const [horarioMetas2, setHorarioMetas2] = useState('18:00');
  const [metasAtivo, setMetasAtivo] = useState(true);
  const [diaFechamentoMensal, setDiaFechamentoMensal] = useState<number>(1);
  const [horarioFechamentoMensal, setHorarioFechamentoMensal] = useState('09:00');
  const [fechamentoMensalAtivo, setFechamentoMensalAtivo] = useState(true);
  const [tenantId, setTenantId] = useState('autocred-promotora-de-credito');
  const [instanceName, setInstanceName] = useState('autocred');
  const [listaTenants, setListaTenants] = useState<{ id: string; nome: string }[]>([
    { id: 'master', nome: '👤 Conta Clovis Master (Pessoal)' },
    { id: 'autocred-promotora-de-credito', nome: '🏢 AUTOCRED Promotora de Crédito' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const carregarConfigTenant = async (tId: string) => {
    try {
      let data: any = null;
      if (tId === 'master') {
        const snap = await getDoc(doc(getDb(), 'configuracoes', 'geral'));
        const snapConfig = await getDoc(doc(getDb(), 'config', 'geral'));
        data = { ...(snap.exists() ? snap.data() : {}), ...(snapConfig.exists() ? snapConfig.data() : {}) };
      } else {
        const snap = await getDoc(doc(getDb(), `tenants/${tId}/config`, 'geral'));
        data = snap.exists() ? snap.data() : null;
      }
      if (data) {
        setNumeroMaster(data.whatsappNumeros || data.whatsappNumeroMaster || '');
        if (data.whatsappHorarioFechamento || data.whatsappHorario) {
          setHorarioFechamento(data.whatsappHorarioFechamento || data.whatsappHorario);
        }
        if (data.whatsappHorarioLembretes) {
          setHorarioLembretes(data.whatsappHorarioLembretes);
        }
        if (data.whatsappHorarioMetas1) {
          setHorarioMetas1(data.whatsappHorarioMetas1);
        }
        if (data.whatsappHorarioMetas2) {
          setHorarioMetas2(data.whatsappHorarioMetas2);
        }
        if (data.whatsappMetasAtivo !== undefined) {
          setMetasAtivo(data.whatsappMetasAtivo);
        }
        if (data.whatsappDiaFechamentoMensal !== undefined) {
          setDiaFechamentoMensal(data.whatsappDiaFechamentoMensal);
        }
        if (data.whatsappHorarioFechamentoMensal) {
          setHorarioFechamentoMensal(data.whatsappHorarioFechamentoMensal);
        }
        if (data.whatsappFechamentoMensalAtivo !== undefined) {
          setFechamentoMensalAtivo(data.whatsappFechamentoMensalAtivo);
        }
      } else {
        setNumeroMaster('');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do tenant', err);
    }
  };

  useEffect(() => {
    // Carregar configurações globais e lista de licenças
    const carregarConfig = async () => {
      try {
        const snap = await getDoc(doc(getDb(), 'configuracoes', 'geral'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsappApiUrl) setApiUrl(data.whatsappApiUrl);
          if (data.whatsappApiToken) setApiKey(data.whatsappApiToken);

          if (data.whatsappApiUrl && data.whatsappApiToken) {
            fetch(`${data.whatsappApiUrl}/instance/connectionState/autocred`, { headers: { apikey: data.whatsappApiToken } })
              .then(r => r.json())
              .then(d => { if (d?.instance?.state === 'open' || d?.state === 'open') setStatus('connected'); })
              .catch(() => {});
          }
        }

        // Buscar todas as licenças
        const snapLicencas = await getDocs(collection(getDb(), 'admin_master_licencas'));
        const tenants: { id: string; nome: string }[] = [
          { id: 'master', nome: '👤 Conta Clovis Master (Pessoal)' }
        ];
        snapLicencas.forEach(d => {
          const lic = d.data();
          tenants.push({
            id: d.id,
            nome: lic.nomeFantasia ? `🏢 ${lic.nomeFantasia}` : (lic.razaoSocial ? `🏢 ${lic.razaoSocial}` : `🏢 ${d.id}`)
          });
        });
        setListaTenants(tenants);

        // Carrega os dados do tenant selecionado inicialmente (autocred)
        await carregarConfigTenant('autocred-promotora-de-credito');
      } catch (err) {
        console.error('Erro ao carregar configurações do whatsapp', err);
      }
    };
    carregarConfig();
  }, []);

  const salvarConfiguracoes = async () => {
    setSaving(true);
    try {
      // 1. Salva credenciais globais da API
      await setDoc(doc(getDb(), 'configuracoes', 'geral'), {
        whatsappApiUrl: apiUrl,
        whatsappApiToken: apiKey,
      }, { merge: true });

      // 2. Salva horários e número para a licença selecionada
      const payloadTenant = {
        whatsappAtivo: true,
        whatsappNumeros: numeroMaster,
        whatsappNumeroMaster: numeroMaster,
        whatsappHorarioFechamento: horarioFechamento,
        whatsappHorarioLembretes: horarioLembretes,
        whatsappHorarioMetas1: horarioMetas1,
        whatsappHorarioMetas2: horarioMetas2,
        whatsappMetasAtivo: metasAtivo,
        whatsappDiaFechamentoMensal: diaFechamentoMensal,
        whatsappHorarioFechamentoMensal: horarioFechamentoMensal,
        whatsappFechamentoMensalAtivo: fechamentoMensalAtivo,
        whatsappHorario: horarioFechamento,
        ultimoEnvioFechamento: '', // Reseta para liberar disparo no novo horário imediatamente
        ultimoEnvioLembretes: '',
        ultimoEnvioMetas1: '',
        ultimoEnvioMetas2: '',
        ultimoEnvioFechamentoMensal: ''
      };

      if (tenantId === 'master') {
        await setDoc(doc(getDb(), 'configuracoes', 'geral'), payloadTenant, { merge: true });
        await setDoc(doc(getDb(), 'config', 'geral'), payloadTenant, { merge: true });
      } else {
        await setDoc(doc(getDb(), `tenants/${tenantId}/config`, 'geral'), payloadTenant, { merge: true });
      }

      const nomeTenant = listaTenants.find(t => t.id === tenantId)?.nome || tenantId;
      alert(`✅ Configurações salvas com sucesso para:\n${nomeTenant}\n\n🔔 Lembretes: ${horarioLembretes}\n🕛 Metas 1: ${horarioMetas1}\n📊 Fechamento: ${horarioFechamento}\n🕕 Metas 2: ${horarioMetas2}\n📱 Número: ${numeroMaster || '(vazio)'}\n\nO robô disparará automaticamente nestes horários!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const gerarQrCode = async () => {
    setLoading(true);
    setQrCode(null);
    setStatus('idle');
    setErrorMsg('');

    try {
      let res = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
      });

      let data = await res.json();

      if (res.status !== 200 && res.status !== 201) {
        res = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { apikey: apiKey }
        });
        data = await res.json();
      }

      if (data?.base64) {
        setQrCode(data.base64);
        checkStatusLoop();
      } else if (data?.instance?.state === 'open' || data?.state === 'open') {
        setStatus('connected');
      } else {
        throw new Error(data.message || 'Não foi possível gerar o QR Code.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Erro de conexão. Verifique a URL e a Senha.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatusLoop = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          headers: { apikey: apiKey }
        });
        const data = await res.json();
        if (data?.instance?.state === 'open') {
          setStatus('connected');
          setQrCode(null);
          clearInterval(interval);
        }
      } catch (e) {
        // ignore
      }
    }, 3000);
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <MessageSquare color="#10b981" /> Conexão WhatsApp
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        Configure a API e conecte o número de WhatsApp que fará os disparos automáticos.
      </p>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>1. Configuração da API & Destino</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>URL da API (Railway)</label>
            <input 
              type="text" 
              value={apiUrl}
              placeholder="https://..."
              onChange={e => setApiUrl(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Global API Key (Senha)</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              🔔 Horário do Lembrete (Contas a Pagar/Receber)
            </label>
            <input 
              type="time" 
              value={horarioLembretes}
              onChange={e => setHorarioLembretes(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Envia resumo matinal das contas a pagar e a receber do dia.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              📊 Horário do Fechamento Diário
            </label>
            <input 
              type="time" 
              value={horarioFechamento}
              onChange={e => setHorarioFechamento(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Envia extrato consolidado de receitas, despesas e saldo do dia.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              🕛 1º Envio de Metas (Meio-dia)
            </label>
            <input 
              type="time" 
              value={horarioMetas1}
              onChange={e => setHorarioMetas1(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Progresso das metas na metade do expediente.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              🕕 2º Envio de Metas (Fechamento)
            </label>
            <input 
              type="time" 
              value={horarioMetas2}
              onChange={e => setHorarioMetas2(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Balanço final do dia e meta para amanhã.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              📅 Dia Fechamento Mensal
            </label>
            <select
              value={diaFechamentoMensal}
              onChange={e => setDiaFechamentoMensal(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            >
              <option value={1}>Todo dia 1º (Padrão)</option>
              <option value={2}>Todo dia 2</option>
              <option value={5}>Todo dia 5</option>
              <option value={10}>Todo dia 10</option>
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Dia do mês que fecha e gera o PDF.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              📄 Horário Fechamento Mensal (PDF)
            </label>
            <input 
              type="time" 
              value={horarioFechamentoMensal}
              onChange={e => setHorarioFechamentoMensal(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Envio do PDF Executivo no WhatsApp.
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              🏢 Licença para Configuração & Disparo
            </label>
            <select
              value={tenantId || 'autocred-promotora-de-credito'}
              onChange={async e => {
                const newTid = e.target.value;
                setTenantId(newTid);
                await carregarConfigTenant(newTid);
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)', fontSize: 14 }}
            >
              {listaTenants.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Ao selecionar uma licença, os horários e telefone cadastrados para ela serão carregados automaticamente.
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Número que receberá o Resumo Diário (Seu WhatsApp)</label>
            <input 
              type="text" 
              placeholder="5511999999999"
              value={numeroMaster}
              onChange={e => setNumeroMaster(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)' }}
            />
          </div>
        </div>

        <button 
          onClick={salvarConfiguracoes}
          disabled={saving}
          style={{
            background: 'var(--primary)', color: '#fff', padding: '10px 20px', borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, border: 'none', opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar Configurações no Sistema'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>2. Escanear Aparelho Remetente</h2>
        <div style={{ textAlign: 'center', padding: 24, border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
          {status === 'connected' ? (
            <div style={{ color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 13, opacity: 0.8 }}>O sistema já pode fazer disparos a partir deste número.</p>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={async () => {
                    const btn = document.getElementById('btn-test-fechamento');
                    if (btn) btn.innerText = 'Enviando...';
                    try {
                      const selTenant = tenantId || 'autocred-promotora-de-credito';
                      const selNome = selTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora';
                      const res = await fetch(`/api/cron/fechamento-diario?tenantId=${selTenant}&numero=${encodeURIComponent(numeroMaster)}&nome=${encodeURIComponent(selNome)}`);
                      const data = await res.json();
                      alert(data.success ? '✅ Fechamento enviado com sucesso no WhatsApp!' : ('Erro: ' + (data.error || data.message)));
                    } catch (e: any) {
                      alert('Erro ao disparar: ' + e.message);
                    } finally {
                      if (btn) btn.innerText = '📊 Disparar Resumo Diário';
                    }
                  }}
                  id="btn-test-fechamento"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  📊 Disparar Resumo Diário
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const btn = document.getElementById('btn-test-lembrete');
                    if (btn) btn.innerText = 'Enviando...';
                    try {
                      const selTenant = tenantId || 'autocred-promotora-de-credito';
                      const selNome = selTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora';
                      const res = await fetch(`/api/cron/lembretes?tenantId=${selTenant}&numero=${encodeURIComponent(numeroMaster)}&nome=${encodeURIComponent(selNome)}`);
                      const data = await res.json();
                      alert(data.success ? '✅ Notificação de Contas a Pagar e Receber enviada com sucesso no WhatsApp!' : ('Erro: ' + (data.error || data.message)));
                    } catch (e: any) {
                      alert('Erro ao disparar: ' + e.message);
                    } finally {
                      if (btn) btn.innerText = '🔔 Disparar Contas a Pagar/Receber';
                    }
                  }}
                  id="btn-test-lembrete"
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  🔔 Disparar Contas a Pagar/Receber
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const btn = document.getElementById('btn-test-metas');
                    if (btn) btn.innerText = 'Enviando...';
                    try {
                      const selTenant = tenantId || 'autocred-promotora-de-credito';
                      const selNome = selTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora';
                      const res = await fetch(`/api/cron/resumo-metas?tenantId=${selTenant}&numero=${encodeURIComponent(numeroMaster)}&nome=${encodeURIComponent(selNome)}&slot=12h`);
                      const data = await res.json();
                      alert(data.success ? '✅ Resumo de Metas enviado com sucesso no WhatsApp!' : ('Erro: ' + (data.error || data.message)));
                    } catch (e: any) {
                      alert('Erro ao disparar: ' + e.message);
                    } finally {
                      if (btn) btn.innerText = '🎯 Disparar Resumo de Metas';
                    }
                  }}
                  id="btn-test-metas"
                  style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  🎯 Disparar Resumo de Metas
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const btn = document.getElementById('btn-test-mensal');
                    if (btn) btn.innerText = 'Enviando...';
                    try {
                      const selTenant = tenantId || 'autocred-promotora-de-credito';
                      const selNome = selTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora';
                      const res = await fetch(`/api/cron/fechamento-mensal?tenantId=${selTenant}&numero=${encodeURIComponent(numeroMaster)}&nome=${encodeURIComponent(selNome)}`);
                      const data = await res.json();
                      alert(data.success ? '✅ Relatório e PDF Executivo de Fechamento Mensal enviados com sucesso no WhatsApp!' : ('Erro: ' + (data.error || data.message)));
                    } catch (e: any) {
                      alert('Erro ao disparar: ' + e.message);
                    } finally {
                      if (btn) btn.innerText = '📄 Disparar Fechamento Mensal (PDF)';
                    }
                  }}
                  id="btn-test-mensal"
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  📄 Disparar Fechamento Mensal (PDF)
                </button>
              </div>
            </div>
          ) : qrCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Escaneie o QR Code</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Abra o WhatsApp no celular que vai *enviar* as mensagens e aponte a câmera para cá.</p>
              <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
                <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 250, height: 250 }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Smartphone size={48} color="var(--text-muted)" />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                Certifique-se de salvar as configurações acima antes de conectar.
              </p>
              <button 
                onClick={gerarQrCode}
                disabled={loading || !apiUrl || !apiKey}
                style={{
                  background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: (loading || !apiUrl || !apiKey) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, border: 'none', opacity: (loading || !apiUrl || !apiKey) ? 0.7 : 1
                }}
              >
                {loading ? <RefreshCw className="spin" size={18} /> : <QrCode size={18} />}
                {loading ? 'Conectando ao Railway...' : 'Gerar QR Code'}
              </button>
              {status === 'error' && (
                <div style={{ color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                  <AlertTriangle size={14} /> {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
