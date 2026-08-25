const fs = require('fs');

let path = 'src/components/CreditTopUpModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<\/div>\s*\{\/\* Back to package selection \*\/\}/g, `{/* Back to package selection */}`);

fs.writeFileSync(path, c);
