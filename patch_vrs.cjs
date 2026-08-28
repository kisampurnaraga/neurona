const fs = require('fs');
let code = fs.readFileSync('server/videoRenderService.ts', 'utf8');

const targetStr = `  if (selectedModel && imageUrl && !selectedModel.includes('image-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/image-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/image-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video/image-to-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/image-to-video';
    else selectedModel = selectedModel + '/image-to-video';`;

const replaceStr = `  if (selectedModel && imageUrl && !selectedModel.includes('image-to-video') && !selectedModel.includes('reference-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/image-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/image-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video/image-to-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/image-to-video';
    else if (selectedModel === 'fal-ai/seedance-2.5' || selectedModel === 'bytedance/seedance-2.5') selectedModel = 'bytedance/seedance-2.5/reference-to-video';
    else if (selectedModel === 'fal-ai/seedance-2.0' || selectedModel === 'bytedance/seedance-2.0') selectedModel = 'bytedance/seedance-2.0/reference-to-video';
    else selectedModel = selectedModel + '/image-to-video';`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('server/videoRenderService.ts', code);
  console.log('Patched videoRenderService.ts for seedance mapping');
} else {
  console.log('Target string not found');
}
