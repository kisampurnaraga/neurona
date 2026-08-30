import * as fs from 'fs';

let content = fs.readFileSync('server/llmService.ts', 'utf8');

content = content.replace(
    /visualStyle: s\.visualStyle,\n              styleKeywords: s\.styleKeywords \|\| \[\],\n              featuresProduct: s\.featuresProduct \|\| false,\n              backgroundLock: s\.backgroundLock \|\| 'free',\n              location: s\.location \|\| '',\n              featuresProduct:/,
    `visualStyle: s.visualStyle,\n              featuresProduct:`
);

fs.writeFileSync('server/llmService.ts', content);
console.log("Fixed llmService.ts");
