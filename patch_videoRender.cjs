const fs = require('fs');
let code = fs.readFileSync('server/videoRenderService.ts', 'utf8');

const targetStr = `          } else if (modelPath.includes('veo')) {`;
const replaceStr = `          } else if (modelPath.includes('seedance')) {
            return imageUrl
              ? { prompt: basePrompt, image_url: imageUrl, images: [{ url: imageUrl }] }
              : { prompt: basePrompt };
          } else if (modelPath.includes('veo')) {`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('server/videoRenderService.ts', code);
  console.log('Patched videoRenderService.ts for seedance');
} else {
  console.log('Target string not found');
}
