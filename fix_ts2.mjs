import fs from 'fs';
let mt = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');
mt = mt.replace(/t\.categoria ===/g, "t.categoriaNome ===");
mt = mt.replace(/t\.dataPagamento \|\| t\.dataCompetencia \|\| t\.dataVencimento \|\| t\.dataCadastro/g, "t.dataPagamento || t.dataCompetencia || t.dataVencimento || t.data");
fs.writeFileSync('src/components/MetasGamificadasV2.tsx', mt);
console.log('Fixed new TS errors');
