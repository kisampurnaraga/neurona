import * as fs from 'fs';

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// Replace the QAAuditAgent.auditAndRefine call block to include featuresProduct
content = content.replace(
    /visualStyle: s\.visualStyle \|\| \(vType === 'AFFILIATE' \? 'ugc' : 'studio'\)/,
    `visualStyle: s.visualStyle || (vType === 'AFFILIATE' ? 'ugc' : 'studio'),
            featuresProduct: s.featuresProduct`
);

fs.writeFileSync('server/orchestrator.ts', content);
console.log("Patched orchestrator.ts");
