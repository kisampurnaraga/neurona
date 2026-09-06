const http = require('http');

async function run() {
  const sqlite = require('better-sqlite3');
  const db = sqlite('outputs/sqlite.db');
  const rows = db.prepare('SELECT * FROM projects').all();
  
  const fs = require('fs');
  const path = require('path');
  
  for (const row of rows) {
    const project = JSON.parse(row.data);
    const id = project.id;
    if (project.status === 'COMPLETED' && project.finalVideoUrl) {
        console.log(`Checking project ${id} - ${project.title}`);
        
        // Rule 1
        if (project.storyboard && project.storyboard.scenes) {
          for (const scene of project.storyboard.scenes) {
            const urlsToCheck = [scene.videoUrl, scene.assetUrl];
            for (let url of urlsToCheck) {
               if (url && url.startsWith('/api/outputs/')) {
                 const filename = url.split('/').pop();
                 if (filename) {
                   const filepath = path.join(process.cwd(), 'outputs', filename);
                   console.log(`- Scene URL: ${url}`);
                   console.log(`  Filepath: ${filepath}`);
                   console.log(`  Exists: ${fs.existsSync(filepath)}`);
                 }
               }
            }
          }
        }
        
        // Rule 2
        const now = Date.now();
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        console.log(`- Last Update: ${new Date(lastUpdate).toISOString()}`);
        console.log(`- Older than 7 days: ${lastUpdate && (now - lastUpdate > sevenDays)}`);
    }
  }
}
run();
