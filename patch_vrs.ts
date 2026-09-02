import fs from 'fs';

let content = fs.readFileSync('server/videoRenderService.ts', 'utf8');

content = content.replace('const payload = buildFalPayload(', 'const payload = await buildFalPayload(');
fs.writeFileSync('server/videoRenderService.ts', content);
