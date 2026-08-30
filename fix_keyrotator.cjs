const fs = require('fs');
let content = fs.readFileSync('server/keyRotator.ts', 'utf8');

const oldLogic = `    const isInvalid = isDepleted || errMsg.includes('401') || 
                      errMsg.includes('403') || 
                      errMsg.toLowerCase().includes('api_key_invalid') || 
                      errMsg.toLowerCase().includes('invalid api key') ||
                      errMsg.toLowerCase().includes('unauthenticated');`;

const newLogic = `    const isBillingExhausted = errMsg.toLowerCase().includes('spending cap') || errMsg.toLowerCase().includes('billing') || errMsg.toLowerCase().includes('exceeded its monthly') || errMsg.toLowerCase().includes('exhausted balance');
    const isInvalid = isDepleted || isBillingExhausted || errMsg.includes('401') || 
                      errMsg.includes('403') || 
                      errMsg.toLowerCase().includes('api_key_invalid') || 
                      errMsg.toLowerCase().includes('invalid api key') ||
                      errMsg.toLowerCase().includes('unauthenticated');`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/keyRotator.ts', content);
