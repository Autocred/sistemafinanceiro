import fs from 'fs';
import path from 'path';

const map = {
  'PRODUǟO': 'PRODUÇÃO',
  'ATENǟO': 'ATENÇÃO',
  'VISǟO': 'VISÃO',
  'EXCLUSǟO': 'EXCLUSÃO',
  'usuǭrio': 'usuário',
  'DESCRIǟO': 'DESCRIÇÃO',
  'SESSǟO': 'SESSÃO',
  'CONCILIAǟO': 'CONCILIAÇÃO',
  'PROJEǟO': 'PROJEÇÃO',
  'DETECǟO': 'DETECÇÃO',
  'CARTǟO': 'CARTÃO',
  'aǜo': 'ação',
  'crtica': 'crítica',
  'ǧltimos': 'últimos',
  'serǜo': 'serão',
  'lanamentos': 'lançamentos',
  'voltarǜo': 'voltarão',
  'AMANHǟ': 'AMANHÃ',
  'PR"XIMOS': 'PRÓXIMOS',
  'PROJE!ǟ\'O': 'PROJEÇÃO',
  'BOTǟO': 'BOTÃO',
  'LANAMENTO': 'LANÇAMENTO',
  'CARTǟ\'O': 'CARTÃO',
  'ANTECIPA!ǟ\'O': 'ANTECIPAÇÃO',
  'DIǟ?RIO': 'DIÁRIO',
  'MOVIMENTA ES': 'MOVIMENTAÇÕES',
  'SE!ǟ\'O': 'SEÇÃO',
  'GRǟ?FICO': 'GRÁFICO',
  'GRǟ?FICOS': 'GRÁFICOS',
  'PER?ODO': 'PERÍODO',
  'BANC?RIO': 'BANCÁRIO',
  'GR?FICO': 'GRÁFICO',
  'DISTRIBUIǟO': 'DISTRIBUIÇÃO',
  'aǜo nǜo pode': 'ação não pode',
  'EDIǟO': 'EDIÇÃO',
  'CRIAǟO': 'CRIAÇÃO',
  'CR%DITO': 'CRÉDITO',
  'PR%-LANAMENTO': 'PRÉ-LANÇAMENTO',
  'CONFIRMAǟO': 'CONFIRMAÇÃO',
  'R?PIDA': 'RÁPIDA',
  'CLICǟ?VEL': 'CLICÁVEL',
  'RESTRI!ǟ\'O': 'RESTRIÇÃO',
  'automaes': 'automações',
  'ENTǟO': 'ENTÃO',
  'VERIFICAǟO': 'VERIFICAÇÃO',
  'ESPEC?FICO': 'ESPECÍFICO',
  'NǟO': 'NÃO',
  'estǭ': 'está',
  '\'ncoras': 'Âncoras',
  'RAǟO': 'RAÇÃO',
  'LICENA': 'LICENÇA',
  'APROVAǟO': 'APROVAÇÃO',
  'VALIDAǟO': 'VALIDAÇÃO',
  'TRANSAǟO': 'TRANSAÇÃO',
  'OBRIGAT"RIA': 'OBRIGATÓRIA',
  'IMPLEMENTAǟO': 'IMPLEMENTAÇÃO',
  's? ': '⚠️ ',
  'ǽ? ': '⚠️ ',
  '"?': '🚀', // wait, maybe not rocket, just leave it out? Let's use * instead
  'Cǟ?LCULO': 'CÁLCULO',
  'ANTECIPAǟO': 'ANTECIPAÇÃO',
  'CRǟ?TICOS': 'CRÍTICOS',
  'AT%': 'ATÉ',
  'Ǹ permanente': 'é permanente',
  'removerǭ': 'removerá',
  'forar': 'forçar',
  'MSS': 'MÊS',
  '"': 'Ó',
  'Ǹ': 'é'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }
      
      // generic replaces
      if (content.includes('"?')) { content = content.split('"?').join('*'); changed = true; }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

walk('./src');
