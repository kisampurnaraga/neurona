import * as fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Patch buildT2IImagePrompt
content = content.replace(
    /public static buildT2IImagePrompt\(params: \{([\s\S]*?)\}\): string \{/,
    `public static buildT2IImagePrompt(params: {$1}): string {
    const rawT2I = (params.scene.promptTextToImage || '').trim();
    if (params.videoType === 'AFFILIATE' || params.videoType === 'BRAND_COMMERCIAL') {
        return rawT2I;
    }
`
);

// Patch buildI2VVideoPrompt
content = content.replace(
    /public static buildI2VVideoPrompt\(params: \{([\s\S]*?)\}\): string \{/,
    `public static buildI2VVideoPrompt(params: {$1}): string {
    const rawI2V = (params.scene.promptImageToVideo || '').trim();
    if (params.videoType === 'AFFILIATE' || params.videoType === 'BRAND_COMMERCIAL') {
        return rawI2V;
    }
`
);

fs.writeFileSync('server/imageService.ts', content);
console.log("Patched build methods in imageService.ts");
