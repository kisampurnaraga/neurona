const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const target = `export function appendLog(project: ProductionProject, source: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'INTERRUPT' = 'INFO') {
  if (!project.logs) project.logs = [];`;

const replacement = `export function appendLog(project: ProductionProject, source: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'INTERRUPT' = 'INFO') {
  project.updatedAt = new Date().toISOString();
  if (!project.logs) project.logs = [];`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('PATCHED APPEND LOG');
} else {
  console.log('TARGET NOT FOUND');
}
