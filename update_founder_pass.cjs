const fs = require('fs');
let path = 'server.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /cleanPass === 'founder2026'/g,
  `cleanPass === 'founder2026' || cleanPass === 'founder'`
);

c = c.replace(
  /cleanKey === 'founder2026'/g,
  `cleanKey === 'founder2026' || cleanKey === 'founder'`
);

fs.writeFileSync(path, c);
