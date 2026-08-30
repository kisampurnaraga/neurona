import fs from 'fs';
let content = fs.readFileSync('server/llmService.ts', 'utf8');

const regex = /1\. PACING[\s\S]*?(?=2\. VISUAL STYLE)/g;

const replacement = `1. PACING (CRITICAL LIMIT): Voiceover MAX 2 words/second. 3s scene = MAX 6 words. 4s scene = MAX 8 words. WRITE SHORT, PUNCHY, COMPLETE SENTENCES. Do NOT write long sentences that will get cut off! Ex: 'Bass gahar TWS BassKing!' (4 words). NOT: 'Nikmati bass gahar dengan TWS BassKing yang tahan hingga 24 jam' (11 words - too long for 4s).\n`;

content = content.replace(regex, replacement);

fs.writeFileSync('server/llmService.ts', content);
console.log("Updated SINTA pacing instructions in llmService.ts");
