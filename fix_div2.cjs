const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

// Use regex to match multiple spaces
content = content.replace(/<\/div>\s*<\/div>\s*<button/g, "</div>\n                <button");

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
