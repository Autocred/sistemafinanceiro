'use client';
import { useEffect, useRef } from 'react';
import { getConfiguracoes } from '@/lib/storage';
import { listarBackups, fazerBackup, shouldRunAutoBackup } from '@/lib/backup';

export function AutoBackup() {
  const isChecking = useRef(false);

  useEffect(() => {
    const checkBackup = async () => {
      if (isChecking.current) return;
      isChecking.current = true;
      try {
        const config = await getConfiguracoes();
        if (!config.backupAutomatico || !config.frequenciaBackup || config.frequenciaBackup === 'nunca') return;

        const backups = await listarBackups();
        const autoBackups = backups.filter(b => b.tipo === 'automatico');
        const ultimoBackup = autoBackups.length > 0 ? autoBackups[0].dataHora : undefined;

        if (shouldRunAutoBackup(config.frequenciaBackup, config.horarioBackup, ultimoBackup)) {
          console.log('Iniciando backup automático não background...');
          await fazerBackup('automatico');
          console.log('Backup automático finalizado com sucesso.');
        }
      } catch (err) {
        console.error('Erro ao verificar/executar backup automático:', err);
      } finally {
        isChecking.current = false;
      }
    };

    // Delay initial check slightly to not block initial render
    const timeout = setTimeout(checkBackup, 5000);
    
    // Check every 10 minutes afterwards
    const interval = setInterval(checkBackup, 10 * 60 * 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return null;
}
