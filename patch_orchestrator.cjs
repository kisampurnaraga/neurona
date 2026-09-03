const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const targetCode = `      scene.videoStatus = 'COMPLETED';
      scene.status = 'COMPLETED';

      // Keep project.scenes in sync if present
      if (Array.isArray((project as any).scenes) && (project as any).scenes[sceneIdx]) {
        (project as any).scenes[sceneIdx].videoUrl = localVideoUrl;
        (project as any).scenes[sceneIdx].remoteVideoUrl = (scene as any).remoteVideoUrl;
        (project as any).scenes[sceneIdx].remoteUrl = scene.remoteUrl;
        (project as any).scenes[sceneIdx].falUrl = scene.falUrl;
        (project as any).scenes[sceneIdx].videoStatus = 'COMPLETED';
        (project as any).scenes[sceneIdx].status = 'COMPLETED';
      }

      // DO NOT overwrite project.finalVideoUrl with single scene video.
      // project.finalVideoUrl is strictly reserved for full stitched video result.

      saveProjects();`;

const replacementCode = `      // RACE CONDITION FIX: Fetch latest project state from memory before saving
      // so we don't overwrite if the user saved via frontend during the long video render.
      const latestProject = projects.get(id);
      if (latestProject && latestProject.storyboard && latestProject.storyboard.scenes && latestProject.storyboard.scenes[sceneIdx]) {
          const latestScene = latestProject.storyboard.scenes[sceneIdx];
          latestScene.videoUrl = localVideoUrl;
          latestScene.remoteUrl = scene.remoteUrl;
          (latestScene as any).remoteVideoUrl = (scene as any).remoteVideoUrl;
          latestScene.falUrl = scene.falUrl;
          latestScene.videoStatus = 'COMPLETED';
          latestScene.status = 'COMPLETED';
          
          if (Array.isArray((latestProject as any).scenes) && (latestProject as any).scenes[sceneIdx]) {
            (latestProject as any).scenes[sceneIdx].videoUrl = localVideoUrl;
            (latestProject as any).scenes[sceneIdx].remoteVideoUrl = (scene as any).remoteVideoUrl;
            (latestProject as any).scenes[sceneIdx].remoteUrl = scene.remoteUrl;
            (latestProject as any).scenes[sceneIdx].falUrl = scene.falUrl;
            (latestProject as any).scenes[sceneIdx].videoStatus = 'COMPLETED';
            (latestProject as any).scenes[sceneIdx].status = 'COMPLETED';
          }
          
          // Re-assign project pointer to emit the correct state
          Object.assign(project, latestProject);
      } else {
          scene.videoStatus = 'COMPLETED';
          scene.status = 'COMPLETED';
          if (Array.isArray((project as any).scenes) && (project as any).scenes[sceneIdx]) {
            (project as any).scenes[sceneIdx].videoUrl = localVideoUrl;
            (project as any).scenes[sceneIdx].remoteVideoUrl = (scene as any).remoteVideoUrl;
            (project as any).scenes[sceneIdx].remoteUrl = scene.remoteUrl;
            (project as any).scenes[sceneIdx].falUrl = scene.falUrl;
            (project as any).scenes[sceneIdx].videoStatus = 'COMPLETED';
            (project as any).scenes[sceneIdx].status = 'COMPLETED';
          }
      }

      saveProjects();`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
