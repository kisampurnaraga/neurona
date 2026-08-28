const fs = require('fs');
let code = fs.readFileSync('src/server/diagnostics.ts', 'utf8');
code = code.replace("import { keyRotator } from './keyRotator';", "");
fs.writeFileSync('src/server/diagnostics.ts', code);
