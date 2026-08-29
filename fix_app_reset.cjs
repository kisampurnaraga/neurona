const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'onOpenAudioStudio={() => {',
  'onResetProject={() => { setProject(null); setProjectId(null); setIsStoryboardMatrixOpen(false); }}\n            onOpenAudioStudio={() => {'
);

fs.writeFileSync('src/App.tsx', content);
