const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

content = content.replace(
  "      let generatedScenes: any[] = [];\n      const sbResult = await LLMService.generateStoryboard({\n        brief: project.brief,\n        videoType: vType,\n        config: currentConfig,\n        onLog: (source, msg, level) => appendLog(project, source, msg, level || 'INFO')\n      });",
  "      let generatedScenes: any[] = [];\n      const sbResult = await LLMService.generateStoryboard({\n        brief: project.brief,\n        videoType: vType,\n        config: currentConfig,\n        onLog: (source, msg, level) => appendLog(project, source, msg, level || 'INFO')\n      });\n\n      // Transition to STORYBOARDING in UI\n      project.overallProgress = 35;\n      project.currentPhaseName = 'GATOTKACA: Menyusun visual adegan storyboard...';\n      updateTelemetry(project, 'SINTA', { status: 'ACTIVE', currentTask: 'Menyusun visual adegan storyboard...', progress: 60 });\n      projectEvents.emit(`update:${id}`, project);\n"
);

fs.writeFileSync('server/orchestrator.ts', content);
