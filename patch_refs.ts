import fs from 'fs';

let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');
content = content.replace('const sanitizedUrls = sanitizeReferenceImageUrls(params.imageUrls);', 'const sanitizedUrls = await sanitizeReferenceImageUrls(params.imageUrls);');
// Make sure the function that calls it is async:
// It's likely buildFluxProPayload or similar?
if (content.includes('export function build')) {
  // We need to check if the caller is async.
}
fs.writeFileSync('server/falModelConfig.ts', content);

let imgService = fs.readFileSync('server/imageService.ts', 'utf8');
imgService = imgService.replace('referenceImageUrls = sanitizeReferenceImageUrls(referenceImageUrls);', 'referenceImageUrls = await sanitizeReferenceImageUrls(referenceImageUrls);');
fs.writeFileSync('server/imageService.ts', imgService);
