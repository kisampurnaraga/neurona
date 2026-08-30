const fs = require('fs');

let content = fs.readFileSync('server/imageService.ts', 'utf8');

const oldLogic = `if (rawEngine.includes('gemini') || rawEngine.includes('imagen') || rawEngine.includes('banana')) {`;
const newLogic = `if (rawEngine.includes('gemini') || rawEngine.includes('imagen')) {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/imageService.ts', content);
