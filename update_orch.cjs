const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

content = content.replace(
  'static async stitchMasterVideo(projectId: string): Promise<any> {',
  'static async stitchMasterVideo(projectId: string, subtitleStyle?: string): Promise<any> {'
);
content = content.replace(
  'const processResult = await VideoEditor.processProject(project);',
  'const processResult = await VideoEditor.processProject(project, subtitleStyle);'
);

fs.writeFileSync('server/orchestrator.ts', content);
console.log('updated orchestrator.ts');
