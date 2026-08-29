const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

content = content.replace("                </div>\n                </div>\n                <button", "                </div>\n                <button");

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
