const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const targetCode = `    } catch (e: any) {
      appendLog(project, 'ORCHESTRATOR', \`Gagal menjahit video: \${e.message}\`, 'ERROR');
      project.status = 'COMPLETED'; // Prevent it from being stuck in PROCESSING forever
      saveProjects();
      projectEvents.emit(\`update:\${projectId}\`, project);
      throw e;
    }`;

const replacementCode = `    } catch (e: any) {
      const latestProject = projects.get(projectId);
      if (latestProject) {
        latestProject.status = 'COMPLETED';
        Object.assign(project, latestProject);
      } else {
        project.status = 'COMPLETED';
      }
      appendLog(project, 'ORCHESTRATOR', \`Gagal menjahit video: \${e.message}\`, 'ERROR');
      saveProjects();
      projectEvents.emit(\`update:\${projectId}\`, project);
      throw e;
    }`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
