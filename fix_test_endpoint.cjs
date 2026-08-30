const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace("const keyRotator = require('./server/keyRotator').keyRotator;", "const keyRotator = (await import('./server/keyRotator.ts')).keyRotator;");

fs.writeFileSync('server.ts', content);
