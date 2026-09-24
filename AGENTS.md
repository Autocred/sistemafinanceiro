<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
Regra White Label SaaS: Todas as telas, incluindo Login e PWA, devem OBRIGATORIAMENTE exibir o 'nomeSistema', 'fotoPerfil' e cores da paleta prim�ria cadastrados nas configura��es individuais de cada licen�a (Tenant). NUNCA hardcode cores gen�ricas ou nomes padr�o do sistema quando for poss�vel ler as configura��es do Tenant.


- **REGRA DE ATUALIZACOES SAAS**: Toda vez que voce fizer um deploy para a Vercel (npx vercel --prod), voce DEVE OBRIGATORIAMENTE criar uma entrada na colecao saas_releases documentando o que foi feito. Modifique e rode o arquivo seed.mjs no final do deploy.