const fs = require('fs');

const path = 'src/server/fcc/FounderService.ts';
let content = fs.readFileSync(path, 'utf8');

// Allow an explicit GEMINI_MANUAL_API_KEY environment variable to override
content = content.replace(
  /apiKey: this\.customGeminiBananaConfig\.apiKey \|\| process\.env\.GEMINI_API_KEY \|\| '',/g,
  "apiKey: this.customGeminiBananaConfig.apiKey || process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY || '',"
);

content = content.replace(
  /apiKey: this\.customVeoConfig\.apiKey \|\| process\.env\.GEMINI_API_KEY \|\| '',/g,
  "apiKey: this.customVeoConfig.apiKey || process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY || '',"
);

content = content.replace(
  /status: \(this\.customVeoConfig\.apiKey \|\| process\.env\.GEMINI_API_KEY\) \? 'READY' : 'NOT_CONFIGURED'/g,
  "status: (this.customVeoConfig.apiKey || process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY) ? 'READY' : 'NOT_CONFIGURED'"
);

fs.writeFileSync(path, content);
console.log('Patched FounderService.ts');
