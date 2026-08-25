const fs = require('fs');

let path = 'src/components/AuthModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<\/form>\s*\)}/g, `</form>\n        </div>\n          )}`);

fs.writeFileSync(path, c);
