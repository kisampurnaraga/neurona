const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf8');

code = code.replace(
  `console.log('[generateSceneVideo] called with id:', id, 'sceneId:', sceneId);`,
  `require('fs').appendFileSync('outputs/debug.log', '[generateSceneVideo] called with id: ' + id + ' sceneId: ' + sceneId + '\\n');`
);
code = code.replace(
  `console.log('[generateSceneVideo] project exists:', !!project, 'storyboard exists:', !!project?.storyboard);`,
  `require('fs').appendFileSync('outputs/debug.log', '[generateSceneVideo] project exists: ' + !!project + ' storyboard exists: ' + !!project?.storyboard + '\\n');`
);
code = code.replace(
  `if (sceneIdx === -1) return;`,
  `if (sceneIdx === -1) { require('fs').appendFileSync('outputs/debug.log', 'Scene not found!\\n'); return; } else { require('fs').appendFileSync('outputs/debug.log', 'Scene found at ' + sceneIdx + '\\n'); }`
);

fs.writeFileSync('server/orchestrator.ts', code);
