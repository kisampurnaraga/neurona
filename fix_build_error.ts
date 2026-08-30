import * as fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Fix rawT2I
content = content.replace(
    /const rawT2I = \(params\.scene\.promptTextToImage \|\| ''\)\.trim\(\);\n    if \(params\.videoType === 'AFFILIATE' \|\| params\.videoType === 'BRAND_COMMERCIAL'\) \{\n        return rawT2I;\n    \}\n    const \{ scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig \} = params;\n    const rawT2I = \(scene\.promptTextToImage \|\| ''\)\.trim\(\);/,
    `const { scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig } = params;
    const rawT2I = (scene.promptTextToImage || '').trim();
    if (videoType === 'AFFILIATE' || videoType === 'BRAND_COMMERCIAL') {
        return rawT2I;
    }`
);

// Fix rawI2V
content = content.replace(
    /const rawI2V = \(params\.scene\.promptImageToVideo \|\| ''\)\.trim\(\);\n    if \(params\.videoType === 'AFFILIATE' \|\| params\.videoType === 'BRAND_COMMERCIAL'\) \{\n        return rawI2V;\n    \}\n    const \{ scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig \} = params;\n    const rawI2V = ImageGenerationService\.sanitizeNegativePhrasesFromPositivePrompt\(scene\.promptImageToVideo \|\| ''\);/,
    `const { scene, sceneIndex = 0, videoType, characterProfile, artStyle, affiliateConfig, animationConfig, educationalConfig } = params;
    const rawI2V = ImageGenerationService.sanitizeNegativePhrasesFromPositivePrompt(scene.promptImageToVideo || '');
    if (videoType === 'AFFILIATE' || videoType === 'BRAND_COMMERCIAL') {
        return rawI2V;
    }`
);

fs.writeFileSync('server/imageService.ts', content);
console.log("Fixed redeclaration errors");
