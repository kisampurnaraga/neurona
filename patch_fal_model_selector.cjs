const fs = require('fs');
let code = fs.readFileSync('server/videoRenderService.ts', 'utf8');

// Find the line where candidateModels is defined
const candidateStart = code.indexOf('const candidateModels = imageUrl');

if (candidateStart !== -1) {
  const replaceStr = `  const falConfig = FounderService.customFalConfig || {};
  let selectedModel = falConfig.model || '';
  if (selectedModel && imageUrl && !selectedModel.includes('image-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/image-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/image-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video/image-to-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/image-to-video';
    else selectedModel = selectedModel + '/image-to-video';
  } else if (selectedModel && !imageUrl && !selectedModel.includes('text-to-video')) {
    if (selectedModel === 'fal-ai/wan-v2.1') selectedModel = 'fal-ai/wan/v2.1/text-to-video';
    else if (selectedModel === 'fal-ai/kling-1.5') selectedModel = 'fal-ai/kling-video/v1.5/pro/text-to-video';
    else if (selectedModel === 'fal-ai/minimax-h3') selectedModel = 'fal-ai/minimax-video';
    else if (selectedModel === 'fal-ai/hunyuan-video') selectedModel = 'fal-ai/hunyuan-video/text-to-video';
    else selectedModel = selectedModel + '/text-to-video';
  }

  const candidateModels = selectedModel ? [selectedModel] : (imageUrl
`;
  
  // Replace `const candidateModels = imageUrl` with the new logic
  code = code.replace("const candidateModels = imageUrl", replaceStr);
  
  // Add closing bracket for the fallback ternary
  const defaultModelsStr = `      ];`;
  code = code.replace(`        'fal-ai/veo3.1/fast'
      ];`, `        'fal-ai/veo3.1/fast'
      ]);`);
      
  fs.writeFileSync('server/videoRenderService.ts', code);
  console.log('Patched candidateModels in videoRenderService!');
}
