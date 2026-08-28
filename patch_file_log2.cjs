const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf8');

code = code.replace(
  `scene.videoStatus = 'GENERATING';`,
  `require('fs').appendFileSync('outputs/debug.log', 'Setting videoStatus to GENERATING\\n');
    scene.videoStatus = 'GENERATING';`
);

fs.writeFileSync('server/orchestrator.ts', code);
