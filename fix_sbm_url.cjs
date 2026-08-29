const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

content = content.replace(
  'setFinalVideoUrl(data.url);',
  'setFinalVideoUrl(data.finalVideoUrl || data.url);'
);

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
