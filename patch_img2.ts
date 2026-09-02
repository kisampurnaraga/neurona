import fs from 'fs';

let imgService = fs.readFileSync('server/imageService.ts', 'utf8');
imgService = imgService.replace('const payload = buildFalImagePayload(', 'const payload = await buildFalImagePayload(');
fs.writeFileSync('server/imageService.ts', imgService);
