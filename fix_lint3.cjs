const fs = require('fs');
function fixTrailingComma(filepath, iconName) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(new RegExp(`  ${iconName},\\n} from 'lucide-react';`, 'g'), `} from 'lucide-react';`); // revert
  content = content.replace(/} from 'lucide-react';/, `, ${iconName} } from 'lucide-react';`);
  fs.writeFileSync(filepath, content);
}
fixTrailingComma('src/components/AffiliateConfigModal.tsx', 'Film');
fixTrailingComma('src/components/StoryboardMatrixModal.tsx', 'Plus');
