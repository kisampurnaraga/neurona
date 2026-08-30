const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

// Fix buildT2IImagePrompt to avoid appending duplicated character descriptions
const target = `        if (charSubjectEn) {
          coreSubjectAction += \`, starring \${charSubjectEn} as the main actor in action\`;
        }`;

const replacement = `        if (charSubjectEn && !coreSubjectAction.toLowerCase().includes(charName.toLowerCase()) && !coreSubjectAction.toLowerCase().includes('starring')) {
          coreSubjectAction += \`, starring \${charSubjectEn} as the main actor in action\`;
        }`;

content = content.replace(target, replacement);

fs.writeFileSync('server/imageService.ts', content);
