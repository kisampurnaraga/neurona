const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('interface Scene {') && !code.includes('prompt_video_runway?')) {
     code = code.replace('interface Scene {', 'interface Scene {\n  prompt_video_runway?: string;');
     fs.writeFileSync(file, code);
     console.log('Patched ' + file);
  }
}

if (fs.existsSync('src/shared/types.ts')) patch('src/shared/types.ts');
if (fs.existsSync('src/types/production.ts')) patch('src/types/production.ts');
