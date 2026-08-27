const fs = require('fs');

const file = 'src/components/StoryboardMatrixModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const searchStr = `  const currentEngineOption = IMAGE_MODEL_OPTIONS.find(m => m.id === selectedImageEngine) || IMAGE_MODEL_OPTIONS[0];
  const singleImageCost = currentEngineOption.costPerImage;
  const imageCreditsTotal = scenes.length * singleImageCost;
  const videoCreditsTotal = project.storyboard?.totalVideoCredits || (scenes.length * 15) || 60;`;

const replaceStr = `  const currentEngineOption = IMAGE_MODEL_OPTIONS.find(m => m.id === selectedImageEngine) || IMAGE_MODEL_OPTIONS[0];
  const currentVideoEngineOption = VIDEO_MODEL_OPTIONS.find(m => m.id === selectedVideoEngine) || VIDEO_MODEL_OPTIONS[0];
  const singleImageCost = currentEngineOption.costPerImage;
  const singleVideoCost = currentVideoEngineOption.costPerVideo;
  const imageCreditsTotal = scenes.length * singleImageCost;
  const videoCreditsTotal = scenes.length * singleVideoCost;`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync(file, code);
