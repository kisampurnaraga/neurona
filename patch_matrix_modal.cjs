const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

// The block to remove:
const regex1 = /\{\/\* Pilihan Gaya Subtitle \*\/\}[\s\S]*?<\/div>\s*<\/div>/g;

content = content.replace(regex1, '</div>');

// Update onApproveAndPay(videoCreditsTotal, subtitleStyle)
// Wait, there are multiple occurrences (one for desktop, one for mobile layout maybe?)
content = content.replace(/onApproveAndPay\(videoCreditsTotal, subtitleStyle\)/g, "onApproveAndPay(videoCreditsTotal, undefined)");

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
