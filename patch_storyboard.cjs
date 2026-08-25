const fs = require('fs');

const path = 'src/components/StoryboardMatrixModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /onError=\{\(e\) => \{\s*\(e\.target as HTMLImageElement\)\.src = `https:\/\/images\.unsplash\.com\/[^`]+`;\s*\}\}/g,
  ''
);

fs.writeFileSync(path, content);
console.log('Patched StoryboardMatrixModal.tsx');
