const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace("await keyRotator.getFalKey()", "await keyRotator.getNextFalKey()");

fs.writeFileSync('server.ts', content);
