const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

const targetStr = `<span>Video: {scene.videoStatus === 'FAILED' ? 'GAGAL (COBA LAGI)' : isVideoGenerating ? 'RENDERING...' : (scene.videoStatus || 'PENDING')}</span>`;
const replaceStr = `<span>Video: {scene.videoStatus === 'FAILED' ? 'GAGAL (COBA LAGI)' : isVideoGenerating ? (scene.videoProgress ? \`RENDERING... (\${scene.videoProgress})\` : 'RENDERING...') : (scene.videoStatus || 'PENDING')}</span>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('Patched StoryboardMatrixModal.tsx');
} else {
  console.log('Target string not found in StoryboardMatrixModal.tsx');
}
