import * as fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Fix the greedy connectives
content = content.replace(/\[\/dengan\/gi, 'with'\],/g, "[/\\bdengan\\b/gi, 'with'],");
content = content.replace(/\[\/dan\/gi, 'and'\],/g, "[/\\bdan\\b/gi, 'and'],");
content = content.replace(/\[\/di\/gi, 'in'\],/g, "[/\\bdi\\b/gi, 'in'],");
content = content.replace(/\[\/pada\/gi, 'at'\],/g, "[/\\bpada\\b/gi, 'at'],");
content = content.replace(/\[\/ke\/gi, 'to'\],/g, "[/\\bke\\b/gi, 'to'],");
content = content.replace(/\[\/dari\/gi, 'from'\],/g, "[/\\bdari\\b/gi, 'from'],");

// Remove band-aids
content = content.replace(/\s*\[\/meinum\/gi, 'medium'\],/g, "");
content = content.replace(/\s*\[\/slictod\/gi, 'slicked'\],/g, "");
content = content.replace(/\s*\[\/grainent\/gi, 'gradient'\],/g, "");
content = content.replace(/\s*\[\/tosakitan\/gi, 'in pain'\],/g, "");
content = content.replace(/\s*\[\/sneators\/gi, 'sneakers'\],/g, "");
content = content.replace(/\s*\[\/instinct\/gi, 'distinct'\],/g, "");

fs.writeFileSync('server/imageService.ts', content);
console.log("Fixed regex replacements in server/imageService.ts");
