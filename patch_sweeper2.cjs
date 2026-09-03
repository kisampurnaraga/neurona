const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const target = `export function loadProjects() {`;

const replacement = `let sweeperStarted = false;
export function startStaleJobSweeper() {
  if (sweeperStarted) return;
  sweeperStarted = true;
  setInterval(() => {
    let changed = false;
    const now = Date.now();
    for (const [id, project] of projects.entries()) {
      if (project.status === 'PROCESSING') {
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        // 5 minutes timeout for stitching/processing
        if (now - lastUpdate > 5 * 60 * 1000) {
          project.status = 'FAILED';
          project.error = 'Proses timeout atau terputus karena server restart.';
          if (!project.agentStatus) project.agentStatus = {};
          project.agentStatus['Stitcher'] = 'FAILED';
          changed = true;
          projectEvents.emit(\`update:\${id}\`, project);
          console.warn(\`[Stale Job Sweeper] Auto-failed stale project \${id}\`);
        }
      }
    }
    if (changed) saveProjects();
  }, 30 * 1000);
}

export function loadProjects() {
  startStaleJobSweeper();`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('PATCHED SWEEPER');
} else {
  console.log('TARGET NOT FOUND');
}
