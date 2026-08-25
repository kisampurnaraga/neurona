const fs = require('fs');

const path = 'src/components/VideoTimeline.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import { getProjectAspectRatioClass }")) {
  content = content.replace(
    /import type { ProductionProject, Scene } from '..\/shared\/types';/,
    "import type { ProductionProject, Scene } from '../shared/types';\nimport { getProjectAspectRatioClass } from '../utils/aspectRatio';"
  );
}

content = content.replace(
  /className="relative aspect-video max-h-\[92%\] w-full max-w-4xl bg-black rounded-2xl border border-white\/10 overflow-hidden shadow-2xl flex items-center justify-center group"/g,
  'className={`relative ${getProjectAspectRatioClass(project)} max-h-[92%] w-full max-w-4xl bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group`}'
);

fs.writeFileSync(path, content);
