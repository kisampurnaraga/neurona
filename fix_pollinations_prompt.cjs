const fs = require('fs');
const filePath = 'server/imageService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the string
content = content.replace(
  /const sanitizedPrompt = encodeURIComponent\(finalPrompt\.substring\(0, 500\)\.replace\(\/\[\^a-zA-Z0-9 ,\.-\]\/g, ' '\)\);/g,
  "const sanitizedPrompt = encodeURIComponent(finalPrompt.substring(0, 1500));"
);

fs.writeFileSync(filePath, content);
console.log('Fixed prompt truncation');
