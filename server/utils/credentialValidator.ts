/**
 * Universal Credential Format Validator & Isolation Guard
 * Prevents key mixups between Google AI, Fal.ai, OpenAI, BytePlus, etc.
 */

export interface CredentialValidationResult {
  valid: boolean;
  provider: 'gemini' | 'veo' | 'fal' | 'openai' | 'byteplus' | 'tryaudio';
  reason?: string;
  maskedKey: string;
  detectedFormat?: string;
}

export function cleanApiKeyString(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  let clean = key.trim();
  // Strip quotes if user pasted "AIza..." or 'AIza...'
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  // Strip surrounding brackets if pasted <KEY> or [KEY]
  if ((clean.startsWith('<') && clean.endsWith('>')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

export function maskApiKey(key?: string): string {
  const clean = cleanApiKeyString(key);
  if (!clean) return 'N/A';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function validateCredentialFormat(
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
      reason: `[${provider.toUpperCase()}] Kredensial kosong atau terlalu pendek dari sumber '${keySourceName}'`
    };
  }

  // Cross-provider strict validation
  if (provider === 'gemini') {
    if (cleanKey.startsWith('AQ.')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Veo (AQ.) tidak kompatibel dengan API Gemini." };
    }
    if (cleanKey.startsWith('fal_') || (cleanKey.includes(':') && !cleanKey.startsWith('AIza'))) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Fal.ai dimasukkan ke provider Gemini." };
    }
    if (cleanKey.startsWith('sk-')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat OpenAI dimasukkan ke provider Gemini." };
    }
  }

  if (provider === 'veo') {
    if (cleanKey.startsWith('fal_') || (cleanKey.includes(':') && !(cleanKey.startsWith('AIza') || cleanKey.startsWith('AQ.')))) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Fal.ai dimasukkan ke provider Veo." };
    }
    if (cleanKey.startsWith('sk-')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat OpenAI dimasukkan ke provider Veo." };
    }
  }

  if (provider === 'fal') {
    if (cleanKey.startsWith('AIza') || cleanKey.startsWith('AQ.')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Gemini dimasukkan ke provider Fal.ai." };
    }
    if (cleanKey.startsWith('sk-')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat OpenAI dimasukkan ke provider Fal.ai." };
    }
  }
  
  if (provider === 'openai') {
    if (cleanKey.startsWith('AIza') || cleanKey.startsWith('AQ.')) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Gemini dimasukkan ke provider OpenAI." };
    }
    if (cleanKey.startsWith('fal_') || (cleanKey.includes(':') && !cleanKey.startsWith('sk-'))) {
       return { valid: false, provider, maskedKey, reason: "Kunci berformat Fal.ai dimasukkan ke provider OpenAI." };
    }
  }

  return { valid: true, provider, maskedKey, detectedFormat: 'User Provided Key' };
}

export function logCredentialAudit(
  provider: string,
  keySourceName: string,
  key: string,
  action: string,
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR',
  errorDetail?: string
) {
  const masked = maskApiKey(key);
  const prefix = status === 'SUCCESS' ? '✅ [CREDENTIAL OK]' : status === 'BLOCKED' ? '🛑 [CREDENTIAL BLOCKED]' : '❌ [CREDENTIAL ERROR]';
  console.log(`${prefix} Provider: [${provider.toUpperCase()}] | Source: [${keySourceName}] | Key: [${masked}] | Action: [${action}] ${errorDetail ? `| Detail: ${errorDetail}` : ''}`);
}
