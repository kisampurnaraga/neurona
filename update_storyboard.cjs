const fs = require('fs');
let path = 'src/components/StoryboardMatrixModal.tsx';
let c = fs.readFileSync(path, 'utf8');

// Replace video object-cover to object-contain inside the media preview box
c = c.replace(/className="w-full h-full object-cover"/g, 'className="w-full h-full object-contain"');

fs.writeFileSync(path, c);
