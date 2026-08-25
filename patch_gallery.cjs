const fs = require('fs');
const path = 'src/components/GalleryModal.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import { getProjectAspectRatioClass }")) {
  content = content.replace(
    /import \{ ProductionProject \} from '\.\.\/shared\/types';/,
    "import { ProductionProject } from '../shared/types';\nimport { getProjectAspectRatioClass } from '../utils/aspectRatio';"
  );
}

content = content.replace(
  /className="aspect-video bg-black relative flex items-center justify-center overflow-hidden"/g,
  'className={`bg-black relative flex items-center justify-center overflow-hidden ${getProjectAspectRatioClass(project)}`}'
);

fs.writeFileSync(path, content);
