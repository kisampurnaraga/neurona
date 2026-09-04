const fs = require('fs');
let code = fs.readFileSync('server/VideoEditor.ts', 'utf-8');

// I will just rewrite the file fully to avoid parsing issues.
