const fs = require('fs');
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const oldLogic = `      referenceImageUrl: input.referenceImageUrl || null,`;
const newLogic = `      referenceImageUrl: input.referenceImageUrl?.startsWith('data:image/') ? '[BASE64_IMAGE_DATA_TRUNCATED]' : (input.referenceImageUrl || null),`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server/services/qaAuditAgent.ts', content);
