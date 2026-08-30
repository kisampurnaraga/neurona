import fs from 'fs';
let content = fs.readFileSync('server/utils/credentialValidator.ts', 'utf8');

const replacement = `export function validateCredentialFormat(
  provider: 'gemini' | 'veo' | 'fal' | 'openai' | 'byteplus' | 'tryaudio',
  key?: string,
  keySourceName: string = 'UNKNOWN_SOURCE'
): CredentialValidationResult {
  const cleanKey = cleanApiKeyString(key);
  const maskedKey = maskApiKey(cleanKey);

  if (!cleanKey || cleanKey.length < 3) {
    return {
      valid: false,
      provider,
      maskedKey: 'EMPTY',
      reason: \`[\${provider.toUpperCase()}] Kredensial kosong atau terlalu pendek dari sumber '\${keySourceName}'\`
    };
  }

  // Cross-provider strict validation
  if (provider === 'gemini' || provider === 'veo') {
    if (cleanKey.startsWith('fal_') || cleanKey.startsWith('AQ.') || (cleanKey.includes(':') && !cleanKey.startsWith('AIza'))) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Fal.ai dimasukkan ke provider Gemini/Veo." };
    }
    if (cleanKey.startsWith('sk-')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat OpenAI dimasukkan ke provider Gemini/Veo." };
    }
  }

  if (provider === 'fal') {
    if (cleanKey.startsWith('AIza')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Gemini dimasukkan ke provider Fal.ai." };
    }
    if (cleanKey.startsWith('sk-')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat OpenAI dimasukkan ke provider Fal.ai." };
    }
  }
  
  if (provider === 'openai') {
    if (cleanKey.startsWith('AIza')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Gemini dimasukkan ke provider OpenAI." };
    }
    if (cleanKey.startsWith('fal_') || cleanKey.startsWith('AQ.') || (cleanKey.includes(':') && !cleanKey.startsWith('sk-'))) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Fal.ai dimasukkan ke provider OpenAI." };
    }
  }

  return { valid: true, provider, maskedKey, detectedFormat: 'User Provided Key' };
}`;

// We want to replace the whole validateCredentialFormat function.
// It starts with 'export function validateCredentialFormat(' and ends with 'return { valid: true, provider, maskedKey, detectedFormat: 'User Provided Key' };\n}'
const regex = /export function validateCredentialFormat\([\s\S]*?return \{ valid: true, provider, maskedKey, detectedFormat: 'User Provided Key' \};\n\}/;
content = content.replace(regex, replacement);

fs.writeFileSync('server/utils/credentialValidator.ts', content);
console.log("Updated credentialValidator.ts");
