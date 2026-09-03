const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const target = `export function saveProjects() {`;

const replacement = `export function saveProjects() {
  // Update timestamp before saving
  for (const [id, project] of projects.entries()) {
      if (!project.updatedAt) project.updatedAt = new Date().toISOString();
      else if (project.status === 'PROCESSING') project.updatedAt = new Date().toISOString(); // refresh activity
  }
`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('PATCHED SAVE PROJECTS');
} else {
  console.log('TARGET NOT FOUND');
}
