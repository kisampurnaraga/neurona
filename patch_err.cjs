const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf8');

code = code.replace(
  `scene.videoStatus = 'FAILED';
      scene.status = 'FAILED';
      appendLog(project, 'ERROR', \`Gagal render video adegan \${sceneIdx + 1}: \${e.message}\`, 'ERROR');
      projectEvents.emit(\`update:\${id}\`, project);`,
  `scene.videoStatus = 'FAILED';
      scene.status = 'FAILED';
      appendLog(project, 'ERROR', \`Gagal render video adegan \${sceneIdx + 1}: \${e.message}\`, 'ERROR');
      saveProjects();
      projectEvents.emit(\`update:\${id}\`, project);`
);

fs.writeFileSync('server/orchestrator.ts', code);
