const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      // Update status immediately so client knows it's processing
      const project = projects.get(projectId);
      if (project) {
        project.status = 'PROCESSING';`;

const replacement = `      // Update status immediately so client knows it's processing
      const project = projects.get(projectId);
      if (project) {
        project.status = 'PROCESSING';
        project.updatedAt = new Date().toISOString();`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('PATCHED STITCH ACTION');
} else {
  console.log('TARGET NOT FOUND');
}
