const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf8');

const targetStr = `      const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);`;

const replaceStr = `      const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType, (progressStatus) => {
         scene.videoProgress = progressStatus;
         projectEvents.emit(\`update:\${id}\`, project);
      });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('Patched server/orchestrator.ts');
} else {
  console.log('Target string not found');
}
