const fs = require('fs');

let path2 = 'src/components/AuthModal.tsx';
let c2 = fs.readFileSync(path2, 'utf8');

c2 = c2.replace(/RefreshCw\n  AlertCircle/, 'RefreshCw,\n  AlertCircle');

fs.writeFileSync(path2, c2);
