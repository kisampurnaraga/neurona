const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

const oldLogic = `const safeVideoSrc = (!isExplicitImageInVideo && scene.videoUrl && (scene.videoUrl.endsWith('.mp4') || scene.videoUrl.endsWith('.webm') || scene.videoUrl.includes('/videos/') || scene.videoUrl.includes('/sample/') || scene.videoUrl.startsWith('data:video/')))
                              ? scene.videoUrl
                              : '/api/videos/sample-ocean.mp4';`;

const newLogic = `const safeVideoSrc = (!isExplicitImageInVideo && scene.videoUrl)
                              ? scene.videoUrl
                              : '/api/videos/sample-ocean.mp4';`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
