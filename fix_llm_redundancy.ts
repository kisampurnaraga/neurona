import * as fs from 'fs';
let content = fs.readFileSync('server/llmService.ts', 'utf8');

// The redundancy is:
//              styleKeywords: s.styleKeywords || [],
//              featuresProduct: s.featuresProduct || false,
//              backgroundLock: s.backgroundLock || 'free',
//              location: s.location || '',
//            featuresProduct: s.featuresProduct !== undefined ? ...

content = content.replace(
    /styleKeywords: s\.styleKeywords \|\| \[\],\s*featuresProduct: s\.featuresProduct \|\| false,\s*backgroundLock: s\.backgroundLock \|\| 'free',\s*location: s\.location \|\| '',/g,
    ''
);

fs.writeFileSync('server/llmService.ts', content);
console.log("Fixed llmService.ts redundancies");
