const fs = require('fs');
let content = fs.readFileSync('server/llmService.ts', 'utf8');

// For the main prompt template
content = content.replace(
  '      "text_overlay": "TEKS HOOK DI LAYAR"\n    }',
  '      "text_overlay": "TEKS HOOK DI LAYAR",\n      "featuresProduct": true\n    }'
);

// For OpenAI system prompt
content = content.replace(
  "promptImageToVideo, styleKeywords: string[] }",
  "promptImageToVideo, styleKeywords: string[], featuresProduct: boolean }"
);

// For Gemini system prompt
content = content.replace(
  "promptImageToVideo, styleKeywords: string[] }",
  "promptImageToVideo, styleKeywords: string[], featuresProduct: boolean }"
);

fs.writeFileSync('server/llmService.ts', content);
