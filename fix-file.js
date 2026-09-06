const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// I will just use sed or grep to find lines and recreate.
