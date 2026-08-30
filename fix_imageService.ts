import fs from 'fs';
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const regex = /for \(let attempt = 0; attempt < maxAttempts; attempt\+\+\) \{[\s\S]*?const keySourceName = \(attempt === 0 && customKey\)/;

const replacement = `for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let apiKey = (attempt === 0 && customKey) ? customKey : keyRotator.getNextGeminiKey();
        
        // Loop up to 5 times to find a valid key, skipping bad formats
        let formatRetries = 0;
        while (apiKey && formatRetries < 5 && (apiKey.startsWith('AQ.') || apiKey.startsWith('fal_') || (apiKey.includes(':') && !apiKey.startsWith('AIza')))) {
          console.warn(\`[runGeminiBanana] Ignored Fal format key in Gemini request: \${apiKey.substring(0, 8)}...\`);
          keyRotator.removeKey('gemini', apiKey);
          apiKey = keyRotator.getNextGeminiKey();
          formatRetries++;
        }

        if (!apiKey || apiKey.startsWith('AQ.') || apiKey.startsWith('fal_')) {
          lastGeminiError = 'API Key Google Gemini resmi belum dikonfigurasi atau tidak valid di server. Mohon isi API Key Gemini yang benar (AIza...).';
          return null;
        }

        const keySourceName = (attempt === 0 && customKey)`;

content = content.replace(regex, replacement);

fs.writeFileSync('server/imageService.ts', content);
console.log("Updated imageService.ts");
