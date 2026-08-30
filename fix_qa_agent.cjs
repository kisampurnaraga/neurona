const fs = require('fs');
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

// Function to replace JSON.stringify(input) with sanitized version
const sanitizedInput = `JSON.stringify({
            ...input,
            referenceImageUrl: input.referenceImageUrl?.startsWith('data:image/') ? '[BASE64_IMAGE_DATA_TRUNCATED]' : input.referenceImageUrl
          })`;

content = content.replace(/JSON\.stringify\(input\)/g, sanitizedInput);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
