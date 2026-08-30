import fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const regex = /\/\/\s*FORCE PACING CLIP AT TOP LEVEL[\s\S]*?result\.auditNotes[\s\S]*?\}\s*\}/g;
content = content.replace(regex, '');

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Cleaned up duplicated hard-clips.");
