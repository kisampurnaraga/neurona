const fs = require('fs');

let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

content = content.replace(
  "desc: hubState === 'STORYBOARDING' ? 'GATOTKACA Scene Planning' : isStoryboardReady ? '50% Selesai (Tinjau Adegan)' : 'Scene Planning',",
  "desc: hubState === 'COMPLETED' ? '100% Selesai (Video Rendered)' : hubState === 'STORYBOARDING' ? 'GATOTKACA Scene Planning' : isStoryboardReady ? '50% Selesai (Tinjau Adegan)' : 'Scene Planning',"
);

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
