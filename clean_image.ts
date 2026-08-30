import fs from 'fs';

let content = fs.readFileSync('server/imageService.ts', 'utf8');

const regexModels = /let candidateModels = \['imagen-3.0-generate-002', 'imagen-3.0-generate-001', 'gemini-2.5-flash-image'\];[\s\S]*?uniqueBananaModels = Array\.from\(new Set\(candidateModels\)\);/m;

const replacementModels = `let candidateModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001', 'gemini-2.5-flash-image'];

      if (rawEngine === 'nano-asli-lite') {
        candidateModels = ['gemini-2.5-flash-image', 'imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
      } else if (rawEngine === 'nano-asli-pro' || rawEngine.includes('pro')) {
        candidateModels = ['imagen-3.0-generate-002', 'gemini-2.5-flash-image'];
      } else if (rawEngine === 'nano-asli-premium' || rawEngine === 'nano-asli-ultra' || rawEngine.includes('imagen')) {
        candidateModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
      }

      const uniqueBananaModels = Array.from(new Set(candidateModels));`;

content = content.replace(regexModels, replacementModels);

const regexError = /lastGeminiError = msg;[\s\S]*?keyAuthFailed = true;\n\s*\}/m;
const replacementError = `
            lastGeminiError = 'FULL ERROR RESPONSE: ' + msg + ' | (Pastikan Generative Language API aktif, tagihan siap, dan model image didukung region Anda)';

            const isAuthErr = msg.toLowerCase().includes('api_key_invalid') ||
                              msg.toLowerCase().includes('invalid api key') ||
                              msg.includes('401') || msg.includes('403') ||
                              msg.toLowerCase().includes('unauthenticated');
            if (isAuthErr) {
              keyAuthFailed = true;
            }
`;

content = content.replace(regexError, replacementError);

// Remove the old translation code
content = content.replace(/\/\/ Translate Imagen 3 404 error[\s\S]*?ke Fal\.ai\.';\n\s*\}/m, '');


fs.writeFileSync('server/imageService.ts', content);
