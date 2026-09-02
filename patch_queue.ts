import fs from 'fs';
let content = fs.readFileSync('server/services/queueService.ts', 'utf8');
content = content.replace('const falPayload = buildFalPayload(', 'const falPayload = await buildFalPayload(');
fs.writeFileSync('server/services/queueService.ts', content);
