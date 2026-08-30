const fs = require('fs');
const content = fs.readFileSync('server/llmService.ts', 'utf8');

const newContent = content.replace(
  '"visualStyle": "\\${videoType === \\\'AFFILIATE\\\' ? \\\'ugc\\\' : \\\'studio\\\'}"', 
  '"visualStyle": "${videoType === \\\'AFFILIATE\\\' ? \\\'ugc\\\' : \\\'studio\\\'}"'
);

fs.writeFileSync('server/llmService.ts', newContent);
console.log("Unescaped visualStyle variable");
