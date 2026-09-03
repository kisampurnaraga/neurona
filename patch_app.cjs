const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `      // Give time for animations to finish before potentially changing view
      if (project?.status === 'COMPLETED') {
         setCurrentView('STUDIO');
      }`;

const replacement = `      // Give time for animations to finish before potentially changing view
      if (project?.status === 'COMPLETED') {
         // Do not auto-close the modal or change view. Let the user see the success screen!
      }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log('PATCHED APP.TSX');
} else {
  console.log('TARGET NOT FOUND');
}
