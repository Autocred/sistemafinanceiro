import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getDb } from './firebase';
import { getCollectionPath, gerarId } from './storage';
import { BackupApp, LogBackup } from './types';

const BACKUP_COLLECTION = 'backups_sistema';
const LOGS_COLLECTION = 'logs_backups';

// The collections to backup
const DATA_COLLECTIONS = [
  'transacoes', 'categorias', 'centrosCusto', 'fornecedores', 
  'clientes', 'contas', 'cartoes', 'faturas', 
  'financial_movements', 'alertas', 'historico_ia'
];

export async function fazerBackup(tipo: 'manual' | 'automatico' | 'pre_restauracao'): Promise<BackupApp> {
  const db = getDb();
  const backupData: any = {};
  let totalRegistros = 0;

  // 1. Fetch normal collections
  for (const col of DATA_COLLECTIONS) {
    const snap = await getDocs(collection(db, getCollectionPath(col)));
    backupData[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    totalRegistros += snap.docs.length;
  }

  // 2. Fetch specific single documents (e.g., configuracoes_metas/metas)
  const metasSnap = await getDoc(doc(db, getCollectionPath('configuracoes_metas'), 'metas'));
  if (metasSnap.exists()) {
    backupData['configuracoes_metas'] = metasSnap.data();
    totalRegistros += 1;
  }

  const payloadString = JSON.stringify(backupData);
  
  const backup: BackupApp = {
    id: gerarId(),
    dataHora: new Date().toISOString(),
    tipo,
    tamanhoRegistros: totalRegistros,
    dados: payloadString
  };

  // Save the backup
  await setDoc(doc(db, getCollectionPath(BACKUP_COLLECTION), backup.id), backup);
  
  // Log the creation
  await registrarLogBackup('backup_criado', `Backup ${tipo} criado com sucesso. Registros: ${totalRegistros}`);

  return backup;
}

export async function restaurarBackup(backupId: string): Promise<void> {
  const db = getDb();
  const backupRef = doc(db, getCollectionPath(BACKUP_COLLECTION), backupId);
  const snap = await getDoc(backupRef);
  
  if (!snap.exists()) throw new Error('Backup não encontrado');
  
  const backup = snap.data() as BackupApp;
  
  // 1. Create a safety backup before restoring
  await fazerBackup('pre_restauracao');
  
  // 2. Parse backup data
  const parsedData = JSON.parse(backup.dados);
  
  // 3. Clear existing collections and insert new data
  // Due to batch limits (500 writes), we will do this sequentially or in chunks
  for (const col of DATA_COLLECTIONS) {
    // Delete current data
    const currentSnap = await getDocs(collection(db, getCollectionPath(col)));
    const deletePromises = currentSnap.docs.map(d => deleteDoc(doc(db, getCollectionPath(col), d.id)));
    await Promise.all(deletePromises);
    
    // Insert backup data
    const docsToInsert = parsedData[col] || [];
    const insertPromises = docsToInsert.map((d: any) => {
      const { id, ...rest } = d;
      return setDoc(doc(db, getCollectionPath(col), id), rest);
    });
    await Promise.all(insertPromises);
  }
  
  // Restore specific single documents
  if (parsedData['configuracoes_metas']) {
    await setDoc(doc(db, getCollectionPath('configuracoes_metas'), 'metas'), parsedData['configuracoes_metas']);
  }
  
  // 4. Log the restoration
  await registrarLogBackup('restaurado', `Sistema restaurado a partir do backup: ${backup.dataHora}`);
}

export async function restaurarBackupDeJSON(parsedData: any): Promise<void> {
  const db = getDb();
  
  // 1. Create a safety backup before restoring
  await fazerBackup('pre_restauracao');
  
  // 3. Clear existing collections and insert new data
  for (const col of DATA_COLLECTIONS) {
    // Delete current data
    const currentSnap = await getDocs(collection(db, getCollectionPath(col)));
    const deletePromises = currentSnap.docs.map(d => deleteDoc(doc(db, getCollectionPath(col), d.id)));
    await Promise.all(deletePromises);
    
    // Insert backup data
    const docsToInsert = parsedData[col] || [];
    const insertPromises = docsToInsert.map((d: any) => {
      const { id, ...rest } = d;
      return setDoc(doc(db, getCollectionPath(col), id), rest);
    });
    await Promise.all(insertPromises);
  }
  
  // Restore specific single documents
  if (parsedData['configuracoes_metas']) {
    await setDoc(doc(db, getCollectionPath('configuracoes_metas'), 'metas'), parsedData['configuracoes_metas']);
  }
  
  // 4. Log the restoration
  await registrarLogBackup('restaurado', `Sistema restaurado a partir de arquivo de backup enviado do computador.`);
}

export async function desfazerRestauracao(): Promise<void> {
  const db = getDb();
  // Fetch the latest 'pre_restauracao' backup
  const snap = await getDocs(collection(db, getCollectionPath(BACKUP_COLLECTION)));
  const backups = snap.docs.map(d => d.data() as BackupApp);
  
  const preRestauracoes = backups
    .filter(b => b.tipo === 'pre_restauracao')
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
    
  if (preRestauracoes.length === 0) {
    throw new Error('Não há ponto de restauração disponível para desfazer.');
  }
  
  const ultimoPonto = preRestauracoes[0];
  
  // We do exactly what restore does, but without creating another 'pre_restauracao'
  const parsedData = JSON.parse(ultimoPonto.dados);
  
  for (const col of DATA_COLLECTIONS) {
    const currentSnap = await getDocs(collection(db, getCollectionPath(col)));
    const deletePromises = currentSnap.docs.map(d => deleteDoc(doc(db, getCollectionPath(col), d.id)));
    await Promise.all(deletePromises);
    
    const docsToInsert = parsedData[col] || [];
    const insertPromises = docsToInsert.map((d: any) => {
      const { id, ...rest } = d;
      return setDoc(doc(db, getCollectionPath(col), id), rest);
    });
    await Promise.all(insertPromises);
  }
  
  if (parsedData['configuracoes_metas']) {
    await setDoc(doc(db, getCollectionPath('configuracoes_metas'), 'metas'), parsedData['configuracoes_metas']);
  }
  
  await registrarLogBackup('desfeito', 'Última restauração foi desfeita, sistema voltou ao estado anterior.');
}

export async function listarBackups(): Promise<BackupApp[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, getCollectionPath(BACKUP_COLLECTION)));
  return snap.docs
    .map(d => d.data() as BackupApp)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()); // Decrescente
}

export async function listarLogsBackup(): Promise<LogBackup[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, getCollectionPath(LOGS_COLLECTION)));
  return snap.docs
    .map(d => d.data() as LogBackup)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
}

export async function registrarLogBackup(acao: 'backup_criado' | 'restaurado' | 'desfeito', detalhes: string): Promise<void> {
  const db = getDb();
  const log: LogBackup = {
    id: gerarId(),
    dataHora: new Date().toISOString(),
    acao,
    detalhes
  };
  await setDoc(doc(db, getCollectionPath(LOGS_COLLECTION), log.id), log);
}

export function shouldRunAutoBackup(
  frequencia: 'diario' | 'semanal' | 'mensal' | 'nunca' | undefined,
  horario: string | undefined, // Format HH:MM
  ultimoBackupDataHora: string | undefined
): boolean {
  if (!frequencia || frequencia === 'nunca') return false;
  
  const now = new Date();
  
  // Parse target time
  let targetHour = 0;
  let targetMinute = 0;
  if (horario && horario.includes(':')) {
    const parts = horario.split(':');
    targetHour = parseInt(parts[0], 10);
    targetMinute = parseInt(parts[1], 10);
  }
  
  // Have we reached or passed the target time today?
  const isPastTime = (now.getHours() > targetHour) || (now.getHours() === targetHour && now.getMinutes() >= targetMinute);
  
  if (!isPastTime) {
    // If it's not yet time today, we don't run it right now.
    return false;
  }
  
  if (!ultimoBackupDataHora) {
    return true; // Never backed up before, and we passed the time
  }
  
  const last = new Date(ultimoBackupDataHora);
  const nowTime = now.getTime();
  const lastTime = last.getTime();
  const hoursPassed = (nowTime - lastTime) / (1000 * 60 * 60);
  
  if (frequencia === 'diario' && hoursPassed >= 20) return true;
  if (frequencia === 'semanal' && hoursPassed >= 160) return true;
  if (frequencia === 'mensal' && hoursPassed >= 700) return true;
  
  return false;
}
