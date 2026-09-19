import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Resolve the AES-256-GCM master secret used to encrypt provider credentials
 * at rest.
 *
 * SECURITY: This value must never be a hardcoded constant. A constant committed
 * to the repository means anyone who obtains the SQLite file can decrypt every
 * stored API key. Previously this module fell back to a well-known literal.
 *
 * Resolution order:
 *   1. FOUNDER_ACCESS_KEY (required in production)
 *   2. A per-installation random key persisted to `.neurona_master_key` (0600,
 *      gitignored) so development works without silently using a public key.
 */
function resolveMasterSecret(): string {
  const fromEnv = (process.env.FOUNDER_ACCESS_KEY || '').trim();
  if (fromEnv) return fromEnv;

  const isProduction = process.env.NODE_ENV === 'production';
  const keyFile = path.join(process.cwd(), '.neurona_master_key');

  try {
    if (fs.existsSync(keyFile)) {
      const existing = fs.readFileSync(keyFile, 'utf8').trim();
      if (existing) return existing;
    }

    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, generated, { mode: 0o600 });

    console.warn(
      '[SECURITY] FOUNDER_ACCESS_KEY is not set. A random per-installation ' +
      'encryption key was generated at .neurona_master_key (gitignored). ' +
      'Set FOUNDER_ACCESS_KEY explicitly for production deployments.'
    );
    return generated;
  } catch (err: any) {
    if (isProduction) {
      throw new Error(
        'FOUNDER_ACCESS_KEY wajib di-set di environment produksi. ' +
        'Kunci ini dipakai untuk enkripsi AES-256-GCM kredensial provider. ' +
        `(gagal membuat kunci lokal: ${err?.message || err})`
      );
    }
    // Development fallback that is still unique per process, never a constant.
    console.warn(
      '[SECURITY] Could not persist an encryption key. Using an ephemeral ' +
      'in-memory key; encrypted credentials will not survive a restart.'
    );
    return crypto.randomBytes(32).toString('hex');
  }
}

const MASTER_SECRET = resolveMasterSecret();
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
