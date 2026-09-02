import fs from 'fs';

let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');
content = content.replace('export function buildNanoBananaPayload', 'export async function buildNanoBananaPayload');
content = content.replace('export function buildFalImagePayload', 'export async function buildFalImagePayload');
content = content.replace('const nanoPayload = buildNanoBananaPayload(', 'const nanoPayload = await buildNanoBananaPayload(');
content = content.replace('const payload = buildFalImagePayload(', 'const payload = await buildFalImagePayload(');
content = content.replace('return buildFluxSchnellPayload', 'return buildFluxSchnellPayload'); // Schnell doesn't use sanitizedUrls
content = content.replace('return buildNanoBananaPayload', 'return await buildNanoBananaPayload');
fs.writeFileSync('server/falModelConfig.ts', content);

let imgService = fs.readFileSync('server/imageService.ts', 'utf8');
imgService = imgService.replace('const falPayload = buildFalImagePayload(', 'const falPayload = await buildFalImagePayload(');
fs.writeFileSync('server/imageService.ts', imgService);
