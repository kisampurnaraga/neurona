import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

old_block = """    try {
      const finalUrl = await VideoEditor.processProject(project);
      project.finalVideoUrl = finalUrl;
      project.status = 'COMPLETED';
      project.overallProgress = 100;
      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
      return finalUrl;
    } catch (e: any) {"""

new_block = """    try {
      const processResult = await VideoEditor.processProject(project);
      const finalUrl = typeof processResult === 'string' ? processResult : processResult.finalVideoUrl;
      
      project.finalVideoUrl = finalUrl;
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
      
      saveProjects();
      projectEvents.emit(`update:${projectId}`, project);
      return processResult;
    } catch (e: any) {"""

content = content.replace(old_block, new_block)

# Also update the signature
content = content.replace("static async stitchMasterVideo(projectId: string): Promise<string> {", "static async stitchMasterVideo(projectId: string): Promise<any> {")

with open('server/orchestrator.ts', 'w') as f:
    f.write(content)

print("Orchestrator updated")
