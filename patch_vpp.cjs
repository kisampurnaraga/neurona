const fs = require('fs');
const path = 'src/components/VideoPreviewPlayer.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /className=\{`relative aspect-video w-full/g,
  'className={`relative ${className || \'aspect-video\'} w-full'
);
// Also need to remove ${className} from the end since we put it at the beginning
content = content.replace(
  /\$\{className\}`\}/g,
  '`}'
);

fs.writeFileSync(path, content);
