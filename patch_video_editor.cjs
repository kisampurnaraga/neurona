const fs = require('fs');
let code = fs.readFileSync('server/VideoEditor.ts', 'utf-8');

const targetCode = `        const url = (scene.videoUrl || scene.assetUrl) as string;`;
const replacementCode = `        const url = (scene.falUrl || scene.remoteVideoUrl || scene.videoUrl) as string;
        if (!url) {
           throw new Error(\`Video untuk adegan \${i + 1} belum dirender atau belum selesai.\`);
        }`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/VideoEditor.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
