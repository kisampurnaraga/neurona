const fs = require('fs');
const content = fs.readFileSync('server/llmService.ts', 'utf8');

const targetStr = `promptImageToVideo: s.promptImageToVideo || s.promptTextToImage || '',`;
const replacementStr = `promptImageToVideo: s.promptImageToVideo || s.promptTextToImage || '',
              visualStyle: s.visualStyle,
              styleKeywords: s.styleKeywords || [],
              featuresProduct: s.featuresProduct || false,
              backgroundLock: s.backgroundLock || 'free',
              location: s.location || '',`;

let newContent = content.split(targetStr).join(replacementStr);

fs.writeFileSync('server/llmService.ts', newContent);
console.log("Map patched successfully");
