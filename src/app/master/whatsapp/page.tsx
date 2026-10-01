'use client';

import React, { useState } from 'react';
import { QrCode, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';

export default function MasterWhatsappConfig() {
  const [apiUrl, setApiUrl] = useState('https://evolution-api-production-12c4.up.railway.app');
  const [apiKey, setApiKey] = useState('felipe25');
  const [instanceName, setInstanceName] = useState('autocred');
  
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const gerarQrCode = async () => {
    setLoading(true);
    setQrCode(null);
    setStatus('idle');
    setErrorMsg('');

    try {
      // 1. Tentar criar a instância (se já existir, vai dar erro 403 ou 409, então buscamos a conexão)
      let res = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
      });

      let data = await res.json();

      // Se a instância já existe
      if (res.status !== 200 && res.status !== 201) {
        // Tentar conectar instância existente
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
        Conecte o número de WhatsApp que fará os disparos automáticos de resumos diários e cobranças.
      </p>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Configuração da Evolution API</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>URL da API (Railway)</label>
            <input 
              type="text" 
              value={apiUrl}
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
        </div>

        <div style={{ textAlign: 'center', padding: 24, border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
          {status === 'connected' ? (
            <div style={{ color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={48} />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>WhatsApp Conectado!</h3>
              <p style={{ fontSize: 13, opacity: 0.8 }}>O sistema já pode fazer disparos.</p>
            </div>
          ) : qrCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Escaneie o QR Code</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Abra o WhatsApp no celular, vá em "Aparelhos conectados" e aponte a câmera para cá.</p>
              <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
                <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 250, height: 250 }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Smartphone size={48} color="var(--text-muted)" />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                Nenhum aparelho conectado no momento.
              </p>
              <button 
                onClick={gerarQrCode}
                disabled={loading}
                style={{
                  background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, border: 'none', opacity: loading ? 0.7 : 1
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
