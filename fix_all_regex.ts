import * as fs from 'fs';
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('[/') && lines[i].includes('/gi,') && !lines[i].includes('\\b') && !lines[i].includes('\\s')) {
        lines[i] = lines[i].replace(/\[\/(.+?)\/gi,/, (match, p1) => {
            return '[/\\b' + p1 + '\\b/gi,';
        });
    }
}

fs.writeFileSync('server/imageService.ts', lines.join('\n'));
console.log("Applied \\b to all plain regexes in idToEnMap");
