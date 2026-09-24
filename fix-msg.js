const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(
  /if\(msg\.includes\('Quota exceeded'\)\) msg = 'A cota diária gratuita do banco de dados foi excedida \(Firebase\)\. Volte amanhã ou faça o upgrade do plano \(Blaze\)\.';/g,
  "if(msg.includes('Quota exceeded')) msg = 'A cota diária gratuita do banco de dados foi excedida (Firebase). Volte amanhã ou faça o upgrade do plano (Blaze).'; if(msg.includes('Connection failed') || msg.includes('offline') || msg.includes('network') || msg.includes('Failed to fetch')) msg = 'Sua conexão com o servidor falhou ou oscilou. Verifique sua rede e tente salvar novamente. (Se o erro persistir, aguarde 30 segundos).';"
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
