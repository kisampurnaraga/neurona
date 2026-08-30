const fs = require('fs');

function replaceInFile(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content);
}

replaceInFile(
  'src/components/HolographicHudNode.tsx', 
  `s.videoUrl.endsWith('.mp4') || s.videoUrl.endsWith('.webm') || s.videoUrl.includes('/videos/') || s.videoUrl.startsWith('data:video/')`, 
  `!s.videoUrl.startsWith('data:image/')`
);

replaceInFile(
  'src/App.tsx', 
  `s.videoUrl.endsWith('.mp4') || s.videoUrl.endsWith('.webm') || s.videoUrl.includes('/videos/') || s.videoUrl.startsWith('data:video/')`, 
  `!s.videoUrl.startsWith('data:image/')`
);

replaceInFile(
  'src/server/providers/VideoProvider.ts', 
  `scene.videoUrl.endsWith('.mp4') || scene.videoUrl.endsWith('.webm') || scene.videoUrl.includes('/sample/') || scene.videoUrl.startsWith('data:video/')`, 
  `!scene.videoUrl.startsWith('data:image/')`
);
