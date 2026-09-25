const fs = require('fs');
const glob = require('glob'); // Not available? We can just manually list files.

const filesToPatch = [
  'src/components/Dashboard.tsx',
  'src/components/DashboardMensal.tsx',
  'src/components/Relatorios.tsx',
  'src/components/MetasGamificadasV2.tsx',
  'src/components/Lancamentos.tsx',
  'src/components/LancamentosV2.tsx',
  'src/app/page.tsx',
  'src/components/Sidebar.tsx'
];

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace primary blues with var(--primary)
  content = content.replace(/#3b82f6/gi, 'var(--primary)');
  content = content.replace(/#2563eb/gi, 'var(--primary)');
  content = content.replace(/#1d4ed8/gi, 'var(--primary-dark)');
  content = content.replace(/#0284c7/gi, 'var(--primary)');
  content = content.replace(/#0369a1/gi, 'var(--primary-dark)');

  // Replace secondary purples/cyans with var(--primary)
  content = content.replace(/#8b5cf6/gi, 'var(--primary)');
  content = content.replace(/#9333ea/gi, 'var(--primary)');
  content = content.replace(/#7e22ce/gi, 'var(--primary-dark)');

  // Fix RGB transparent blues
  content = content.replace(/rgba\(59,\s*130,\s*246,\s*0\.3\)/gi, 'rgba(0, 0, 0, 0.2)');
  content = content.replace(/rgba\(59,\s*130,\s*246,\s*0\.1\)/gi, 'var(--bg-secondary)');

  // Replace hardcoded '--blue' with '--primary' just in case
  // content = content.replace(/var\(--blue\)/gi, 'var(--primary)'); 
  
  // Dashboard Mensal specific COLORS array
  if (filePath.includes('DashboardMensal.tsx')) {
    content = content.replace(/const COLORS = \[/g, 'const COLORS = [\n      \'var(--primary)\', \'var(--primary-hover)\', \'var(--primary-dark)\', \'#f59e0b\', \'#10b981\', \'#ef4444\',\n    //');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched', filePath);
}

filesToPatch.forEach(patchFile);
