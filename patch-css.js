const fs = require('fs');

let css = fs.readFileSync('src/app/globals.css', 'utf8');
css = css.replace(/\.grid-responsive-3 \{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\);\s*gap: 12px;\s*\}/, 
`.grid-responsive-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 12px;
}`);

// Also fix grid-responsive-4 to be smaller if it exists
css = css.replace(/\.grid-responsive-4 \{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\);\s*gap: 16px;\s*\}/, 
`.grid-responsive-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 16px;
}`);

fs.writeFileSync('src/app/globals.css', css);
console.log('Fixed CSS minmax for responsive grids');
