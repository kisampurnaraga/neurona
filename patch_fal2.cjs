const fs = require('fs');
let code = fs.readFileSync('src/server/providers/FalVideoAdapter.ts', 'utf8');

const targetStr = `             } else if (statusJson.status === 'IN_PROGRESS' || statusJson.status === 'IN_QUEUE') {
                 console.log(\`[FAL.AI] \${requestId} status: \${statusJson.status} (Attempt \${attempts})\`);
             } else {`;

const replaceStr = `             } else if (statusJson.status === 'IN_PROGRESS' || statusJson.status === 'IN_QUEUE') {
                 console.log(\`[FAL.AI] \${requestId} status: \${statusJson.status} (Attempt \${attempts})\`);
                 if (onProgress) onProgress(statusJson.status);
             } else {`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server/providers/FalVideoAdapter.ts', code);
  console.log('Patched FalVideoAdapter.ts for onProgress');
} else {
  console.log('Target string not found');
}
