const fs = require('fs');
let code = fs.readFileSync('src/server/providers/VideoProvider.ts', 'utf8');
code = code.replace(
  'generateScene(scene: Scene, context: string): Promise<string>;',
  'generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string>;'
);
fs.writeFileSync('src/server/providers/VideoProvider.ts', code);
