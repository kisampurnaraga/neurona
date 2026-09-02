import fs from 'fs';
let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

// Fix buildNanoBananaPayload
content = content.replace(
  `  }): any {
  const cleanPrompt = (params.prompt || '').trim();`,
  `  }): Promise<any> {
  const cleanPrompt = (params.prompt || '').trim();`
);

// Oh wait, buildFalImagePayload might be broken too if it used the same pattern.
// No, I used a specific sed for it earlier.

fs.writeFileSync('server/falModelConfig.ts', content);
