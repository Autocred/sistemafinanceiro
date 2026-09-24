import fs from 'fs';
const files = ['src/components/Configuracoes.tsx'];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/FÃ­sica elÃ¡stica/g, 'Física elástica')
       .replace(/notificaÃ§Ãµes/g, 'Notificações')
       .replace(/S Versão da Interface/g, 'Versão da Interface')
       .replace(/ClÃ¡ssica/g, 'Clássica')
       .replace(/InformaÃ§Ãµes/g, 'Informações')
       .replace(/AvanÃ§ados/g, 'Avançados')
       .replace(/FinanÃ§as/g, 'Finanças')
       .replace(/AparÃªncia/g, 'Aparência')
       .replace(/InteligÃªncia/g, 'Inteligência')
       .replace(/SeguranÃ§a/g, 'Segurança')
       .replace(/transaÃ§Ã£o/g, 'transação')
       .replace(/serÃ¡/g, 'será')
       .replace(/padrÃ£o/g, 'padrão')
       .replace(/versÃ£o/g, 'versão')
       .replace(/VocÃª/g, 'Você')
       .replace(/AutomÃ¡tico/g, 'Automático')
       .replace(/atualizaÃ§Ã£o/g, 'atualização')
       .replace(/InformaÃ§Ã£o/g, 'Informação')
       .replace(/PermissÃ£o/g, 'Permissão')
       .replace(/NotificaÃ§Ãµes/g, 'Notificações');
  fs.writeFileSync(f, c);
}
console.log('Fixed Configs 2!');
