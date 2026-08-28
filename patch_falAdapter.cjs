const fs = require('fs');
let code = fs.readFileSync('src/server/providers/FalVideoAdapter.ts', 'utf8');

const targetStr = `      else if (selectedModel === 'bytedance/seedance-2.5') selectedModel = 'bytedance/seedance-2.5/reference-to-video';
      else if (selectedModel === 'bytedance/seedance-2.0') selectedModel = 'bytedance/seedance-2.0/reference-to-video';`;

const replaceStr = `      else if (selectedModel === 'bytedance/seedance-2.5' || selectedModel === 'fal-ai/seedance-2.5') selectedModel = 'bytedance/seedance-2.5/reference-to-video';
      else if (selectedModel === 'bytedance/seedance-2.0' || selectedModel === 'fal-ai/seedance-2.0') selectedModel = 'bytedance/seedance-2.0/reference-to-video';`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server/providers/FalVideoAdapter.ts', code);
  console.log('Patched FalVideoAdapter.ts for seedance mapping');
} else {
  console.log('Target string not found');
}
