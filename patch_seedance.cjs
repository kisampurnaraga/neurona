const fs = require('fs');
let code1 = fs.readFileSync('server/videoRenderService.ts', 'utf8');

const target1 = `            } else if (modelPath.includes('seedance')) {
              return imageUrl
                ? { prompt: basePrompt, image_url: imageUrl, images: [{ url: imageUrl }] }
                : { prompt: basePrompt };`;

const replace1 = `            } else if (modelPath.includes('seedance')) {
              return imageUrl
                ? { prompt: basePrompt + " @Image1", reference_images: [imageUrl] }
                : { prompt: basePrompt };`;

if (code1.includes(target1)) {
  code1 = code1.replace(target1, replace1);
  fs.writeFileSync('server/videoRenderService.ts', code1);
  console.log('Patched videoRenderService.ts');
}

let code2 = fs.readFileSync('src/server/providers/FalVideoAdapter.ts', 'utf8');

if (code2.includes(target1)) {
  code2 = code2.replace(target1, replace1);
  fs.writeFileSync('src/server/providers/FalVideoAdapter.ts', code2);
  console.log('Patched FalVideoAdapter.ts');
}
