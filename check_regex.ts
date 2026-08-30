import * as fs from 'fs';

const content = fs.readFileSync('server/imageService.ts', 'utf8');
const mapMatch = content.match(/const idToEnMap: \[RegExp, string\]\[\] = \[([\s\S]*?)\];/);

if (mapMatch) {
    const lines = mapMatch[1].split('\n');
    const missing = lines.filter(line => {
        return line.includes('[/') && line.includes('/gi,') && (!line.includes('\\b') || !line.match(/\[\/\\b.*\\b\/gi/));
    });
    console.log("Lines missing strict \\b...\\b wrapping:");
    missing.forEach(l => console.log(l.trim()));
} else {
    console.log("Could not find idToEnMap");
}
