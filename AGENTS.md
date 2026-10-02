<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
Regra White Label SaaS: Todas as telas, incluindo Login e PWA, devem OBRIGATORIAMENTE exibir o 'nomeSistema', 'fotoPerfil' e cores da paleta prim�ria cadastrados nas configura��es individuais de cada licen�a (Tenant). NUNCA hardcode cores gen�ricas ou nomes padr�o do sistema quando for poss�vel ler as configura��es do Tenant.


- **REGRA DE ATUALIZACOES SAAS BLINDADA**: Você é terminantemente PROIBIDO de usar `npx vercel --prod` diretamente. Para fazer um deploy, você DEVE OBRIGATORIAMENTE modificar o arquivo `seed.mjs` com as novidades e rodar o comando `npm run deploy` (que dispara o seed e a vercel juntos, travando o sistema se você esquecer).