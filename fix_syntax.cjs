const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

code = code.replace(/};\s*};\s*if \(\!isOpen \|\| \!project\) return null;/m, '};\n\n  if (!isOpen || !project) return null;');

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
console.log('REPLACED WITH REGEX');
