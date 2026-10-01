const fs = require('fs');

let src = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

// 1. Ensure getTenantId is imported from storage
if (!src.includes('getTenantId')) {
  src = src.replace("import { getConfiguracoes, salvarConfiguracoes } from '@/lib/storage';", "import { getConfiguracoes, salvarConfiguracoes, getTenantId } from '@/lib/storage';");
}

// 2. Update the test buttons to pass tenantId, numero and nome
const oldFechamentoBtn = `                      alert('Disparando teste de Fechamento Diário...');
                      const res = await fetch('/api/cron/fechamento-diario');`;

const newFechamentoBtn = `                      alert('Disparando teste de Fechamento Diário...');
                      const currentTenant = typeof getTenantId === 'function' ? getTenantId() : 'master';
                      const nomeAtual = cfg.nomeSistema || cfg.nomeUsuario || (currentTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora');
                      const res = await fetch(\`/api/cron/fechamento-diario?tenantId=\${encodeURIComponent(currentTenant)}&numero=\${encodeURIComponent(cfg.whatsappNumeros || '')}&nome=\${encodeURIComponent(nomeAtual)}\`);`;

const oldLembreteBtn = `                      alert('Disparando teste de Lembrete de Contas...');
                      const res = await fetch('/api/cron/lembretes');`;

const newLembreteBtn = `                      alert('Disparando teste de Lembrete de Contas...');
                      const currentTenant = typeof getTenantId === 'function' ? getTenantId() : 'master';
                      const nomeAtual = cfg.nomeSistema || cfg.nomeUsuario || (currentTenant === 'master' ? 'Clovis Master' : 'Autocred Promotora');
                      const res = await fetch(\`/api/cron/lembretes?tenantId=\${encodeURIComponent(currentTenant)}&numero=\${encodeURIComponent(cfg.whatsappNumeros || '')}&nome=\${encodeURIComponent(nomeAtual)}\`);`;

if (src.includes(oldFechamentoBtn) && src.includes(oldLembreteBtn)) {
  src = src.replace(oldFechamentoBtn, newFechamentoBtn);
  src = src.replace(oldLembreteBtn, newLembreteBtn);
  fs.writeFileSync('src/components/Configuracoes.tsx', src);
  console.log('✅ Botões de teste em Configuracoes.tsx agora passam o tenantId ativo!');
} else {
  console.error('❌ Botões de teste não encontrados no arquivo.');
}
