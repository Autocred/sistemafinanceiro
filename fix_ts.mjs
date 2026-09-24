import fs from 'fs';

// Fix storage.ts
let st = fs.readFileSync('src/lib/storage.ts', 'utf8');
st = st.replace(/_getBasePath\(\), 'metas_financeiras'/g, "getCollectionPath('metas_financeiras')");
fs.writeFileSync('src/lib/storage.ts', st);

// Fix MetasGamificadasV2.tsx
let mt = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');
mt = mt.replace(/t\.categoria ===/g, "t.categoriaNome ===");
mt = mt.replace(/t\.dataPagamento \|\| t\.dataCompetencia \|\| t\.dataCadastro/g, "t.dataPagamento || t.dataCompetencia || t.dataVencimento || t.data");
mt = mt.replace(/formatter=\{\(val: number, name: string\)/g, "formatter={(val: any, name: any)");

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', mt);
console.log('Fixed TS errors!');
