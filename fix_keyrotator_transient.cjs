const fs = require('fs');
let content = fs.readFileSync('server/keyRotator.ts', 'utf8');

const oldLogic = `const isTransient = errMsg.includes('429') || 
                             errMsg.toLowerCase().includes('resource_exhausted') ||
                            errMsg.includes('500') ||
                            errMsg.includes('503') ||
                            errMsg.toLowerCase().includes('fetch failed');`;

const newLogic = `const isBillingExhausted = errMsg.toLowerCase().includes('spending cap') || errMsg.toLowerCase().includes('billing') || errMsg.toLowerCase().includes('exceeded its monthly');
        const isTransient = !isBillingExhausted && (errMsg.includes('429') || 
                             errMsg.toLowerCase().includes('resource_exhausted') ||
                            errMsg.includes('500') ||
                            errMsg.includes('503') ||
                            errMsg.toLowerCase().includes('fetch failed'));`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/keyRotator.ts', content);
