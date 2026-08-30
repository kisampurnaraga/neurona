import fs from 'fs';
let content = fs.readFileSync('src/components/AffiliateConfigModal.tsx', 'utf8');

const regex = /const promptText = `Buatkan video affiliate \$\{preset\.platform\}.*?\n\s*onSubmit\(config, presetAssets, promptText\);\n\s*onClose\(\);\n\s*\}\n\s*\};/s;
content = content.replace(regex, '');

fs.writeFileSync('src/components/AffiliateConfigModal.tsx', content);
console.log("Fixed syntax error");
