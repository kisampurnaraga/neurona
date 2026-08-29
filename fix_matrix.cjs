const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

// I will just fix the JSX structure by hand for the Tier 3 card
// Let's find "Tier 3: Full Video Render Master"
let startIndex = content.indexOf('{/* TIER 3: Full Video Render Master */}');
let endIndex = content.indexOf('{/* Modal Footer: Balance & Multi-Stage Action Controls */}');
if (startIndex !== -1 && endIndex !== -1) {
  let block = content.substring(startIndex, endIndex);
  
  // Clean block: remove the whole Pilihan Gaya Subtitle div
  block = block.replace(/\{\/\*\s*Pilihan Gaya Subtitle\s*\*\/\}[\s\S]*?(?=<\/div>\s*<button)/, '');
  
  content = content.substring(0, startIndex) + block + content.substring(endIndex);
}

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
