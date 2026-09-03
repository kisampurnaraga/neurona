const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const targetCode = `      project.finalVideoUrl = finalUrl;
      project.status = 'COMPLETED';
      project.overallProgress = 100;
      
      // Store the orchestration result for the client if needed
      (project as any).orchestrationResult = typeof processResult === 'string' ? null : processResult;
      
      // Logging the structured orchestration result automatically
      if (processResult && typeof processResult === 'object' && processResult.finalExportConfirmationLogs) {
         processResult.finalExportConfirmationLogs.forEach((logMsg: string) => {
            appendLog(project, 'ORCHESTRATOR', logMsg, 'SUCCESS');
         });
      }
      
      saveProjects();`;

const replacementCode = `      const latestProject = projects.get(projectId);
      if (latestProject) {
        latestProject.finalVideoUrl = finalUrl;
        latestProject.status = 'COMPLETED';
        latestProject.overallProgress = 100;
        (latestProject as any).orchestrationResult = typeof processResult === 'string' ? null : processResult;
        Object.assign(project, latestProject);
      } else {
        project.finalVideoUrl = finalUrl;
        project.status = 'COMPLETED';
        project.overallProgress = 100;
        (project as any).orchestrationResult = typeof processResult === 'string' ? null : processResult;
      }

      if (processResult && typeof processResult === 'object' && processResult.finalExportConfirmationLogs) {
         processResult.finalExportConfirmationLogs.forEach((logMsg: string) => {
            appendLog(project, 'ORCHESTRATOR', logMsg, 'SUCCESS');
         });
      }
      
      saveProjects();`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
