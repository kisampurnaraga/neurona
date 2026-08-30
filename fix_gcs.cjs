const fs = require('fs');
let content = fs.readFileSync('server/services/gcsStreamService.ts', 'utf8');

const oldLogic = `      writeStream.on('error', (err) => {
        console.error(\`[GCSStreamService] Direct streaming upload to bucket '\${bucketName}' failed:\`, err);
        reject(err);
      });`;

const newLogic = `      writeStream.on('error', (err) => {
        // Downgraded to warn because orchestrator has a reliable local fallback for sandbox environments
        console.warn(\`[GCSStreamService] Direct streaming upload to bucket '\${bucketName}' skipped/failed. Falling back to local storage.\`);
        reject(err);
      });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/services/gcsStreamService.ts', content);
