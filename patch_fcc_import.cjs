const fs = require('fs');
const file = 'src/server/fcc/FounderService.ts';
let code = fs.readFileSync(file, 'utf8');

code = "import fs from 'fs';\nimport path from 'path';\nimport { randomUUID } from 'crypto';\n" + code;
fs.writeFileSync(file, code);
