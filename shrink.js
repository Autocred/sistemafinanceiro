const fs = require('fs');

function shrink(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Tags
  content = content.replace(/padding: '6px 12px'/g, "padding: '4px 8px', fontSize: 11");
  content = content.replace(/padding: '6px 10px'/g, "padding: '4px 6px', fontSize: 11");
  
  // 2. Actions (buttons)
  content = content.replace(/fontSize: 12/g, "fontSize: 11");
  content = content.replace(/gap: 6/g, "gap: 4");
  content = content.replace(/size=\{14\}/g, "size={13}");
  content = content.replace(/size=\{15\}/g, "size={13}");
  
  // 3. Badge "Atrasado"
  content = content.replace(/padding: '2px 8px'/g, "padding: '1px 6px'");
  content = content.replace(/fontSize: 10/g, "fontSize: 9");

  // 4. Overlap fix in date
  content = content.replace(/className="lancamento-date"/g, 'className="lancamento-date" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}');

  // gap in tags
  content = content.replace(/gap: 10/g, "gap: 6");
  
  // Trash bin action button specific
  content = content.replace(/<Trash2 size=\{14\} \/>/g, "<Trash2 size={13} />");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}

shrink('src/components/Lancamentos.tsx');
shrink('src/components/LancamentosV2.tsx');
