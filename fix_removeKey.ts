import fs from 'fs';
let content = fs.readFileSync('server/keyRotator.ts', 'utf8');

content = content.replace("console.log(`[KeyRotator] Removed ${provider} key (${health.maskedKey})`);\n        return true;", "console.log(`[KeyRotator] Removed ${provider} key (${health.maskedKey})`);\n        this.saveState();\n        return true;");

fs.writeFileSync('server/keyRotator.ts', content);
console.log("Updated keyRotator.ts to save state on removeKey");
