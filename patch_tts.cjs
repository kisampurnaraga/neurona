const fs = require('fs');
let content = fs.readFileSync('server/ttsService.ts', 'utf8');

// Replace model name
content = content.replace(/model: 'gemini-3\.1-flash-tts-preview',/, "model: 'gemini-2.5-flash',");

fs.writeFileSync('server/ttsService.ts', content);
console.log('Patched ttsService');
