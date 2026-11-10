const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

if (!content.includes('normalizeDate')) {
  content = content.replace(
    "import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';",
    "import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';\nimport { normalizeDate } from '@/lib/financialEngine';"
  );
}

content = content.replace(/String\(t\.dataPagamento \|\| t\.dataLancamento \|\| t\.data \|\| ''\)/g, "normalizeDate(t.dataLancamento || t.data || '')");

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
