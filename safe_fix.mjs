import fs from 'fs';
import path from 'path';

// 1. NewMobileBankApp.tsx fix
let f1 = 'src/components/NewMobileBankApp.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(
  "Olá, {cfg?.nomeUsuario ? cfg.nomeUsuario.split(' ')[0] : (userProfile?.nome ? userProfile.nome.split(' ')[0] : 'Clovis')}",
  "Olá, {(userProfile?.nome && userProfile.nome !== 'Usuário') ? userProfile.nome.split(' ')[0] : (cfg?.nomeUsuario && cfg.nomeUsuario !== 'Usuário' ? cfg.nomeUsuario.split(' ')[0] : 'Usuário')}"
);
fs.writeFileSync(f1, c1);

// 2. Dashboard.tsx fix
let f2 = 'src/components/Dashboard.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(
  "const c = await getConfiguracoes();\n        if (c?.nomeUsuario) name = c.nomeUsuario;",
  "const c = await getConfiguracoes();\n        if (!name && c?.nomeUsuario && c.nomeUsuario !== 'Usuário') {\n          name = c.nomeUsuario;\n        }"
);
c2 = c2.replace(
  "if (p?.nome) name = p.nome;",
  "if (p?.nome && p.nome !== 'Usuário') name = p.nome;"
);
fs.writeFileSync(f2, c2);

// 3. ModalLancamento.tsx fix
let f3 = 'src/components/ModalLancamento.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(
  "setErro(err.message || 'Erro ao salvar. Tente novamente.');",
  "let msg = err.message || 'Erro ao salvar. Tente novamente.'; if(msg.includes('Quota exceeded')) msg = 'A cota diária gratuita do banco de dados foi excedida (Firebase). Volte amanhã ou faça o upgrade do plano (Blaze).'; setErro(msg);"
);
fs.writeFileSync(f3, c3);

// 4. Configuracoes.tsx fix emojis
let f4 = 'src/components/Configuracoes.tsx';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace('APAR`NCIA & DESIGN SYSTEM', 'APARÊNCIA & DESIGN SYSTEM')
       .replace('ÃœÂ¬Ã¯Â¸Â  Claro', '☀️ Claro')
       .replace('xR" Escuro', '🌙 Escuro')
       .replace('x  Automático', '⚙️ Automático');
fs.writeFileSync(f4, c4);

// 5. Global text fixes (safe map, without double quotes and things that break AST)
const map = {
  'MÃªs': 'Mês',
  'TransferÃªncia': 'Transferência',
  'CartÃ£o': 'Cartão',
  'cartÃ£o': 'cartão',
  'Ã§Ã£o': 'ção',
  'Ã§Ãµes': 'ções',
  'Ãªncia': 'ência',
  'Ãº': 'ú',
  'Ã­': 'í',
  'Ã¡': 'á',
  'Ã¢': 'â',
  'Ã³': 'ó',
  'Ã£': 'ã',
  'Ã©': 'é',
  'Ã§': 'ç',
  'Ãª': 'ê',
  'Ãµ': 'õ',
  'FÃ­sica elÃ¡stica': 'Física elástica',
  'notificaÃ§Ãµes': 'Notificações',
  'S Versão da Interface': 'Versão da Interface',
  'ClÃ¡ssica': 'Clássica',
  'InformaÃ§Ãµes': 'Informações',
  'AvanÃ§ados': 'Avançados',
  'FinanÃ§as': 'Finanças',
  'AparÃªncia': 'Aparência',
  'InteligÃªncia': 'Inteligência',
  'SeguranÃ§a': 'Segurança',
  'transaÃ§Ã£o': 'transação',
  'serÃ¡': 'será',
  'padrÃ£o': 'padrão',
  'versÃ£o': 'versão',
  'VocÃª': 'Você',
  'AutomÃ¡tico': 'Automático',
  'atualizaÃ§Ã£o': 'atualização',
  'InformaÃ§Ã£o': 'Informação',
  'PermissÃ£o': 'Permissão',
  'NotificaÃ§Ãµes': 'Notificações',
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
  'Cǟ?LCULO': 'CÁLCULO',
  'ANTECIPAǟO': 'ANTECIPAÇÃO',
  'CRǟ?TICOS': 'CRÍTICOS',
  'AT%': 'ATÉ',
  'Ǹ permanente': 'é permanente',
  'removerǭ': 'removerá',
  'forar': 'forçar',
  'MSS': 'MÊS',
  'Ǹ': 'é',
  's? ATEN': '⚠️ ATEN',
  'ǽ? Esta': '⚠️ Esta'
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
      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

walk('./src');
console.log('Restored all fixes!');
