'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare, Save } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export default function MasterWhatsappConfig() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [numeroMaster, setNumeroMaster] = useState('');
  const [horario, setHorario] = useState('23:00');
  const [instanceName, setInstanceName] = useState('autocred');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Carregar configurações do Firebase
    const carregarConfig = async () => {
      try {
        const snap = await getDoc(doc(getDb(), 'configuracoes', 'geral'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsappApiUrl) setApiUrl(data.whatsappApiUrl);
          if (data.whatsappApiToken) setApiKey(data.whatsappApiToken);
          if (data.whatsappNumeroMaster) setNumeroMaster(data.whatsappNumeroMaster);
          if (data.whatsappHorario) setHorario(data.whatsappHorario);

          if (data.whatsappApiUrl && data.whatsappApiToken) {
            fetch(`${data.whatsappApiUrl}/instance/connectionState/autocred`, { headers: { apikey: data.whatsappApiToken } })
              .then(r => r.json())
              .then(d => { if (d?.instance?.state === 'open' || d?.state === 'open') setStatus('connected'); })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do whatsapp', err);
      }
    };
    carregarConfig();
  }, []);

  const salvarConfiguracoes = async () => {
    setSaving(true);
    try {
      await setDoc(doc(getDb(), 'configuracoes', 'geral'), {
        whatsappApiUrl: apiUrl,
        whatsappApiToken: apiKey,
        whatsappNumeroMaster: numeroMaster,
        whatsappHorario: horario,
      }, { merge: true });
      alert('Configurações salvas com sucesso no banco de dados!');
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Horário do Fechamento Diário</label>
            <select 
              value={horario}
              onChange={e => setHorario(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)' }}
            >
              <option value="18:00">18:00</option>
              <option value="19:00">19:00</option>
              <option value="20:00">20:00</option>
              <option value="21:00">21:00</option>
              <option value="22:00">22:00</option>
              <option value="23:00">23:00</option>
              <option value="08:00">08:00 (dia seguinte)</option>
            </select>
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
              <CheckCircle2 size={48} />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>WhatsApp Conectado!</h3>
              <p style={{ fontSize: 13, opacity: 0.8 }}>O sistema já pode fazer disparos a partir deste número.</p>
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
