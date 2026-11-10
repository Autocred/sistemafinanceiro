import fs from 'fs';

let code = fs.readFileSync('src/lib/storage.ts', 'utf-8');

const replacement = `export async function getConfiguracoes(uid: string = 'app'): Promise<ConfiguracaoApp> {
  const defaults: ConfiguracaoApp = {
    nomeUsuario: 'Usuário', moeda: 'BRL', provedorIA: 'offline',
    notificacoesAtivas: true, backupAutomatico: true, tema: 'dark'
  };
  if (!isBrowser()) return defaults;
  
  let config: ConfiguracaoApp | null = null;
  try {
    const snapGeral = await getDoc(doc(getDb(), getCollectionPath('config'), 'geral'));
    if (snapGeral.exists()) {
      config = snapGeral.data() as ConfiguracaoApp;
    } else {
      const snapUid = await getDoc(doc(getDb(), getCollectionPath('config'), uid));
      if (snapUid.exists()) config = snapUid.data() as ConfiguracaoApp;
    }
  } catch {}

  // Se não tem nomeSistema preenchido, tenta buscar o nome fantasia do tenant (licença)
  if (activeTenantId && activeTenantId !== 'master' && (!config || !config.nomeSistema)) {
    try {
      const snapLicenca = await getDoc(doc(getDb(), 'admin_master_licencas', activeTenantId));
      if (snapLicenca.exists() && snapLicenca.data().nomeFantasia) {
        if (!config) config = { ...defaults };
        config.nomeSistema = snapLicenca.data().nomeFantasia;
      }
    } catch {}
  }

  return config || defaults;
}`;

// The regex will match the existing getConfiguracoes until `return defaults;\n}`
code = code.replace(/export async function getConfiguracoes[\s\S]*?return defaults;\r?\n\}/m, replacement);

fs.writeFileSync('src/lib/storage.ts', code, 'utf-8');
console.log('patched');
