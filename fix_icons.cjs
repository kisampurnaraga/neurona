const fs = require('fs');

let content = fs.readFileSync('src/components/FounderDashboard.tsx', 'utf8');

// The previous import replacement probably failed if lucide-react had multiple line imports.
// Let's just add it explicitly.
if (!content.includes('import { Settings }')) {
  content = content.replace("import {", "import { Settings, Film,");
}

fs.writeFileSync('src/components/FounderDashboard.tsx', content);
console.log('Fixed icon imports');
