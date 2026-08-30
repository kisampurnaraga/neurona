const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Add nano-asli to Gemini routing
const oldRouting = `    } else if (preferredEngine === 'gemini-imagen-3' || preferredEngine === 'gemini-banana') {`;
const newRouting = `    } else if (preferredEngine === 'gemini-imagen-3' || preferredEngine === 'gemini-banana' || preferredEngine === 'nano-asli') {`;
content = content.replace(oldRouting, newRouting);

// Map veo-asli to video engine? Let's check FalVideoAdapter.ts and workerRoute.ts
fs.writeFileSync('server/imageService.ts', content);
