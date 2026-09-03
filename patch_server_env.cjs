const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `  if (process.env.NODE_ENV !== "production") {`;
const replacement = `  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  if (!isProd) {`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('PATCHED SERVER NODE_ENV CHECK');
} else {
  console.log('TARGET NOT FOUND');
}
