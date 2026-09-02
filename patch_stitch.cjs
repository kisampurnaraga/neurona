const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldCode = `      const { subtitleStyle, ttsVoiceConfig } = body;
      const result = await ProductionOrchestrator.stitchMasterVideo(projectId, subtitleStyle, ttsVoiceConfig);
      res.json({ 
         success: true, 
         finalVideoUrl: typeof result === 'string' ? result : result.finalVideoUrl,
         orchestrationData: typeof result === 'string' ? null : result
      });`;

const newCode = `      const { subtitleStyle, ttsVoiceConfig } = body;
      
      // Update status immediately so client knows it's processing
      const project = projects.get(projectId);
      if (project) {
        project.status = 'PROCESSING';
        project.overallProgress = 85; // Roughly the progress before stitching
        saveProjects();
        projectEvents.emit(\`update:\${projectId}\`, project);
      }

      // Execute video generation asynchronously without awaiting
      ProductionOrchestrator.stitchMasterVideo(projectId, subtitleStyle, ttsVoiceConfig)
        .then(() => console.log(\`[Stitch] Async video generation for \${projectId} completed successfully.\`))
        .catch(err => console.error(\`[Stitch] Async video generation failed for \${projectId}:\`, err));

      res.json({ 
         success: true, 
         status: 'PROCESSING',
         message: 'Perakitan video master sedang berjalan di latar belakang. Silakan pantau log untuk melihat progres.'
      });`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('server.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
