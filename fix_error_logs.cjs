const fs = require('fs');

// Fix imageService.ts
const imageServicePath = 'server/imageService.ts';
let imgContent = fs.readFileSync(imageServicePath, 'utf8');

imgContent = imgContent.replace(
  /console\.log\(`\[Google Gemini Banana Engine\] SDK notice for \$\{modelName\}: \$\{errMsg\.substring\(0, 100\)\}`\);/g,
  'console.log(`[Google Gemini Banana Engine] SDK notice for ${modelName}: Failed to authenticate or reach API.`);'
);

imgContent = imgContent.replace(
  /console\.log\(`\[Google Gemini Banana Engine\] REST notice: \$\{restErr\?\.message \|\| restErr\}`\);/g,
  'console.log(`[Google Gemini Banana Engine] REST notice: Failed to authenticate or reach API.`);'
);

fs.writeFileSync(imageServicePath, imgContent);

// Fix ttsService.ts
const ttsServicePath = 'server/ttsService.ts';
let ttsContent = fs.readFileSync(ttsServicePath, 'utf8');

ttsContent = ttsContent.replace(
  /console\.warn\(`\[TTS Service\] Gemini Flash TTS failed \(Check API Key validity\):`, geminiErr\?\.message \|\| geminiErr\);/g,
  'console.warn(`[TTS Service] Gemini Flash TTS failed (Check API Key validity)`);'
);

fs.writeFileSync(ttsServicePath, ttsContent);

console.log('Fixed error logs');
