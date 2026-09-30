const fs = require('fs');

let storage = fs.readFileSync('src/lib/storage.ts', 'utf8');

storage = storage.replace(
    /if \(!nova\.descricao \|\| !nova\.valor \|\| !nova\.tipo\) \{\s*throw new Error\("Preencha os campos obrigatórios \(Descrição, Valor e Tipo\) para salvar\."\);\s*\}/,
    `if (!nova.descricao || nova.descricao.trim() === '') nova.descricao = "Lançamento sem descrição";\n  if (!nova.valor || !nova.tipo) {\n    throw new Error("Preencha os campos obrigatórios (Valor e Tipo) para salvar.");\n  }`
);

fs.writeFileSync('src/lib/storage.ts', storage);
console.log('Patched storage.ts');

let modal = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// Patch isValid
modal = modal.replace(
    /const isValid = (!faltaConta && !faltaCartao && !faltaContaDestinão && !faltaFornecedor && p\.valor > 0) && p\.descricao\.trim\(\) !== '';/g,
    "const isValid = $1;"
);

// Patch label
modal = modal.replace(
    /<label style=\{\{ fontSize: 11, color: 'var\(--text-muted\)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0\.5px', display: 'block', marginBottom: 5 \}\}>Descrição \*<\/label>/g,
    `<label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Descrição</label>`
);

// Patch handleSubmit
modal = modal.replace(
    /if \(!form\.descricao\.trim\(\)\) \{ setErroForm\('Informe a descrição'\); return; \}/g,
    ""
);

fs.writeFileSync('src/components/ModalLancamento.tsx', modal);
console.log('Patched ModalLancamento.tsx');
