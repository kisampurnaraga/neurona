import * as fs from 'fs';

let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

// 1. Add featuresProduct to QAAuditInput
content = content.replace(
    /visualStyle\?: 'ugc' \| 'studio';/,
    `visualStyle?: 'ugc' | 'studio';\n  featuresProduct?: boolean;`
);

// 2. Only penalize missing product if featuresProduct is not false
content = content.replace(
    /if \(\!mentioned\) \{/,
    `if (!mentioned && input.featuresProduct !== false) {`
);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Patched qaAuditAgent.ts");
