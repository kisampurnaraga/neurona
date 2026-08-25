const fs = require('fs');

// Patch FounderService.ts (or wherever it gets the key)
const imagePath = 'server/imageService.ts';
if (fs.existsSync(imagePath)) {
  let content = fs.readFileSync(imagePath, 'utf8');
  content = content.replace(/process\.env\.GEMINI_API_KEY/g, "(process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY)");
  fs.writeFileSync(imagePath, content);
}

const ttsPath = 'server/ttsService.ts';
if (fs.existsSync(ttsPath)) {
  let content = fs.readFileSync(ttsPath, 'utf8');
  content = content.replace(/process\.env\.GEMINI_API_KEY/g, "(process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY)");
  fs.writeFileSync(ttsPath, content);
}

console.log('Patched for manual key');
