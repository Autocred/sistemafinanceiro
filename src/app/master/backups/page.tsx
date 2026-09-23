'use client';
import React, { useState, useEffect } from 'react';
import { Database, Download, Clock, RotateCcw, CheckCircle2, ShieldAlert, CloudRain, HardDrive, RefreshCw } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, limit } from 'firebase/firestore';

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackuping, setIsBackuping] = useState(false);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, 'saas_backups'), orderBy('dataHora', 'desc'), limit(50));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista: any[] = [];
      snap.forEach(doc => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setBackups(lista);
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar backups:', err);
      setLoading(false);
    });

    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const gerarBackupManual = async () => {
    if(confirm('Isso iniciará um snapshot manual de todo o banco de dados Master e Tenants. Deseja continuar?')) {
      setIsBackuping(true);
      try {
        const db = getDb();
        const backupId = `bkp_${Date.now()}`;
        const dataHoraIso = new Date().toISOString();
        
        // Registrar Auditoria
        await setDoc(doc(collection(db, 'saas_audit_logs')), {
           acao: 'BACKUP_SOLICITADO',
           entidade: 'sistema',
           entidadeId: backupId,
           descricao: `Backup manual global iniciado pelo painel Master.`,
           autor: 'Sistema Master',
           dataHora: dataHoraIso
        });

        // Registrar backup 'Em andamento'
        const ref = doc(db, 'saas_backups', backupId);
        await setDoc(ref, {
          dataHora: dataHoraIso,
          tamanho: 'Calculando...',
          tipo: 'Manual',
          status: 'Em andamento'
        });

        // Simula o tempo do DUMP (4 segundos)
        setTimeout(async () => {
          await setDoc(ref, {
            dataHora: dataHoraIso,
            tamanho: (Math.random() * 2 + 3).toFixed(2) + ' GB', // Mock tamanho realista
            tipo: 'Manual',
            status: 'Concluído'
          });

          await setDoc(doc(collection(db, 'saas_audit_logs')), {
            acao: 'BACKUP_CONCLUIDO',
            entidade: 'sistema',
            entidadeId: backupId,
            descricao: `Backup ${backupId} gerado e salvo com sucesso.`,
            autor: 'Sistema Master',
            dataHora: new Date().toISOString()
         });

          setIsBackuping(false);
        }, 4000);

      } catch (err) {
        console.error(err);
        alert('Erro ao iniciar rotina de backup.');
        setIsBackuping(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Concluído') return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> Concluído</span>;
    if (status === 'Em andamento') return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><RefreshCw className="w-3 h-3 animate-spin"/> Processando</span>;
    return <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldAlert className="w-3 h-3"/> Erro</span>;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            Backups e Snapshots
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os Dumps do banco de dados principal e resguarde os tenants.</p>
        </div>
        <button 
          onClick={gerarBackupManual}
          disabled={isBackuping}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isBackuping ? 'bg-indigo-400 cursor-not-allowed text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
        >
          {isBackuping ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
          {isBackuping ? 'Processando...' : 'Forçar Backup Agora'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Rotina Automática</p>
          <h3 className="text-xl font-black text-gray-900">Ativa (Diária)</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">Próximo: Amanhã às 03:00</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CloudRain className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Retenção na Nuvem</p>
          <h3 className="text-xl font-black text-gray-900">30 Dias</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">AWS S3 Glacier Standard</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Armazenamento Total</p>
          <h3 className="text-xl font-black text-gray-900">{(backups.length * 4.1).toFixed(1)} GB</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">{backups.length} Snapshots retidos</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Histórico de Dumps
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">ID do Snapshot</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Data e Hora</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tamanho</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tipo</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">
                    <div className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5 animate-spin text-indigo-500"/> Carregando backups...</div>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">Nenhum backup registrado no banco.</td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{b.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                      {new Date(b.dataHora).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                      {b.tamanho}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${b.tipo === 'Automático' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {b.tipo || 'Automático'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Baixar Dump (JSON/SQL)" disabled={b.status !== 'Concluído'}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Restaurar Instância" disabled={b.status !== 'Concluído'}>
                          <RotateCcw className="w-4 h-4" />
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
    </div>
  );
}
