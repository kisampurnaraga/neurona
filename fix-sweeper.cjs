const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

const replacement = `
export function startStorageCleanupSweeper() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  
  const runCleanup = () => {
    let changed = false;
    const now = Date.now();
    for (const [id, project] of projects.entries()) {
      // Rule 1 & 2 only apply to COMPLETED projects that have a valid final video
      if (project.status === 'COMPLETED' && project.finalVideoUrl) {
        
        // Rule 1: Delete per-scene raw videos if final video is successfully stitched
        if (project.storyboard && project.storyboard.scenes) {
          let scenesChanged = false;
          for (const scene of project.storyboard.scenes) {
            // Check local file paths
            const urlsToCheck = [scene.videoUrl, scene.assetUrl, (project as any).scenes?.find((s: any) => s.id === scene.id)?.videoUrl];
            for (let url of urlsToCheck) {
               if (url && url.startsWith('/api/outputs/')) {
                 const filename = url.split('/').pop();
                 if (filename) {
                   const filepath = path.join(process.cwd(), 'outputs', filename);
                   if (fs.existsSync(filepath)) {
                     try {
                       fs.unlinkSync(filepath);
                       console.log(\`[Storage Cleanup] Deleted scene video \${filepath} for project \${id}\`);
                       appendLog(project, 'SYSTEM', \`File video mentah adegan dihapus otomatis untuk menghemat storage: \${filename}\`, 'INFO');
                       scenesChanged = true;
                     } catch (e) {
                       console.error(\`[Storage Cleanup] Failed to delete \${filepath}:\`, e);
                     }
                   }
                 }
               }
            }
            
            // Clean up DB references
            if (scene.videoUrl && scene.videoUrl.startsWith('/api/outputs/')) {
                scene.videoUrl = undefined;
                scenesChanged = true;
            }
            if (scene.assetUrl && scene.assetUrl.startsWith('/api/outputs/')) {
                scene.assetUrl = undefined;
                scenesChanged = true;
            }
          }
          if (scenesChanged) {
             changed = true;
          }
        }

        // Rule 2: Delete final video if older than 7 days
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (lastUpdate && (now - lastUpdate > sevenDays)) {
          if (project.finalVideoUrl.startsWith('/api/outputs/')) {
            const filename = project.finalVideoUrl.split('/').pop();
            if (filename) {
              const filepath = path.join(process.cwd(), 'outputs', filename);
              if (fs.existsSync(filepath)) {
                try {
                  fs.unlinkSync(filepath);
                  console.log(\`[Storage Cleanup] Deleted final video \${filepath} for project \${id} (>7 days)\`);
                  appendLog(project, 'SYSTEM', \`File video final dihapus otomatis (sudah lewat masa retensi 7 hari): \${filename}\`, 'INFO');
                  changed = true;
                } catch (e) {
                  console.error(\`[Storage Cleanup] Failed to delete final video \${filepath}:\`, e);
                }
              }
            }
            project.finalVideoUrl = undefined;
            // Optionally set status to EXPIRED to indicate the asset is gone
            changed = true;
          }
        }
      }
    }
    
    if (changed) {
      saveProjects();
    }
  };

  // Run shortly after boot, then every hour
  setTimeout(runCleanup, 5000);
  setInterval(runCleanup, 60 * 60 * 1000);
}
`;

content = content.replace(/export function startStorageCleanupSweeper\(\) \{[\s\S]*?\}, 60 \* 60 \* 1000\);\n\}/, replacement.trim());
fs.writeFileSync('server/orchestrator.ts', content);
console.log("Done");
