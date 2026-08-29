const fs = require('fs');
let content = fs.readFileSync('src/shared/types.ts', 'utf8');

content = content.replace(
  "export interface Scene {",
  "export interface Scene {\n  featuresProduct?: boolean;"
);

fs.writeFileSync('src/shared/types.ts', content);
