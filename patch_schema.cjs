const fs = require('fs');
const content = fs.readFileSync('server/llmService.ts', 'utf8');

const target1 = `                        backgroundLock: { type: Type.STRING },
                        location: { type: Type.STRING }
                      }`;
const replacement1 = `                        backgroundLock: { type: Type.STRING },
                        location: { type: Type.STRING },
                        visualStyle: { type: Type.STRING }
                      }`;
let newContent = content.split(target1).join(replacement1);

const target2 = `                      backgroundLock: { type: Type.STRING },
                      location: { type: Type.STRING }
                    }`;
const replacement2 = `                      backgroundLock: { type: Type.STRING },
                      location: { type: Type.STRING },
                      visualStyle: { type: Type.STRING }
                    }`;
newContent = newContent.split(target2).join(replacement2);

// Let's also completely remove the bad prompt rule
const badRule = `3. DUAL VISUAL LOCK & ACTION-DRIVEN ANCHORS DI PROMPT PER ADEGAN:
- Di dalam field \`promptTextToImage\` dan \`promptImageToVideo\` (I2V), gunakan struktur Action-Driven Anchor di 20 token pertama:
  "Photorealistic 35mm commercial photo of hands holding [Detail Produk] at chest level, presented by [Detail Model], medium close-up product shot, 50mm lens f/2.8, authentic skin texture, clean dark studio backdrop, cool blue accent edge lighting, sharp focus, 8k resolution"`;

const newRule = `3. DUAL VISUAL LOCK & ACTION-DRIVEN ANCHORS DI PROMPT PER ADEGAN:
- Di dalam field \`promptTextToImage\` dan \`promptImageToVideo\` (I2V), gunakan struktur yang konsisten. JIKA visualStyle="ugc", gunakan gaya kamera HP (misal: "Selfie perspective, shot on iPhone 15..."). JIKA visualStyle="studio", gunakan DSLR (misal: "35mm DSLR, clean dark studio backdrop, 50mm lens...").`;

newContent = newContent.replace(badRule, newRule);

fs.writeFileSync('server/llmService.ts', newContent);
console.log("Schema patched successfully");
