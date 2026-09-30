export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ConfiguracaoApp, BackupApp } from '@/lib/types';
import { shouldRunAutoBackup } from '@/lib/backup'; // We need this logic

const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_financeai';

const DATA_COLLECTIONS = [
  'transacoes', 'categorias', 'centrosCusto', 'fornecedores', 
  'clientes', 'contas', 'cartoes', 'faturas', 
  'financial_movements', 'alertas', 'historicoIA'
];

function getCollectionPathAdmin(tenantId: string | null, col: string) {
  if (!tenantId || tenantId === 'master' || tenantId === '9yxuafoC0AV9BrIKem05ponbmgn2') {
    return col;
  }
  return `tenants/${tenantId}/${col}`;
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('[CRON] Iniciando rotina de Backups Automáticos...');
    const db = adminDb!;
    let processados = 0;

    // 1. Obter todas as licenças (Tenants) + Master
    const licencasSnap = await db.collection('admin_master_licencas').get();
    const tenants = licencasSnap.docs.map(d => d.id);
    tenants.push('master');

    for (const tenantId of tenants) {
      try {
        // Busca configurações do tenant
        const configRef = db.collection(getCollectionPathAdmin(tenantId, 'config')).doc('geral');
        const configSnap = await configRef.get();
        if (!configSnap.exists) continue;

        const cfg = configSnap.data() as ConfiguracaoApp;
        if (!cfg.backupAutomatico || !cfg.frequenciaBackup || cfg.frequenciaBackup === 'nunca') continue;

        // Verifica último backup
        const backupsRef = db.collection(getCollectionPathAdmin(tenantId, 'backups'));
        const backupsSnap = await backupsRef.where('tipo', '==', 'automatico').orderBy('dataHora', 'desc').limit(1).get();
        const ultimoBackup = !backupsSnap.empty ? backupsSnap.docs[0].data().dataHora : undefined;

        const last = ultimoBackup ? new Date(ultimoBackup).getTime() : 0;
        const hours = (Date.now() - last) / (1000 * 60 * 60);
        const shouldRun = !ultimoBackup || (cfg.frequenciaBackup === 'diario' && hours >= 20) || (cfg.frequenciaBackup === 'semanal' && hours >= 160) || (cfg.frequenciaBackup === 'mensal' && hours >= 700);
        if (shouldRun) {
          console.log(`[CRON] Realizando backup automático para tenant: ${tenantId}`);
          
          const backupData: any = {};
          let totalRegistros = 0;

          // Fetch todas collections
          for (const col of DATA_COLLECTIONS) {
            const snap = await db.collection(getCollectionPathAdmin(tenantId, col)).get();
            backupData[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            totalRegistros += snap.docs.length;
          }

          const metasSnap = await db.collection(getCollectionPathAdmin(tenantId, 'configuracoes_metas')).doc('metas').get();
          if (metasSnap.exists) {
            backupData['configuracoes_metas'] = metasSnap.data();
            totalRegistros += 1;
          }

          const payloadString = JSON.stringify(backupData);
          const backupId = gerarId();
          const backup: BackupApp = {
            id: backupId,
            dataHora: new Date().toISOString(),
            tipo: 'automatico',
            tamanhoRegistros: totalRegistros,
            dados: payloadString
          };

          await backupsRef.doc(backupId).set(backup);
          
          const logId = gerarId();
          await db.collection(getCollectionPathAdmin(tenantId, 'logs_backup')).doc(logId).set({
            id: logId,
            dataHora: new Date().toISOString(),
            acao: 'backup_criado',
            detalhes: `Backup automatico criado com sucesso. Registros: ${totalRegistros}`
          });
          
          processados++;
        }
      } catch (e) {
        console.error(`[CRON] Erro ao fazer backup do tenant ${tenantId}:`, e);
      }
    }

    return NextResponse.json({ ok: true, message: `Backups realizados: ${processados}` });
  } catch (error: any) {
    console.error('[CRON BACKUP] Erro fatal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
