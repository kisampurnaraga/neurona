const fs = require('fs');
let code = fs.readFileSync('server/videoRenderService.ts', 'utf8');

const oldBodyStr = `body: JSON.stringify({
          prompt: prompt.substring(0, 500),
          image_url: imageUrl || undefined,
          duration: '5',
          aspect_ratio: '16:9'
        })`;

const newBodyStr = `body: JSON.stringify((() => {
          const basePrompt = prompt.substring(0, 500);
          if (modelPath.includes('kling')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl, duration: "5" } 
              : { prompt: basePrompt, duration: "5", aspect_ratio: "16:9" };
          } else if (modelPath.includes('luma') || modelPath.includes('ray')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else if (modelPath.includes('wan')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else if (modelPath.includes('minimax')) {
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt };
          } else if (modelPath.includes('veo')) {
            return imageUrl
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          } else {
            // Default generic fallback
            return imageUrl 
              ? { prompt: basePrompt, image_url: imageUrl }
              : { prompt: basePrompt, aspect_ratio: "16:9" };
          }
        })())`;

if (code.includes(oldBodyStr)) {
  code = code.replace(oldBodyStr, newBodyStr);
  fs.writeFileSync('server/videoRenderService.ts', code);
  console.log('Patched fal payload!');
} else {
  console.log('oldBodyStr not found!');
}
