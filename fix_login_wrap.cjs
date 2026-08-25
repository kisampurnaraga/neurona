const fs = require('fs');

let path = 'src/components/AuthModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<div className="p-6">/, `{mode === 'login' && (\n        <div className="p-6">`);

fs.writeFileSync(path, c);
