const fs = require('fs');

let src = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

const oldText = `        </SecaoConfig>
        
        {/* Notificações por WhatsApp da Licença */}`;

const newText = `        </SecaoConfig>
        )}
        
        {/* Notificações por WhatsApp da Licença */}`;

if (src.includes(oldText)) {
  src = src.replace(oldText, newText);
  fs.writeFileSync('src/components/Configuracoes.tsx', src);
  console.log('✅ Adicionado )} antes da nova seção');
} else {
  console.error('oldText não encontrado');
}
