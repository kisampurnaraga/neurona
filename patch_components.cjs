const fs = require('fs');

const path1 = 'src/components/AffiliateConfigModal.tsx';
if (fs.existsSync(path1)) {
  let content = fs.readFileSync(path1, 'utf8');
  if (content.includes('<Film') && !content.includes('Film,')) {
    content = content.replace(/import \{ (.*?) \} from 'lucide-react';/, "import { $1, Film } from 'lucide-react';");
  }
  fs.writeFileSync(path1, content);
}

const path2 = 'src/components/StoryboardMatrixModal.tsx';
if (fs.existsSync(path2)) {
  let content = fs.readFileSync(path2, 'utf8');
  if (content.includes('<Plus') && !content.includes('Plus,')) {
    content = content.replace(/import \{ (.*?) \} from 'lucide-react';/, "import { $1, Plus } from 'lucide-react';");
  }
  fs.writeFileSync(path2, content);
}
