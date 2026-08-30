import * as fs from 'fs';
let content = fs.readFileSync('server/imageService.ts', 'utf8');

// 1. Remove the short-circuit in T2I
content = content.replace(
    /    const earlyT2I = \(params\.scene\.promptTextToImage \|\| ''\)\.trim\(\);\n    if \(params\.videoType === 'AFFILIATE' \|\| params\.videoType === 'BRAND_COMMERCIAL'\) \{\n        return earlyT2I;\n    \}\n/,
    ""
);

// 2. Remove the short-circuit in I2V
content = content.replace(
    /    const earlyI2V = \(params\.scene\.promptImageToVideo \|\| ''\)\.trim\(\);\n    if \(params\.videoType === 'AFFILIATE' \|\| params\.videoType === 'BRAND_COMMERCIAL'\) \{\n        return earlyI2V;\n    \}\n/,
    ""
);

// 3. Fix the "35mm DSLR" in T2I when !featuresProduct
content = content.replace(
    /promptParts\.push\(\`Photorealistic 35mm DSLR portrait of \$\{charSubjectEn \|\| 'the creator'\}, authentic human skin texture with pores, showing \$\{sanitizedText\}\`\);/,
    "promptParts.push(`${sanitizedText}`);"
);
content = content.replace(
    /promptParts\.push\(\`Photorealistic 35mm DSLR lifestyle portrait of \$\{charSubjectEn \|\| 'the creator'\}, authentic human skin texture with pores, expressive face showing \$\{sceneActionEn \|\| 'candid authentic emotion'\}, natural ambient lighting\`\);/,
    "promptParts.push(`Cinematic lifestyle shot: ${sceneActionEn || 'candid authentic emotion'}`);"
);

fs.writeFileSync('server/imageService.ts', content);
console.log("Restored full prompt assembly but fixed 35mm DSLR hardcoding.");
