'use client';

import React, { useState, useEffect } from 'react';
import { Transacao, ConfiguracaoApp } from '@/lib/types';
import { getConfiguracoes, salvarConfiguracoes, atualizarTransacao, getContas, getClientes, getTenantId } from '@/lib/storage';
import { gerarPixCopiaECola, gerarUrlQrCodePix, montarMensagemCobrancaPix, normalizarChavePix } from '@/lib/pix';
import { gerarFaturaPixPDF } from '@/lib/pix-pdf';
import { playSound } from '@/lib/audio';
import { X, QrCode, Copy, Check, MessageSquare, ArrowDownCircle, AlertCircle, Settings, CheckCircle2, ShieldCheck, Loader2, Send, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ModalCobrancaPixProps {
  transacao: Transacao;
  onClose: () => void;
  onBaixaSucesso: (id: string) => void;
}

export default function ModalCobrancaPix({ transacao, onClose, onBaixaSucesso }: ModalCobrancaPixProps) {
  const [cfg, setCfg] = useState<ConfiguracaoApp | null>(null);
  const [chavePix, setChavePix] = useState('');
  const [tipoChave, setTipoChave] = useState<'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'>('cnpj');
  const [nomeTitular, setNomeTitular] = useState('');
  const [cidadeTitular, setCidadeTitular] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');

  const [editandoDadosPix, setEditandoDadosPix] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);
  const [baixaConcluida, setBaixaConcluida] = useState(false);
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      const config = await getConfiguracoes();
      setCfg(config);
      setChavePix(config.pixChave || '');
      setTipoChave(config.pixTipoChave || 'cnpj');
      setNomeTitular(config.pixNomeTitular || config.nomeSistema || 'AUTOCRED PROMOTORA');
      setCidadeTitular(config.pixCidadeTitular || 'CHAPECO');

      // Se não tiver chave configurada, abre para edição
      if (!config.pixChave) {
        setEditandoDadosPix(true);
      }

      // Tentar pré-carregar telefone do cliente
      if (transacao.clienteId || transacao.clienteNome) {
        try {
          const clientes = await getClientes();
          const cli = clientes.find(c => (transacao.clienteId && c.id === transacao.clienteId) || (c.nome && transacao.clienteNome && c.nome.toLowerCase() === transacao.clienteNome.toLowerCase()));
          if (cli && (cli.telefone || (cli as any).celular || (cli as any).whatsapp)) {
            setTelefoneCliente(cli.telefone || (cli as any).celular || (cli as any).whatsapp);
          }
        } catch (e) {}
      }
    })();
  }, []);

  const valor = Number(transacao.valor) || 0;
  const copiaECola = chavePix ? gerarPixCopiaECola({
    chave: chavePix,
    tipoChave,
    nomeTitular,
    cidadeTitular,
    valor,
    txid: transacao.id ? transacao.id.substring(0, 20) : 'PAG' + Date.now().toString().slice(-8),
    descricao: transacao.descricao.substring(0, 25)
  }) : '';

  const qrCodeUrl = copiaECola ? gerarUrlQrCodePix(copiaECola, 220) : '';

  const handleCopiar = () => {
    if (!copiaECola) return;
    navigator.clipboard.writeText(copiaECola);
    setCopiado(true);
    playSound('sucesso');
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleSalvarDadosPix = async () => {
    if (!chavePix) {
      alert('Preencha a sua Chave PIX.');
      return;
    }
    setSalvandoConfig(true);
    try {
      const novaCfg: ConfiguracaoApp = {
        ...(cfg as ConfiguracaoApp),
        pixChave: chavePix,
        pixTipoChave: tipoChave,
        pixNomeTitular: nomeTitular,
        pixCidadeTitular: cidadeTitular
      };
      await salvarConfiguracoes(novaCfg);
      setCfg(novaCfg);
      setEditandoDadosPix(false);
      alert('✅ Dados PIX salvos com sucesso na sua licença!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvandoConfig(false);
    }
  };

  const handleBaixarFaturaPdf = async () => {
    if (!copiaECola) return;
    setGerandoPdf(true);
    try {
      const res = await gerarFaturaPixPDF({
        transacao,
        copiaECola,
        nomeSistema: cfg?.nomeSistema || 'Sistema Financeiro',
        corPrimaria: cfg?.corPrimaria || '#1e3a8a',
        fotoPerfil: cfg?.fotoPerfil,
        nomeTitular,
        chavePix,
        tipoChave,
        cidadeTitular,
        clienteNome: transacao.clienteNome,
        clienteTelefone: telefoneCliente
      });
      res.download();
      playSound('sucesso');
    } catch (err: any) {
      alert('Erro ao gerar PDF da fatura: ' + err.message);
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!copiaECola) return;
    const numLimpo = telefoneCliente.replace(/\D/g, '');
    if (!numLimpo || numLimpo.length < 10) {
      alert('Por favor, informe o número de WhatsApp do cliente com DDD (ex: 49999999999).');
      return;
    }

    setEnviandoWhatsapp(true);
    try {
      // 1. Gerar Fatura PDF oficial com visual de Boleto e QR Code integrado
      let pdfBase64: string | undefined;
      let nomeArquivo: string | undefined;

      try {
        const pdfRes = await gerarFaturaPixPDF({
          transacao,
          copiaECola,
          nomeSistema: cfg?.nomeSistema || 'Sistema Financeiro',
          corPrimaria: cfg?.corPrimaria || '#1e3a8a',
          fotoPerfil: cfg?.fotoPerfil,
          nomeTitular,
          chavePix,
          tipoChave,
          cidadeTitular,
          clienteNome: transacao.clienteNome,
          clienteTelefone: telefoneCliente
        });
        pdfBase64 = pdfRes.base64;
        nomeArquivo = pdfRes.nomeArquivo;
      } catch (pdfErr) {
        console.error('Erro ao gerar PDF para WhatsApp:', pdfErr);
      }

      // 2. Mensagem de texto com dados resumidos e Copia e Cola
      const msg = montarMensagemCobrancaPix({
        clienteNome: transacao.clienteNome || 'Cliente',
        descricao: transacao.descricao,
        valor,
        dataVencimento: transacao.dataVencimento || transacao.data,
        nomeSistema: cfg?.nomeSistema || 'Sistema Financeiro',
        copiaECola
      });

      const tenantId = typeof getTenantId === 'function' ? getTenantId() : 'master';
      const res = await fetch('/api/whatsapp/cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: numLimpo,
          mensagem: msg,
          pdfBase64,
          nomeArquivo,
          tenantId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playSound('sucesso');
        setWhatsappEnviado(true);
        if (data.warning) {
          alert('⚠️ ' + data.warning);
        } else {
          alert('✅ Fatura PIX em PDF (com QR Code) e código Copia e Cola enviados diretamente para o WhatsApp do cliente!');
        }
      } else {
        alert('Aviso da API: ' + (data.error || 'Não foi possível entregar a mensagem. Verifique se o robô do WhatsApp está conectado em Configurações.'));
      }
    } catch (e: any) {
      alert('Erro ao disparar cobrança: ' + e.message);
    } finally {
      setEnviandoWhatsapp(false);
    }
  };

  const handleDarBaixaInstantanea = async () => {
    if (!confirm(`Confirmar o recebimento de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)} via PIX? O status será alterado para Pago.`)) {
      return;
    }

    setProcessandoBaixa(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      await atualizarTransacao(transacao.id, {
        status: 'pago',
        dataPagamento: hoje,
        formaPagamento: 'PIX'
      });

      playSound('recebimento');
      setBaixaConcluida(true);
      setTimeout(() => {
        onBaixaSucesso(transacao.id);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Erro ao dar baixa: ' + err.message);
      setProcessandoBaixa(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: 'var(--bg-primary, #0f172a)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#10b981', color: '#fff', padding: 8, borderRadius: 10 }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-title, #fff)' }}>Cobrança via PIX</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{transacao.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {baixaConcluida ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#10b981' }}>Pagamento Confirmado!</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>A conta foi liquidada e o saldo já foi atualizado.</p>
            </div>
          ) : (
            <>
              {/* Card de Valor */}
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#10b981', letterSpacing: 0.5 }}>Valor a Receber</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', marginTop: 2 }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                </div>
                {transacao.clienteNome && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
                    Cliente: <strong>{transacao.clienteNome}</strong>
                  </span>
                )}
              </div>

              {/* Configuração de Chave PIX (se não tiver ou se clicou em editar) */}
              {editandoDadosPix ? (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-title)' }}>⚙️ Seus Dados PIX (Recebedor)</span>
                    {cfg?.pixChave && (
                      <button onClick={() => setEditandoDadosPix(false)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de Chave</label>
                      <select
                        className="input-field"
                        value={tipoChave}
                        onChange={e => setTipoChave(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
                      >
                        <option value="cnpj">CNPJ</option>
                        <option value="cpf">CPF</option>
                        <option value="telefone">Celular</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Sua Chave PIX</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Digite sua chave PIX..."
                        value={chavePix}
                        onChange={e => setChavePix(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nome do Titular</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: AUTOCRED"
                          value={nomeTitular}
                          onChange={e => setNomeTitular(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Cidade do Banco</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: CHAPECO"
                          value={cidadeTitular}
                          onChange={e => setCidadeTitular(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSalvarDadosPix}
                      disabled={salvandoConfig}
                      className="btn-primary"
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}
                    >
                      {salvandoConfig ? 'Salvando...' : 'Salvar Dados PIX'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Beneficiário: <strong style={{ color: 'var(--text-title)' }}>{nomeTitular}</strong> ({chavePix})
                  </span>
                  <button onClick={() => setEditandoDadosPix(true)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Settings size={12} /> Alterar
                  </button>
                </div>
              )}

              {/* QR Code */}
              {chavePix && (
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <img src={qrCodeUrl} alt="QR Code PIX" style={{ width: 180, height: 180, display: 'block' }} />
                  </div>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Aponte a câmera do aplicativo do seu banco para ler o QR Code
                  </span>
                </div>
              )}

              {/* Código Copia e Cola */}
              {chavePix && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Código PIX Copia e Cola
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      readOnly
                      value={copiaECola}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      onClick={handleCopiar}
                      style={{ background: copiado ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    >
                      {copiado ? <Check size={14} /> : <Copy size={14} />}
                      {copiado ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão Baixar / Imprimir Fatura Boleto em PDF */}
              {copiaECola && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={handleBaixarFaturaPdf}
                    disabled={gerandoPdf}
                    style={{
                      width: '100%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 10,
                      padding: '11px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 2px 6px rgba(59, 130, 246, 0.1)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {gerandoPdf ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Gerando Fatura / Boleto em PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={17} />
                        <span>📄 Baixar / Visualizar Fatura Boleto (PDF com QR Code)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Ações de Cobrança e Baixa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {/* Cobrança WhatsApp via API */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    Enviar Fatura em PDF (com QR Code) + PIX no WhatsApp do Cliente:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="WhatsApp do Cliente (DDD + Número, ex: 49999999999)"
                      value={telefoneCliente}
                      onChange={e => {
                        setTelefoneCliente(e.target.value);
                        setWhatsappEnviado(false);
                      }}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={handleEnviarWhatsApp}
                      disabled={enviandoWhatsapp || !copiaECola}
                      style={{
                        background: whatsappEnviado ? '#059669' : '#25d366',
                        color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {enviandoWhatsapp ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          <span>Gerando e Enviando...</span>
                        </>
                      ) : whatsappEnviado ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Fatura Enviada!</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Disparar Fatura PDF + PIX</span>
                        </>
                      )}
                    </button>
                  </div>
                  {telefoneCliente && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                      <a
                        href={`https://wa.me/55${telefoneCliente.replace(/\D/g, '')}?text=${encodeURIComponent(montarMensagemCobrancaPix({
                          clienteNome: transacao.clienteNome || 'Cliente',
                          descricao: transacao.descricao,
                          valor,
                          dataVencimento: transacao.dataVencimento || transacao.data,
                          nomeSistema: cfg?.nomeSistema || 'Sistema Financeiro',
                          copiaECola
                        }))}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Ou abrir no WhatsApp Web manualmente
                      </a>
                    </div>
                  )}
                </div>

                {/* Botão de Baixa Instantânea */}
                <button
                  type="button"
                  onClick={handleDarBaixaInstantanea}
                  disabled={processandoBaixa}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
                >
                  <ArrowDownCircle size={16} />
                  {processandoBaixa ? 'Dando Baixa...' : 'Confirmar Pagamento & Dar Baixa Instantânea'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
