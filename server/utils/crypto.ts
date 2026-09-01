import crypto from 'crypto';

const MASTER_SECRET = process.env.FOUNDER_ACCESS_KEY || 'NEURONA_MASTER_ENCRYPTION_KEY_2026_PROD';
const KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns formatted string: ivHex:authTagHex:encryptedHex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // If legacy unencrypted string was saved, return as-is
      return encryptedPayload;
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    return '';
  }
}
