const fs = require('fs');

let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

content = content.replace(
  "badge: isStoryboardReady ? 'READY (50%)' : undefined,",
  "badge: hubState === 'COMPLETED' ? 'FINAL (100%)' : isStoryboardReady ? 'READY (50%)' : undefined,"
);

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
