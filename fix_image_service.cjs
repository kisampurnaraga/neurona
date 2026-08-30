const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const oldStorageInit = `      if (!initRes.ok) {
        const err = await initRes.text().catch(() => '');
        console.warn(\`[Fal Storage] Initiate upload failed (\${initRes.status}): \${err}\`);
        return trimmed.startsWith('data:image') ? trimmed : null;
      }`;

const newStorageInit = `      if (!initRes.ok) {
        const err = await initRes.text().catch(() => '');
        console.warn(\`[Fal Storage] Initiate upload failed (\${initRes.status}): \${err}\`);
        if (initRes.status === 402 || initRes.status === 403 || err.toLowerCase().includes('exhausted balance')) {
          const keyRotator = require('./keyRotator').keyRotator;
          keyRotator.reportKeyError('fal', key, new Error(\`HTTP \${initRes.status}: \${err}\`));
          throw new Error(\`[Fal Storage] Initiate upload failed (\${initRes.status}): \${err}\`);
        }
        return trimmed.startsWith('data:image') ? trimmed : null;
      }`;

content = content.replace(oldStorageInit, newStorageInit);
fs.writeFileSync('server/imageService.ts', content);
