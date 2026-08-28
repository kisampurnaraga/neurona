const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace all occurrences of "import {\n  Activity, " with "import { "
code = code.replace(/import \{\n  Activity, /g, 'import { ');
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed imports in App.tsx');
