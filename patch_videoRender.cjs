const fs = require('fs');
let code = fs.readFileSync('server/videoRenderService.ts', 'utf8');
code = code.replace(/const falConfig = FounderService\.getFalConfig\(\) \|\| \{\};/, "const falConfig: any = FounderService.getFalConfig() || {};");
fs.writeFileSync('server/videoRenderService.ts', code);
console.log('Patched videoRenderService.ts');
