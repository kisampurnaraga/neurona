const fs = require('fs');
let code = fs.readFileSync('src/server/fcc/FounderService.ts', 'utf8');
code = code.replace(
  /static getFalConfig\(\) \{\s+return \{\s+apiKey: this\.customFalConfig\.apiKey \|\| process\.env\.FAL_KEY \|\| '',\s+endpoint: this\.customFalConfig\.endpoint \|\| 'https:\/\/api\.fal\.ai\/v1',\s+status: this\.customFalConfig\.status\s+\};\s+\}/,
  `static getFalConfig() {
    return {
      apiKey: this.customFalConfig.apiKey || process.env.FAL_KEY || '',
      endpoint: this.customFalConfig.endpoint || 'https://api.fal.ai/v1',
      status: this.customFalConfig.status,
      model: this.customFalConfig.model || 'fal-ai/hunyuan-video'
    };
  }`
);
fs.writeFileSync('src/server/fcc/FounderService.ts', code);
console.log('Patched FounderService');
