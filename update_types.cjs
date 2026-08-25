const fs = require('fs');
let path = 'src/shared/types.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/export interface AffiliateConfig \{/, `export interface AffiliateConfig {\n  aspectRatio?: '16:9' | '9:16' | '1:1';`);
fs.writeFileSync(path, c);
