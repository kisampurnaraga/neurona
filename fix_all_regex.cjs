const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Match lines like:  [/word/gi, 'translation'],
// We want to change it to: [/\bword\b/gi, 'translation'],
// BUT ONLY if it doesn't already have \b, and doesn't have special regex chars (like \s*).

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('[/') && lines[i].includes('/gi,') && !lines[i].includes('\\b') && !lines[i].includes('\\s')) {
        // e.g. [/jas/gi, 'suit'] -> [/\bjas\b/gi, 'suit']
        lines[i] = lines[i].replace(/\[\/(.+?)\/gi,/, (match, p1) => {
            // Check if it already starts with \b
            if (p1.startsWith('\\b')) return match;
            return \`[/\\b\${p1}\\b/gi,\`;
        });
    }
}

fs.writeFileSync('server/imageService.ts', lines.join('\n'));
console.log("Applied \\b to all plain regexes in idToEnMap");
