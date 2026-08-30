const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const oldThrow = `          throw new Error(\`[Fal Storage] Initiate upload failed (\${initRes.status}): \${err}\`);`;
const newThrow = `          throw new Error(\`[NANO_QUOTA_EXHAUSTED] [Fal Storage] Initiate upload failed (\${initRes.status}): \${err}\`);`;

content = content.replace(oldThrow, newThrow);
fs.writeFileSync('server/imageService.ts', content);
