const fs = require('fs');
let code = fs.readFileSync('src/shared/types.ts', 'utf-8');

code = code.replace(
  "export type ProductionState = 'DRAFT' | 'BRIEFING' | 'STORYBOARDING' | 'AWAITING_APPROVAL' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED' | 'deleted';",
  "export type ProductionState = 'DRAFT' | 'BRIEFING' | 'STORYBOARDING' | 'AWAITING_APPROVAL' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED' | 'deleted' | 'PROCESSING';"
);

fs.writeFileSync('src/shared/types.ts', code);
console.log('ADDED PROCESSING TO PRODUCTION STATE');
