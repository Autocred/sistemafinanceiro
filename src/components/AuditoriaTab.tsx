'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Download, RefreshCw, Filter, ShieldAlert, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { AuditLogRecord } from '@/lib/types';
import { getAuditoriaLogs } from '@/lib/audit';

export default function AuditoriaTab() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroResultado, setFiltroResultado] = useState<string>('todos');

  const carregarLogs = async () => {
    setLoading(true);
    const data = await getAuditoriaLogs(300);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const filtrados = logs.filter(l => {
    const matchText = l.acao.toLowerCase().includes(busca.toLowerCase()) ||
                      l.usuarioNome.toLowerCase().includes(busca.toLowerCase()) ||
                      l.detalhes.toLowerCase().includes(busca.toLowerCase());
    const matchCat = filtroCategoria === 'todas' || l.categoria === filtroCategoria;
    const matchRes = filtroResultado === 'todos' || l.resultado === filtroResultado;
    return matchText && matchCat && matchRes;
  });

  const exportarCSV = () => {
    const headers = ['Data', 'Hora', 'Usuário', 'Ação', 'Categoria', 'Detalhes', 'Resultado', 'Navegador/OS', 'Dispositivo'];
    const rows = filtrados.map(l => [
      l.data, l.hora, `"${l.usuarioNome}"`, `"${l.acao}"`, l.categoria, `"${l.detalhes}"`, l.resultado, `"${l.navegador}/${l.os}"`, `"${l.dispositivo}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_sistema_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} style={{ color: '#3b82f6' }} /> Auditoria & Seguranca
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Registro completo de todas as ações, logins, exclusões e alterações não sistema.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={carregarLogs} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={exportarCSV} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 34, height: 38 }}
            placeholder="Pesquisar por ação, usuário ou detalhes..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select className="input-field" style={{ width: 160, height: 38 }} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="todas">Todas Categoria</option>
          <option value="financeiro">Financeiro</option>
          <option value="seguranca">Segurança</option>
          <option value="usuario">Usuário</option>
          <option value="sistema">Sistema</option>
        </select>
        <select className="input-field" style={{ width: 160, height: 38 }} value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)}>
          <option value="todos">Todos Resultados</option>
          <option value="SUCESSO">Sucesso</option>
          <option value="FALHA">Falha</option>
          <option value="ALERTA">Alerta</option>
        </select>
      </div>

      {/* Tabela de Logs */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 16px' }}>Data / Hora</th>
                <th style={{ padding: '14px 16px' }}>Usuário</th>
                <th style={{ padding: '14px 16px' }}>Ação</th>
                <th style={{ padding: '14px 16px' }}>Detalhes</th>
                <th style={{ padding: '14px 16px' }}>Dispositivo</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.data.split('-').reverse().join('/')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.hora}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.usuarioNome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.usuarioEmail}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: log.categoria === 'seguranca' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                      color: log.categoria === 'seguranca' ? '#ef4444' : '#60a5fa',
                      padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 10
                    }}>
                      {log.acao}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.detalhes}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                    {log.navegador || 'Chrome'} • {log.os || 'Windows'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      background: log.resultado === 'SUCESSO' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: log.resultado === 'SUCESSO' ? '#10b981' : '#ef4444',
                      padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 10
                    }}>
                      {log.resultado}
                    </span>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
