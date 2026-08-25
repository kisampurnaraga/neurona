const fs = require('fs');

const path = 'src/components/HolographicHudNode.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import { getProjectAspectRatioClass }")) {
  content = content.replace(
    /import \{ VideoPreviewPlayer \} from '\.\/VideoPreviewPlayer';/,
    "import { VideoPreviewPlayer } from './VideoPreviewPlayer';\nimport { getProjectAspectRatioClass } from '../utils/aspectRatio';"
  );
}

content = content.replace(
  /<VideoPreviewPlayer/g,
  '<VideoPreviewPlayer className={getProjectAspectRatioClass(project)}'
);

fs.writeFileSync(path, content);
