const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const target = `    } catch (e: any) {
      const latestProject = projects.get(projectId);
      if (latestProject) {
        latestProject.status = 'COMPLETED';
        Object.assign(project, latestProject);
      } else {
        project.status = 'COMPLETED';
      }
      appendLog(project, 'ORCHESTRATOR', \`Gagal menjahit video: \${e.message}\`, 'ERROR');`;

const replacement = `    } catch (e: any) {
      const latestProject = projects.get(projectId);
      if (latestProject) {
        latestProject.status = 'FAILED';
        latestProject.error = e.message;
        Object.assign(project, latestProject);
      } else {
        project.status = 'FAILED';
        project.error = e.message;
      }
      appendLog(project, 'ORCHESTRATOR', \`Gagal menjahit video: \${e.message}\`, 'ERROR');`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('PATCHED CATCH BLOCK');
} else {
  console.log('TARGET NOT FOUND');
}
