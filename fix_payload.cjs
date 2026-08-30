const fs = require('fs');
let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

// The existing code has:
/*
  // 1. ByteDance Seedance 2.0 / 2.5
  if (modelId.startsWith('bytedance/seedance')) {
*/
content = content.replace("if (modelId.startsWith('bytedance/seedance')) {", "if (modelId.includes('seedance')) {");

// Wait, seedance 1.0 lite endpoint is `fal-ai/bytedance/seedance/v1/lite/image-to-video`.
// Let's check what it expects. In my curl it accepted `prompt` and `image_url`. 
// Does it accept `generate_audio`? Usually if it's the fal wrapped endpoint it probably does. 
// For veo3.1, it falls back to:
/*
  return {
    prompt: cleanPrompt,
    image_url: imageUrl
  };
*/
// Which works for Veo 3.1.
fs.writeFileSync('server/falModelConfig.ts', content);
