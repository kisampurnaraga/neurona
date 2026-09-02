import fs from 'fs';
let content = fs.readFileSync('server/falLiveTester.ts', 'utf8');
content = content.replace('const payload = buildFalPayload(', 'const payload = await buildFalPayload(');
fs.writeFileSync('server/falLiveTester.ts', content);
