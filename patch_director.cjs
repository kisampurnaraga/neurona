const fs = require('fs');
let code = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

const targetStr = `      action: () => {
        if (project) {
          onOpenContentCreator();
        } else {
          setPrompt("Tampilkan workspace Content Creator dan strategi hook YouTube");
          onInteract("Tampilkan workspace Content Creator dan strategi hook YouTube");
        }
      }`;

const replaceStr = `      action: () => {
        onOpenContentCreator();
      }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', code);
  console.log('Patched Content Creator action');
} else {
  console.log('Target string not found');
}
