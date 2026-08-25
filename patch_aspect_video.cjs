const fs = require('fs');

const path = 'src/components/StoryboardMatrixModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the 3 occurrences of aspect-video in StoryboardMatrixModal.tsx
// 1. Scene Preview Box
content = content.replace(
  /className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-inner"/g, 
  'className={`relative ${getProjectAspectRatioClass(project)} w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-inner`}'
);

// 2. Playlist Preview (line 1251ish)
content = content.replace(
  /className="w-full aspect-video bg-black rounded-2xl border border-cyan-500\/30 overflow-hidden shadow-2xl relative"/g,
  'className={`w-full ${getProjectAspectRatioClass(project)} bg-black rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl relative`}'
);

// 3. Zoom Preview (line 1313ish)
content = content.replace(
  /className="w-full aspect-video rounded-2xl overflow-hidden border border-emerald-500\/40 shadow-2xl bg-black"/g,
  'className={`w-full ${getProjectAspectRatioClass(project)} rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl bg-black`}'
);

fs.writeFileSync(path, content);
