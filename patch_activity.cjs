const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `import { Wallet, Key, Coins } from 'lucide-react';`;
const replaceStr = `import { Wallet, Key, Coins, Activity } from 'lucide-react';`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched App.tsx with Activity icon');
} else {
  console.log('Target string not found');
}
